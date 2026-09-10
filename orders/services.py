from decimal import Decimal

from django.core.files.storage import default_storage
from django.db import transaction

from .models import Order, OrderItem, Invoice


def to_decimal(value, default="0"):
    try:
        return Decimal(str(value))
    except (TypeError, ValueError, ArithmeticError):
        return Decimal(default)


def _recalculate_order(order):
    items_total_irr = Decimal("0")
    profit_total_irr = Decimal("0")

    for item in order.items.all():
        line_total_irr = (
            item.product_price
            * item.quantity
            * item.exchange_rate
        )

        line_profit_irr = (
            item.product_price
            - item.admin_cost
        ) * item.quantity * item.exchange_rate

        items_total_irr += line_total_irr
        profit_total_irr += line_profit_irr

    total_irr = (
        items_total_irr
        + order.shipping_cost
        + order.service_cost
    )

    if order.usd_rate > 0:
        total_usd = (
            total_irr / order.usd_rate
        ).quantize(
            Decimal("0.01")
        )

        profit_usd = (
            profit_total_irr / order.usd_rate
        ).quantize(
            Decimal("0.01")
        )
    else:
        total_usd = Decimal("0")
        profit_usd = Decimal("0")

    order.total_irr = total_irr
    order.total_usd = total_usd

    order.save(
        update_fields=[
            "total_irr",
            "total_usd",
        ]
    )

    Invoice.objects.update_or_create(
        order=order,
        type=Invoice.InvoiceType.CUSTOMER,
        defaults={
            "profit_usd": None,
        },
    )

    Invoice.objects.update_or_create(
        order=order,
        type=Invoice.InvoiceType.ADMIN,
        defaults={
            "profit_usd": profit_usd,
        },
    )


@transaction.atomic
def create_order(
    *,
    user,
    items,
    shipping_cost=0,
    service_cost=0,
    payment_status=Order.PaymentStatus.PENDING,
    usd_rate=0,
):
    order = Order.objects.create(
        user=user,
        status=Order.Status.REGISTERED,
        payment_status=payment_status,
        shipping_cost=to_decimal(
            shipping_cost
        ),
        service_cost=to_decimal(
            service_cost
        ),
        usd_rate=to_decimal(
            usd_rate
        ),
        total_usd=0,
        total_irr=0,
    )

    for item in items:
        OrderItem.objects.create(
            order=order,

            product_name=
                item["product_name"],

            quantity=int(
                item.get(
                    "quantity",
                    1
                )
            ),

            currency=
                item["currency"],

            product_price=
                to_decimal(
                    item.get(
                        "product_price"
                    )
                ),

            admin_cost=
                to_decimal(
                    item.get(
                        "admin_cost"
                    )
                ),

            exchange_rate=
                to_decimal(
                    item.get(
                        "exchange_rate"
                    )
                ),

            photo=
                item.get(
                    "photo"
                ),
        )

    _recalculate_order(order)

    return order


@transaction.atomic
def update_order(
    *,
    order,
    user,
    items,
    shipping_cost=0,
    service_cost=0,
    payment_status=Order.PaymentStatus.PENDING,
    usd_rate=0,
):
    order.user = user

    order.shipping_cost = to_decimal(
        shipping_cost
    )

    order.service_cost = to_decimal(
        service_cost
    )

    order.payment_status = (
        payment_status
    )

    order.usd_rate = to_decimal(
        usd_rate
    )

    order.save(
        update_fields=[
            "user",
            "shipping_cost",
            "service_cost",
            "payment_status",
            "usd_rate",
        ]
    )

    existing_items = {
        item.id: item
        for item
        in order.items.select_for_update()
    }

    kept_ids = set()

    files_to_delete = []

    for item_data in items:
        item_id = item_data.get(
            "id"
        )

        order_item = None

        if item_id:
            try:
                item_id = int(
                    item_id
                )
            except (
                TypeError,
                ValueError,
            ):
                raise ValueError(
                    "شناسه آیتم سفارش معتبر نیست."
                )

            order_item = (
                existing_items.get(
                    item_id
                )
            )

            if order_item is None:
                raise ValueError(
                    "یکی از آیتم‌های سفارش معتبر نیست."
                )

            kept_ids.add(
                order_item.id
            )

        if order_item is None:
            order_item = OrderItem(
                order=order
            )

        order_item.product_name = (
            item_data[
                "product_name"
            ]
        )

        order_item.quantity = int(
            item_data.get(
                "quantity",
                1
            )
        )

        order_item.currency = (
            item_data[
                "currency"
            ]
        )

        order_item.product_price = (
            to_decimal(
                item_data.get(
                    "product_price"
                )
            )
        )

        order_item.admin_cost = (
            to_decimal(
                item_data.get(
                    "admin_cost"
                )
            )
        )

        order_item.exchange_rate = (
            to_decimal(
                item_data.get(
                    "exchange_rate"
                )
            )
        )

        new_photo = item_data.get(
            "photo"
        )

        if new_photo:
            old_photo_name = None

            if (
                order_item.pk
                and
                order_item.photo
            ):
                old_photo_name = (
                    order_item.photo.name
                )

            order_item.photo = (
                new_photo
            )

            if old_photo_name:
                files_to_delete.append(
                    old_photo_name
                )

        order_item.save()

    # آیتم‌هایی که کاربر هنگام ویرایش
    # از فرم حذف کرده است.
    for (
        existing_id,
        existing_item
    ) in existing_items.items():

        if (
            existing_id
            not in kept_ids
        ):
            if existing_item.photo:
                files_to_delete.append(
                    existing_item.photo.name
                )

            existing_item.delete()

    _recalculate_order(
        order
    )

    if files_to_delete:

        def remove_old_files():
            for file_name in files_to_delete:
                if (
                    file_name
                    and
                    default_storage.exists(
                        file_name
                    )
                ):
                    default_storage.delete(
                        file_name
                    )

        transaction.on_commit(
            remove_old_files
        )

    return order


@transaction.atomic
def delete_order(order):
    files_to_delete = [
        item.photo.name
        for item
        in order.items.all()
        if item.photo
    ]

    order.delete()

    if files_to_delete:

        def remove_files():
            for file_name in files_to_delete:
                if (
                    file_name
                    and
                    default_storage.exists(
                        file_name
                    )
                ):
                    default_storage.delete(
                        file_name
                    )

        transaction.on_commit(
            remove_files
        )