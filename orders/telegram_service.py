import io
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


        message = f"""
    سلام {order.user.first_name} عزیز 👋

    وضعیت سفارش شما در سانا آنلاین شاپ تغییر کرد.

    🧾 شماره سفارش:
    #{order.id}

    📦 وضعیت جدید:
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
            "caption": "test invoice",
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
سلام {order.user.first_name} عزیز 👋

سفارش شما با موفقیت ثبت شد ✅


🧾 شماره سفارش:
#{order.id}


📦 محصولات:
"""

    for item in order.items.all():

        message += (
            f"\n- {item.product_name}"
            f" × {item.quantity}"
        )


    message += f"""

💰 مبلغ نهایی:
{order.final_price:,} ریال


📌 وضعیت:
{order.get_status_display()}


سانا آنلاین شاپ 🌱
"""


    send_telegram_text(
        chat_id,
        message
    )


    pdf_bytes = build_invoice_pdf_bytes(
        order,
        is_admin=False
    )


    send_telegram_document(
        chat_id,
        pdf_bytes,
        f"invoice-{order.id}.pdf"
    )


    return True