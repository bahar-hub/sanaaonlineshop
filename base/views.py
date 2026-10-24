from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout, get_user_model
from django.conf import settings
from django.http import JsonResponse
from django.urls import reverse

from customer.iran_locations import validate_location

User = get_user_model()


def index_view(request):

    if request.user.is_authenticated:

        if request.user.is_superuser:
            return redirect("panel:orders")

        return redirect("customer:profile")

    return render(request, "base/index.html")


def login_view(request):

    if request.method == "POST":

        username = request.POST.get("username", "").strip()
        password = request.POST.get("password", "")

        user = authenticate(
            request,
            username=username,
            password=password,
        )

        is_ajax = (
            request.headers.get("X-Requested-With")
            == "XMLHttpRequest"
        )

        if user is not None:

            login(request, user)

            if user.is_superuser:
                redirect_url = reverse("panel:orders")
            else:
                redirect_url = reverse("customer:profile")

            if is_ajax:
                return JsonResponse({
                    "success": True,
                    "redirect_url": redirect_url,
                })

            return redirect(redirect_url)

        if is_ajax:
            return JsonResponse(
                {
                    "success": False,
                    "message": "نام کاربری یا رمز عبور اشتباه است."
                },
                status=400,
            )

        return render(
            request,
            "base/index.html",
            {
                "login_error": "نام کاربری یا رمز عبور اشتباه است."
            },
        )

    return redirect("base:index")

def signup_view(request):

    if request.method == "POST":

        first_name = request.POST.get("firstName", "").strip()
        last_name = request.POST.get("lastName", "").strip()
        phone = request.POST.get("phone", "").strip()
        province = request.POST.get("province", "").strip()
        city = request.POST.get("city", "").strip()
        address = request.POST.get("address", "").strip()
        username = request.POST.get("username", "").strip()
        password = request.POST.get("password", "")
        password_confirm = request.POST.get("passwordConfirm", "")

        # Only non-sensitive fields are returned when validation fails.
        signup_data = {
            "firstName": first_name,
            "lastName": last_name,
            "phone": phone,
            "province": province,
            "city": city,
            "address": address,
            "username": username,
        }

        error = validate_location(province, city)
        if not error and password != password_confirm:
            error = "رمز عبور و تکرار رمز عبور یکسان نیستند."
        if not error and User.objects.filter(username=username).exists():
            error = "این نام کاربری قبلاً استفاده شده است."
        if not error and User.objects.filter(phone=phone).exists():
            error = "این شماره تلفن قبلاً ثبت شده است."

        if error:
            return render(request, "base/index.html", {
                "signup_error": error,
                "signup_data": signup_data,
            })

        # ساخت کاربر
        user = User.objects.create_user(
            username=username,
            password=password,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            province=province,
            city=city,
            address=address,
        )

        # ورود خودکار بعد از ثبت نام
        login(request, user)
    
        telegram_url = (
            f"https://t.me/{settings.TELEGRAM_BOT_USERNAME}"
            f"?start={user.id}"
        )


        request.session["telegram_connect_url"] = telegram_url
        # مشتری بعد از ثبت نام → پروفایل
        return redirect("customer:profile")

    return redirect("base:index")


def logout_view(request):

    logout(request)

    return redirect("base:index")