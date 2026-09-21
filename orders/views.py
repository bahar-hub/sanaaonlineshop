from decimal import Decimal, InvalidOperation


from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import user_passes_test
from django.http import JsonResponse
from django.shortcuts import (
    get_object_or_404,
    render,
    redirect,
)
from django.utils import timezone
from django.views.decorators.http import require_POST

from orders.models import (
    Order,
    OrderItem,
    Invoice,
)

from orders.services import (
    create_order,
    update_order,
    delete_order as delete_order_service,
)

import json

from django.http import JsonResponse
from django.utils import timezone

from customer.models import TelegramConnection, User

from .telegram_service import send_telegram_text
from django.views.decorators.csrf import csrf_exempt


@csrf_exempt
def telegram_webhook(request):
    print("WEBHOOK VIEW LOADED")
    print(request.method)
    print(request.body)

    if request.method != "POST":
        return JsonResponse({
            "ok": True
        })


    if not request.body:
        return JsonResponse({
            "ok": True
        })


    data = json.loads(request.body)

    message = data.get("message")

    if not message:
        return JsonResponse({"ok": True})


    text = message.get("text", "")

    chat_id = message["chat"]["id"]


    if text.startswith("/start"):

        parts = text.split()


        if len(parts) > 1:

            user_id = parts[1]


            try:

                user = User.objects.get(
                    id=user_id
                )


                TelegramConnection.objects.update_or_create(
                    user=user,
                    defaults={
                        "telegram_id": str(chat_id),
                        "username": message["from"].get(
                            "username"
                        ),
                        "first_name": message["from"].get(
                            "first_name"
                        ),
                        "is_active": True,
                        "connected_at": timezone.now(),
                        "last_error": None,
                    }
                )


                send_telegram_text(
                    chat_id,
                    f"""
                    سلام {user.first_name} عزیز 👋

                    به سانا آنلاین شاپ خوش آمدید 🌱

                    اتصال تلگرام شما با موفقیت انجام شد ✅

                    از این به بعد:
                    📦 وضعیت سفارش‌ها
                    🧾 فاکتورها
                    🔔 اطلاعیه‌ها

                    از طریق همین ربات ارسال می‌شود.
                    """
                    )


            except User.DoesNotExist:
                pass

     
    return JsonResponse({"ok": True})