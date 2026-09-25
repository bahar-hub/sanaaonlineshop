import io
from decimal import Decimal

import jdatetime
import pymupdf
import base64

from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone
import shutil
from playwright.sync_api import sync_playwright
from .models import Order
from pathlib import Path
def get_font_base64():

    font_path = (
        Path(settings.BASE_DIR)
        / "static/fonts/Vazirmatn-Regular.ttf"
    )

    with open(font_path, "rb") as f:
        return base64.b64encode(
            f.read()
        ).decode()


    
def format_price(value):
    try:
        return f"{int(Decimal(value)):,}"
    except Exception:
        return "0"


def get_customer_name(user):
    name = f"{user.first_name} {user.last_name}".strip()
    return name or user.username or "—"


def build_order_number(order):
    return f"SN-{order.id:05d}"


def build_jalali_date(dt):
    local_dt = timezone.localtime(dt)
    return jdatetime.datetime.fromgregorian(datetime=local_dt).strftime("%Y/%m/%d")


def build_invoice_context(order, is_admin=False):
    items = []
    items_total = Decimal("0")
    base_items_total = Decimal("0")
    total_profit = Decimal("0")

    for item in order.items.all():
        currency_label_map = {
            "USD": "دلار",
            "EUR": "یورو",
            "TRY": "لیر",
            "GBP": "پوند",
            "AED": "درهم",
        }

        row = {
            "name": item.product_name or "—",
            "brand": item.brand or "—",
            "size": item.size or "—",
            "qty": item.quantity,
            "currency": item.currency,
            "currency_label": currency_label_map.get(item.currency, item.currency),
            "foreign_price": format_price(item.product_price),
            "foreign_price_raw": item.product_price,
            "unit_price_irr": format_price(item.unit_price_irr),
            "unit_price_irr_raw": item.unit_price_irr,
            "base_unit_price_irr": format_price(item.base_unit_price_irr),
            "base_unit_price_irr_raw": item.base_unit_price_irr,
            "exchange_rate": format_price(item.exchange_rate),
            "adjusted_exchange_rate": format_price(item.adjusted_exchange_rate),
            "markup_percent": item.markup_percent,
            "line_total_irr": format_price(item.line_total_irr),
            "line_total_irr_raw": item.line_total_irr,
        }
        items.append(row)

        items_total += item.line_total_irr
        base_items_total += item.base_unit_price_irr * item.quantity
        total_profit += item.markup_amount_irr

    context = {
        "site_name": getattr(settings, "SITE_NAME", "SANAA ONLINE SHOP"),
        "is_admin": is_admin,
        "order": order,
        "order_number": build_order_number(order),
        "order_date": build_jalali_date(order.registered_at),
        "customer_name": get_customer_name(order.user),
        "customer_phone": order.user.phone or "—",
        "customer_address": order.user.address or "—",
        "payment_status_label": order.get_payment_status_display(),
        "order_status_label": order.get_status_display(),
        "items": items,
        "items_total": format_price(items_total),
        "service_cost": format_price(order.service_cost),
        "shipping_cost": format_price(order.shipping_cost),
        "grand_total": format_price(order.total_irr),
        "base_items_total": format_price(base_items_total),
        "profit_total": format_price(total_profit),
    }

    if items:
        first = items[0]
        context["primary_rate"] = first["exchange_rate"]
        context["primary_adjusted_rate"] = first["adjusted_exchange_rate"]
        context["primary_markup_percent"] = first["markup_percent"]
        context["primary_currency_label"] = first["currency_label"]
    else:
        context["primary_rate"] = "0"
        context["primary_adjusted_rate"] = "0"
        context["primary_markup_percent"] = 0
        context["primary_currency_label"] = "—"

    return context


def render_invoice_html(order, is_admin=False):

    context = build_invoice_context(
        order,
        is_admin=is_admin
    )

    context["font_base64"] = get_font_base64()

    return render_to_string(
        "orders/invoice_pdf.html",
        context
    )

def build_invoice_pdf_bytes(order, is_admin=False):

    html_string = render_invoice_html(
        order,
        is_admin=is_admin
    )

    with sync_playwright() as p:

        browser = p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
            ],
        )

        page = browser.new_page(
            viewport={
                "width": 794,
                "height": 1123
            }
        )

        page.set_content(
            html_string,
            wait_until="load"
        )

        page.wait_for_timeout(3000)

        pdf = page.pdf(
            format="A4",
            print_background=True
        )

        browser.close()

    return pdf

def build_invoice_image_bytes(order, is_admin=False):
    pdf_bytes = build_invoice_pdf_bytes(order, is_admin=is_admin)

    pdf_doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    page = pdf_doc.load_page(0)
    pix = page.get_pixmap(matrix=pymupdf.Matrix(2, 2), alpha=False)
    png_bytes = pix.tobytes("png")
    pdf_doc.close()

    return png_bytes


def build_invoice_filenames(order, is_admin=False):
    suffix = "admin" if is_admin else "customer"
    number = build_order_number(order)
    return {
        "pdf": f"{number}-{suffix}-invoice.pdf",
        "image": f"{number}-{suffix}-invoice.png",
    }


def build_telegram_caption(order):
    customer_name = get_customer_name(order.user)

    lines = [
        f"🛒 سفارش جدید {build_order_number(order)}",
        "",
        f"👤 مشتری: {customer_name}",
        f"📱 شماره: {order.user.phone or '—'}",
        f"📍 آدرس: {order.user.address or '—'}",
        f"💳 وضعیت پرداخت: {order.get_payment_status_display()}",
        f"📦 وضعیت سفارش: {order.get_status_display()}",
        f"💰 مبلغ نهایی: {format_price(order.total_irr)} ریال",
        "",
        "اقلام سفارش:",
    ]

    for idx, item in enumerate(order.items.all(), start=1):
        lines.append(
            f"{idx}) {item.product_name} | تعداد: {item.quantity} | "
            f"قیمت نهایی: {format_price(item.line_total_irr)} ریال"
        )

    lines.append("")
    lines.append(f"🚚 باربری: {format_price(order.shipping_cost)} ریال")
    lines.append(f"🛠 خدمات: {format_price(order.service_cost)} ریال")

    return "\n".join(lines)