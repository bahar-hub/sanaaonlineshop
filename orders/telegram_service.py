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
    get_customer_name,
)


TELEGRAM_API_BASE = "https://api.telegram.org"
def send_shipping_cost_notification(order):
    """Notify customer when a positive shipping cost is set or changed."""
    connection = getattr(order.user, "telegram_connection", None)
    if not connection or not connection.is_active or order.shipping_cost <= 0:
        return False
    message = (
        f"هزینه باربری سفارش شما مشخص شد 📦\n\n"
        f"🧾 سفارش #{order.id}\n"
        f"🚚 هزینه باربری: {int(order.shipping_cost):,} ریال\n\n"
        "شماره کارت: 6219861909505736\n"
        "شماره شبا: IR940560611828005120289101\n"
        "سیده ثنا مدنی فرد\n\n"
        "برای مشاهده و پیگیری سفارش:\n"
        "sanaaonlineshop.com"
    )
    send_telegram_text(connection.telegram_id, message)
    return True


def send_customer_event_notification(order, event):
    """Send exactly the requested text for each customer-facing order event."""
    connection = getattr(order.user, "telegram_connection", None)
    if not connection or not connection.is_active:
        return False
    number = f"🧾 سفارش #{order.id}"
    site = "sanaaonlineshop.com"
    messages = {
        "paid": (
            "ثنا جان\n\n"
            "پرداخت سفارش شما با موفقیت انجام شد🛍️✅\n\n"
            f"برای پیگیری سفارش:\n{site}\n\n"
            "ممنون که Sanaa رو انتخاب کردید ✨"
        ),
        "partial": (
            "پرداخت سفارش شما کامل نشده است 💳\n"
            "لطفا جهت تکمیل سفارش خود پرداختی خود را کامل کنید❤️🙏🏽\n\n"
            f"{number}\n\n"
            f"برای مشاهده جزئیات و تکمیل پرداخت:\n{site}"
        ),
        "preparing": (
            "سفارش شما وارد مرحله آماده‌سازی شد ✨\n\n"
            f"{number}\n\n"
            "آخرین وضعیت سفارشتون از طریق سایت و ربات تلگرام اطلاع می‌ دهیم\n\n"
            f"پیگیری سفارش:\n{site}\n\n"
            "ممنون از همراهی‌تون 🤍"
        ),
        "shipped_to_iran": (
            "خبر خوب! سفارش شما به مقصد ایران ارسال شد 📦✈️\n\n"
            f"{number}\n\n"
            f"برای پیگیری آخرین وضعیت سفارش:\n{site}"
        ),
        "shipped_to_customer": (
            "سفارش شما رسید 🤩📦\n\n"
            f"{number}\n\n"
            "لطفا بعد از واریز باربری اعلام شده\n\n"
            "برای هماهنگی ودریافت سفارش، از طریق تلگرام به آیدی زیر پیام بدید:\n"
            "@sanamadani\n"
            "ممنون از اعتمادتون✨"
        ),
        "delivered": (
            "سفارش شما با موفقیت تحویل داده شد 📦✨\n\n"
            "امیدواریم از خریدتون لذت ببرید و دوستش داشته باشید! 🥰\n\n"
            "منتظرتون برای خریدهای بعدی هستیم 💚\n\n"
            f"Sanaa Online Shop 🌱\n{site}"
        ),
        "cancelled": (
            "سفارش شما لغو شد.\n\n"
            f"{number}\n\n"
            f"برای مشاهده جزئیات:\n{site}"
        ),
    }
    message = messages.get(event)
    if not message:
        return False
    send_telegram_text(connection.telegram_id, message)
    return True


def send_admin_order_change_notification(order_id, changes):
    """One concise text for all changed fields, only to the configured admin."""
    from html import escape

    admin_chat_id = getattr(settings, "TELEGRAM_CHAT_ID", None)
    if not settings.TELEGRAM_BOT_TOKEN or not admin_chat_id or not changes:
        return False

    lines = [f"🧾 سفارش #{order_id}"]
    lines.extend(f"• {escape(str(change))}" for change in changes)
    try:
        response = send_telegram_text(admin_chat_id, "\n".join(lines))
        response.raise_for_status()
        return response.json().get("ok", False)
    except (requests.RequestException, ValueError) as exc:
        logger.warning("Admin notification failed for order %s: %s", order_id, exc)
        return False


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
اروپا: 20€ | کانادا: 55 CAD | آمریکا: 46 USD | ترکیه: 650 تومان | دبی: 35 درهم

📍 از آنجایی که باربری دلاری و با نرخ روز محاسبه می‌شود، پیشنهاد می‌کنیم دلار باربری را از قبل تهیه کنید تا در صورت افزایش نرخ، متضرر نشوید.

📦 زمان روتین ارسال به ایران: 
۱ تا ۴ هفته؛ ممکن است با توجه به شرایط کشور، بیشتر شود.

شماره کارت: 6219861909505736 
شماره شبا:IR940560611828005120289101
سیده ثنا مدنی فرد 


از طریق وبسایت سفارشتون رو پیگیری کنید👇🏼
<a href="https://sanaaonlineshop.com/">sanaaonlineshop.com</a>
    """


    send_telegram_text(
        chat_id,
        message
    )




    return True


def build_order_update_message(order, changes):
    """متن پیام «سفارش شما ویرایش شد» با فقط بخش‌های تغییرکرده."""
    from html import escape

    message = f"""
سلام {escape(order.user.first_name or "")} عزیز 👋

سفارش شما در Sanaa Online Shop ویرایش و به‌روزرسانی شد ✏️


🧾 شماره سفارش #{order.id}:


"""

    if changes:
        message += "\n\n".join(changes)

    message += """

از طریق وبسایت سفارشتون رو پیگیری کنید👇🏼
<a href="https://sanaaonlineshop.com/">sanaaonlineshop.com</a>

با تشکر از اعتماد شما 🌱
"""

    return message.strip()


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


    send_telegram_text(
        connection.telegram_id,
        build_order_update_message(order, changes)
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
    """Disabled to avoid extra messages after invoice issuance."""
    return False


logger = logging.getLogger(__name__)


def _post_telegram_file(chat_id, method, field, filename, file_bytes,
                        mime, caption=None, parse_mode=None):
    """
    Sends one file to one chat. Returns (ok, error_description).
    Never raises, so one failed chat can't break the order request.
    """
    data = {"chat_id": chat_id}
    if caption:
        data["caption"] = caption
        if parse_mode:
            data["parse_mode"] = parse_mode

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

    # --- Admin: send only ONE invoice image when the order is created. ---
    if admin_chat_id and str(admin_chat_id) != str(customer_chat_id):
        ok, error = _post_telegram_file(
            admin_chat_id, "sendPhoto", "photo", filenames["image"],
            image_bytes, "image/png", f"🧾 سفارش #{order.id} - ثبت شد",
        )
        if not ok:
            logger.error("Admin invoice image %s failed: %s", order_id, error)


def send_updated_invoice(order_id, changes=None):
    """Disabled: invoices are sent only when an order is first issued."""
    return None
