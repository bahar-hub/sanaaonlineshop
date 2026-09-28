import io
import logging
import requests

from django.conf import settings
from django.utils import timezone

from .models import Order
from .invoice_utils import (
    build_invoice_pdf_bytes,
    build_invoice_image_bytes,
    build_invoice_filenames,
    build_telegram_caption,
    build_order_number,
)


TELEGRAM_API_BASE = "https://api.telegram.org"
def send_shipping_cost_notification(order):
    """
    پیام هزینه باربری؛ فقط وقتی سفارش به مرحله «ارسال به ایران»
    می‌رسد و هزینه باربری صفر نیست ارسال می‌شود.
    """

    connection = getattr(
        order.user,
        "telegram_connection",
        None
    )

    if not connection or not connection.is_active:
        return False

    items_text = "\n".join(
        f"▫️ {item.product_name} × {item.quantity}"
        for item in order.items.all()
    )

    message = f"""
سلام، وقت بخیر ✨

سفارشتون رسیددد 😍📦✨

هزینه باربری شماره سفارش #{order.id}:

📦 مشخصات سفارش
{items_text}

💰 هزینه باربری: {int(order.shipping_cost or 0):,} ریال

بعد از پرداخت باربری، برای ارسال سفارشتون با ما هماهنگ کنید 🫶🏽
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
اروپا: ۱۵€ | کانادا: ۴۵–۵۰ CAD | آمریکا: ۳۸ USD | ترکیه:۶۵۰-۷۰۰ تومان | دبی: 35 درهم

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


    # فقط بخش‌هایی که تغییر کرده‌اند گزارش می‌شوند.
    message = f"""
سلام {order.user.first_name} عزیز 👋

سفارش شما در Sanaa Online Shop به‌روزرسانی شد ✏️

🧾 شماره سفارش:
#{order.id}

"""


    message += "\n\n".join(changes)


    message += """

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


logger = logging.getLogger(__name__)


def _post_telegram_file(chat_id, method, field, filename, file_bytes,
                        mime, caption=None):
    """
    Sends one file to one chat. Returns (ok, error_description).
    Never raises, so one failed chat can't break the order request.
    """
    data = {"chat_id": chat_id}
    if caption:
        data["caption"] = caption

    try:
        response = requests.post(
            _telegram_url(method),
            data=data,
            files={field: (filename, io.BytesIO(file_bytes), mime)},
            timeout=60,
        )
    except requests.RequestException as exc:
        return False, f"network: {exc}"

    try:
        result = response.json()
    except ValueError:
        result = {}

    if response.ok and result.get("ok"):
        return True, None

    return False, result.get("description") or f"HTTP {response.status_code}"


def _mark_connection_error(connection, error):
    """Blocked / chat not found -> remember it so the admin panel shows it."""
    if not connection:
        return

    connection.last_error = error
    fields = ["last_error"]

    lowered = (error or "").lower()
    if "blocked" in lowered or "chat not found" in lowered or "deactivated" in lowered:
        connection.is_active = False
        connection.disconnected_at = timezone.now()
        fields += ["is_active", "disconnected_at"]

    connection.save(update_fields=fields)


def _send_invoice_files(chat_id, order, pdf_bytes, image_bytes, filenames, caption):
    ok_photo, err_photo = _post_telegram_file(
        chat_id, "sendPhoto", "photo",
        filenames["image"], image_bytes, "image/png", caption,
    )
    ok_pdf, err_pdf = _post_telegram_file(
        chat_id, "sendDocument", "document",
        filenames["pdf"], pdf_bytes, "application/pdf",
        f"PDF فاکتور {filenames['pdf']}",
    )
    return (ok_photo or ok_pdf), (err_photo or err_pdf)


def send_order_invoice_bundle(order_id):
    """
    Called after a new order is saved.

    1) Sends the invoice (image + PDF) to the customer's OWN Telegram
       account, using the chat id saved when they pressed Start in the bot.
    2) Then sends the payment-instructions text to the same customer.
    3) Optionally sends a copy to the admin chat (TELEGRAM_CHAT_ID).

    The invoice is rendered only once and reused for every recipient.
    """
    if not settings.TELEGRAM_BOT_TOKEN:
        logger.warning("Invoice not sent: TELEGRAM_BOT_TOKEN is empty.")
        return

    order = (
        Order.objects
        .select_related("user")
        .prefetch_related("items")
        .get(id=order_id)
    )

    connection = getattr(order.user, "telegram_connection", None)
    customer_chat_id = (
        connection.telegram_id
        if connection and connection.is_active
        else None
    )
    admin_chat_id = settings.TELEGRAM_CHAT_ID or None

    if not customer_chat_id and not admin_chat_id:
        logger.warning(
            "Invoice for order %s not sent: customer has no active "
            "Telegram connection.", order_id,
        )
        return

    pdf_bytes = build_invoice_pdf_bytes(order, is_admin=False)
    image_bytes = build_invoice_image_bytes(
        order, is_admin=False, pdf_bytes=pdf_bytes
    )
    filenames = build_invoice_filenames(order, is_admin=False)

    # --- customer ---
    if customer_chat_id:
        caption = (
            f"🧾 فاکتور سفارش {build_order_number(order)}\n"
            f"{order.user.first_name} عزیز، ممنون از خریدتون 🤍"
        )
        ok, error = _send_invoice_files(
            customer_chat_id, order, pdf_bytes, image_bytes, filenames, caption
        )

        if ok:
            connection.last_error = None
            connection.save(update_fields=["last_error"])
            send_order_invoice_to_customer(order)
        else:
            logger.error(
                "Invoice for order %s failed for customer %s: %s",
                order_id, order.user_id, error,
            )
            _mark_connection_error(connection, error)

    # --- admin copy ---
    if admin_chat_id and str(admin_chat_id) != str(customer_chat_id):
        ok, error = _send_invoice_files(
            admin_chat_id, order, pdf_bytes, image_bytes, filenames,
            build_telegram_caption(order),
        )
        if not ok:
            logger.error(
                "Admin copy of invoice %s failed: %s", order_id, error
            )
