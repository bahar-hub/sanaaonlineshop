
from django.conf import settings
from django.shortcuts import render, get_object_or_404
from django.contrib import messages
from django.contrib.auth.decorators import user_passes_test
from django.contrib.auth import update_session_auth_hash
from django.http import JsonResponse
from orders.models import Order
import jdatetime

from customer.models import TelegramConnection
import json

from django.http import JsonResponse
from django.views.decorators.http import require_POST

from customer.models import User, PasswordResetOTP
from customer.utils import send_password_reset_otp
import hashlib
from django.contrib.auth import login
from django.utils import timezone


def is_customer(user):
    return user.is_authenticated and not user.is_superuser


@user_passes_test(is_customer, login_url="base:index")
def profile_view(request):

    if request.method == "POST":

        action = request.POST.get("action")

        # =========================
        # Update Profile
        # =========================

        if action == "update_profile":

            phone = request.POST.get("phone", "").strip()
            address = request.POST.get("address", "").strip()

            request.user.phone = phone
            request.user.address = address

            request.user.save()

            messages.success(
                request,
                "اطلاعات با موفقیت ذخیره شد.",
                extra_tags="profile"
            )

        # =========================
        # Change Password
        # =========================

        elif action == "change_password":

            old_password = request.POST.get("oldPassword", "")
            new_password = request.POST.get("newPassword", "")

            if not request.user.check_password(old_password):

                messages.error(
                    request,
                    "رمز عبور فعلی صحیح نیست.",
                    extra_tags="password"
                )

            elif len(new_password) < 6:

                messages.error(
                    request,
                    "رمز عبور جدید باید حداقل ۶ کاراکتر باشد.",
                    extra_tags="password"
                )

            elif old_password == new_password:

                messages.error(
                    request,
                    "رمز عبور جدید باید با رمز فعلی متفاوت باشد.",
                    extra_tags="password"
                )

            else:

                request.user.set_password(new_password)
                request.user.save()

                update_session_auth_hash(
                    request,
                    request.user
                )

                messages.success(
                    request,
                    "رمز عبور با موفقیت تغییر کرد.",
                    extra_tags="password"
                )

    # این لینک فقط یک بار (بلافاصله بعد از ثبت‌نام) به‌صورت پاپ‌آپ
    # نمایش داده می‌شود.
    telegram_signup_popup_url = request.session.pop(
        "telegram_connect_url",
        None
    )

    telegram_connection = TelegramConnection.objects.filter(
        user=request.user
    ).first()

    # لینک اتصال/اتصال‌مجدد که همیشه در پروفایل کاربر در دسترس است،
    # حتی اگر پاپ‌آپ ثبت‌نام را بسته باشد یا اتصال قبلی قطع شده باشد.
    telegram_connect_url = (
        f"https://t.me/{settings.TELEGRAM_BOT_USERNAME}"
        f"?start={request.user.id}"
    )

    context = {
        "customer": request.user,
        "telegram_connect_url": telegram_connect_url,
        "telegram_signup_popup_url": telegram_signup_popup_url,
        "telegram_connection": telegram_connection,
    }


    return render(
        request,
        "customer/customer.html",
        context
    )


@user_passes_test(is_customer, login_url="base:index")
def customer_orders_api(request):

    orders = (
        Order.objects
        .filter(user=request.user)
        .prefetch_related("items")
        .order_by("-registered_at")
    )

    data = []

    for order in orders:
        items = []

        for item in order.items.all():
            items.append({
                "name": item.product_name,
                "qty": item.quantity,
                "currency": item.currency,
                # Customer receives only final sale values, not markup details.
                "unitPriceIRR": float(item.unit_price_irr),
                "lineTotalIRR": float(item.line_total_irr),
                "image": item.photo.url if item.photo else "",
            })

        data.append({
            "id": order.id,
            "date": jdatetime.datetime.fromgregorian(
                datetime=order.registered_at
            ).strftime("%Y/%m/%d"),
            "status": order.status,
            "items": items,
            "shipping": float(order.shipping_cost),
            "services": float(order.service_cost),
            "totalUSD": float(order.total_usd),
            "totalIRR": float(order.total_irr),
        })

    return JsonResponse(data, safe=False)


@user_passes_test(is_customer, login_url="base:index")
def customer_order_detail_api(request, order_id):

    order = get_object_or_404(
        Order.objects.prefetch_related("items"),
        id=order_id,
        user=request.user,
    )

    data = {
        "id": order.id,
        "date": jdatetime.datetime.fromgregorian(
            datetime=order.registered_at
        ).strftime("%Y/%m/%d"),
        "status": order.status,
        "shipping": float(order.shipping_cost),
        "services": float(order.service_cost),
        "totalUSD": float(order.total_usd),
        "totalIRR": float(order.total_irr),
        "items": [
            {
                "name": item.product_name,
                "qty": item.quantity,
                "currency": item.currency,
                "unitPriceIRR": float(item.unit_price_irr),
                "lineTotalIRR": float(item.line_total_irr),
                "image": item.photo.url if item.photo else "",
            }
            for item in order.items.all()
        ],
    }

    return JsonResponse(data)


@require_POST
def password_reset_request(request):
    data = json.loads(request.body)

    phone = data.get("phone")

    if not phone:
        return JsonResponse({
            "success": False,
            "message": "Phone is required"
        }, status=400)


    user = User.objects.filter(
        phone=phone
    ).first()


    if not user:
        return JsonResponse({
            "success": False,
            "message": "User not found"
        }, status=404)


    result = send_password_reset_otp(user)


    if result:
        return JsonResponse({
            "success": True,
            "message": "OTP sent"
        })


    return JsonResponse({
        "success": False,
        "message": "OTP sending failed"
    }, status=500)


@require_POST
def password_reset_verify(request):

    data = json.loads(request.body)

    phone = data.get("phone")
    code = data.get("code")


    if not phone or not code:
        return JsonResponse({
            "success": False,
            "message": "اطلاعات ناقص است."
        }, status=400)


    user = User.objects.filter(
        phone=phone
    ).first()


    if not user:
        return JsonResponse({
            "success": False,
            "message": "کاربر یافت نشد."
        }, status=404)


    otp = PasswordResetOTP.objects.filter(
        user=user,
        is_used=False
    ).order_by("-created_at").first()


    if not otp:
        return JsonResponse({
            "success": False,
            "message": "کدی برای تایید وجود ندارد."
        }, status=400)


    if otp.expires_at < timezone.now():

        return JsonResponse({
            "success": False,
            "message": "کد منقضی شده است."
        }, status=400)


    code_hash = hashlib.sha256(
        code.encode()
    ).hexdigest()

    # print("ENTERED CODE:", code)
    # print("ENTERED HASH:", code_hash)
    # print("DB HASH:", otp.code_hash)


    if code_hash != otp.code_hash:

        return JsonResponse({
            "success": False,
            "message": "کد وارد شده صحیح نیست."
        }, status=400)


    otp.is_used = True
    otp.save()


    login(request, user)


    return JsonResponse({
        "success": True,
        "message": "ورود موفق بود."
})