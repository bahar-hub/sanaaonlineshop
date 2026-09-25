import io
from django.utils import timezone
import requests

from django.conf import settings

from .models import Order
from .invoice_utils import (
    build_invoice_pdf_bytes,
    build_invoice_image_bytes,
    build_invoice_filenames,
    build_telegram_caption,
)


TELEGRAM_API_BASE = "https://api.telegram.org"
def send_order_status_update(order):

    connection = getattr(
        order.user,
        "telegram_connection",
        None
    )

    if not connection:
        return False

    if not connection.is_active:
        return False


    # فقط برای ارسال شده
    if order.status == Order.Status.SHIPPED:

        message = f"""
سلام، وقت بخیر ✨

سفارشتون رسیددد 😍📦✨

هزینه باربری شماره سفارش #{order.id}:

📦 مشخصات سفارش

💰 هزینه باربری: {int(order.shipping_cost or 0):,} تومان

بعد از پرداخت باربری، برای ارسال سفارشتون با ما هماهنگ کنید 🫶🏽
"""


    # بقیه وضعیت‌ها
    else:

        message = f"""
سلام {order.user.first_name} عزیز 👋

سفارش شما در Sanaa Online Shop ویرایش و به‌روزرسانی شد ✏️


🧾 شماره سفارش:
#{order.id}


📦 وضعیت سفارش:
{order.get_status_display()}


با تشکر از اعتماد شما 🌱
"""


    send_telegram_text(
        connection.telegram_id,
        message
    )

    return True


def send_telegram_text(chat_id, text):

    url = (
        f"https://api.telegram.org/"
        f"bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    )

    response = requests.post(
        url,
        data={
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML"
        }
    )

    return response

def _telegram_url(method: str):
    return f"{TELEGRAM_API_BASE}/bot{settings.TELEGRAM_BOT_TOKEN}/{method}"


def send_order_bundle_to_telegram(order_id, chat_id=None):
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
        return

    order = (
        Order.objects
        .select_related("user")
        .prefetch_related("items")
        .get(id=order_id)
    )

    target_chat_id = chat_id or settings.TELEGRAM_CHAT_ID

    caption = build_telegram_caption(order)
    pdf_bytes = build_invoice_pdf_bytes(order, is_admin=False)
    image_bytes = build_invoice_image_bytes(order, is_admin=False)
    filenames = build_invoice_filenames(order, is_admin=False)

    # 1) ارسال عکس فاکتور + توضیحات
    image_buffer = io.BytesIO(image_bytes)
    image_buffer.name = filenames["image"]

    photo_response = requests.post(
        _telegram_url("sendPhoto"),
        data={
            "chat_id": target_chat_id,
        },
        files={
            "photo": (
                filenames["image"],
                image_buffer,
                "image/png"
            )
        },
    )


    # 2) ارسال PDF فاکتور
    pdf_buffer = io.BytesIO(pdf_bytes)
    pdf_buffer.name = filenames["pdf"]

    doc_response = requests.post(
        _telegram_url("sendDocument"),
        data={
            "chat_id": target_chat_id,
            "caption": f"PDF فاکتور {filenames['pdf']}",
        },
        files={
            "document": (filenames["pdf"], pdf_buffer, "application/pdf")
        },
        timeout=60,
    )
    doc_response.raise_for_status()


def send_telegram_document(
    chat_id,
    file_bytes,
    filename
):

    url = (
        f"https://api.telegram.org/"
        f"bot{settings.TELEGRAM_BOT_TOKEN}"
        "/sendDocument"
    )


    requests.post(
        url,
        data={
            "chat_id": chat_id,
        },
        files={
            "document": (
                filename,
                file_bytes,
                "application/pdf"
            )
        }
    )
    
def send_order_invoice_to_customer(order):

    connection = getattr(
        order.user,
        "telegram_connection",
        None
    )

    if not connection:
        return False

    if not connection.is_active:
        return False


    chat_id = connection.telegram_id


    message = f"""

Sanaa Online Shop

🤍 لطفاً قبل از پرداخت، سایز،رنگ 
موجودی ،قیمت روز را چک کنید.

⏱️ اعتبار این فاکتور: ۳۰ دقیقه

🚚 هزینه باربری هر کیلو :
اروپا: ۱۵€ | کانادا: ۴۵–۵۰ CAD | آمریکا: ۳۸ USD | ترکیه:۶۵۰-۷۰۰ تومان 

📍 از آنجایی که باربری دلاری و با نرخ روز محاسبه می‌شود، پیشنهاد می‌کنیم دلار باربری را از قبل تهیه کنید تا در صورت افزایش نرخ، متضرر نشوید.

📦 زمان روتین ارسال به ایران: 
۱ تا ۴ هفته؛ ممکن است با توجه به شرایط کشور، بیشتر شود.

شماره کارت: 6219861909505736 
شماره شبا:
IR940560611828005120289101

سیده ثنا مدنی فرد 
    """


    send_telegram_text(
        chat_id,
        message
    )




    return True


def send_order_update_notification(order, changes):

    connection = getattr(
        order.user,
        "telegram_connection",
        None
    )

    if not connection:
        return False

    if not connection.is_active:
        return False


    message = f"""
سلام {order.user.first_name} عزیز 👋

سفارش شما در SANAA ONLINE SHOP به‌روزرسانی شد ✨

🧾 شماره سفارش:
#{order.id}

"""


    message += "\n\n".join(changes)


    message += """

سانا آنلاین شاپ 🌱
"""


    send_telegram_text(
        connection.telegram_id,
        message
    )

    return True


def check_telegram_connection(connection):
    """
    Actively verifies with the Telegram Bot API whether the bot can
    still reach this customer (chat exists and hasn't been blocked).

    Updates the TelegramConnection record (is_active / last_error /
    disconnected_at) to reflect what Telegram reports, and returns a
    small dict describing the outcome so the admin panel can show it.
    """

    if not connection or not connection.telegram_id:
        return {
            "connected": False,
            "reason": "not_linked",
            "message": "این مشتری هنوز حساب تلگرام خود را متصل نکرده است.",
        }

    if not settings.TELEGRAM_BOT_TOKEN:
        return {
            "connected": False,
            "reason": "not_configured",
            "message": "توکن ربات تلگرام در تنظیمات سرور ثبت نشده است.",
        }

    try:
        response = requests.get(
            _telegram_url("getChat"),
            params={"chat_id": connection.telegram_id},
            timeout=10,
        )
        result = response.json()

    except (requests.RequestException, ValueError) as exc:
        connection.last_error = str(exc)
        connection.save(update_fields=["last_error"])

        return {
            "connected": False,
            "reason": "network_error",
            "message": "ارتباط با سرور تلگرام برقرار نشد. بعداً دوباره تلاش کنید.",
        }

    if result.get("ok"):
        connection.is_active = True
        connection.last_error = None
        connection.save(update_fields=["is_active", "last_error"])

        return {
            "connected": True,
            "reason": "ok",
            "message": "اتصال مشتری به ربات تلگرام برقرار است.",
        }

    error_description = result.get("description", "خطای نامشخص از تلگرام")

    connection.is_active = False
    connection.last_error = error_description
    connection.disconnected_at = timezone.now()
    connection.save(
        update_fields=["is_active", "last_error", "disconnected_at"]
    )

    return {
        "connected": False,
        "reason": "telegram_error",
        "message": "مشتری ربات را بلاک کرده یا اتصال قطع شده است.",
        "detail": error_description,
    }



def send_new_products_notification(order, new_items):

    connection = getattr(
        order.user,
        "telegram_connection",
        None
    )

    if not connection:
        return False

    if not connection.is_active:
        return False


    message = f"""
سلام {order.user.first_name} عزیز 👋

محصول جدیدی به سفارش شما در Sanaa Online Shop اضافه شد ✨


🧾 شماره سفارش:
#{order.id}


📦 مشخصات محصول:
"""


    for item in new_items:

        message += f"""

🔹 {item.product_name}

🏷 برند:
{item.brand or "-"}

📏 سایز:
{item.size or "-"}

🔢 تعداد:
{item.quantity}

💰 قیمت:
{int(item.line_total_irr):,} ریال

"""


    message += f"""

💰 مبلغ نهایی جدید سفارش:
{int(order.total_irr):,} ریال


فاکتور سفارش شما به‌روزرسانی شد 🌱
"""


    send_telegram_text(
        connection.telegram_id,
        message
    )


    # ارسال فاکتور جدید فقط در صورت اضافه شدن محصول
    send_order_invoice_to_customer(order)


    return True