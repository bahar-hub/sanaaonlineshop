from decimal import Decimal

from django.conf import settings
from django.db import models


class Order(models.Model):

    class Status(models.TextChoices):
        REGISTERED = "registered", "ثبت شده"
        CONFIRMED = "confirmed", "تأیید شده"
        PREPARING = "preparing", "در حال آماده‌سازی"
        SHIPPED = "shipped", "ارسال شده"
        DELIVERED = "delivered", "تحویل داده شده"
        CANCELLED = "cancelled", "لغو شده"
        RETURNED = "returned", "مرجوع شده"
    class PaymentStatus(models.TextChoices):
        PENDING = "pending", "در انتظار پرداخت"
        PAID = "paid", "پرداخت شده"
        PARTIAL = "partial", "پرداخت ناقص"
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="orders",
    )


    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
    )
    registered_at = models.DateTimeField(
        auto_now_add=True
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.REGISTERED,
    )

    total_usd = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    total_irr = models.DecimalField(
        max_digits=18,
        decimal_places=0,
        default=0,
    )

    usd_rate = models.DecimalField(
        max_digits=18,
        decimal_places=4,
        default=0,
    )

    shipping_cost = models.DecimalField(
        max_digits=18,
        decimal_places=0,
        default=0,
    )

    service_cost = models.DecimalField(
        max_digits=18,
        decimal_places=0,
        default=0,
    )

    def __str__(self):
        return f"Order #{self.id} - {self.user}"

    def calculate_totals(self):

        total_usd = sum(
            item.product_price * item.quantity
            for item in self.items.all()
        )

        self.total_usd = total_usd

        self.total_irr = (
            total_usd * self.usd_rate
            + self.shipping_cost
            + self.service_cost
        )

        self.save(
            update_fields=[
                "total_usd",
                "total_irr",
            ]
        )



class OrderItem(models.Model):

    class Currency(models.TextChoices):
        USD = "USD", "دلار"
        EUR = "EUR", "یورو"
        TRY = "TRY", "لیر"
        GBP = "GBP", "پوند"
        AED = "AED", "درهم"

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
    )

    photo = models.ImageField(
        upload_to="orders/items/",
        blank=True,
        null=True,
    )

    product_name = models.CharField(
        max_length=255
    )

    quantity = models.PositiveIntegerField(
        default=1
    )

    currency = models.CharField(
        max_length=3,
        choices=Currency.choices,
        default=Currency.USD,
    )

    product_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    admin_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    exchange_rate = models.DecimalField(
        max_digits=18,
        decimal_places=4,
        default=0,
    )

    def __str__(self):
        return self.product_name


class Invoice(models.Model):

    class InvoiceType(models.TextChoices):
        CUSTOMER = "customer", "فاکتور مشتری"
        ADMIN = "admin", "فاکتور ادمین"

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="invoices",
    )

    type = models.CharField(
        max_length=20,
        choices=InvoiceType.choices,
    )

    issued_at = models.DateTimeField(
        auto_now_add=True
    )

    profit_usd = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        blank=True,
        null=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["order", "type"],
                name="unique_invoice_type_per_order",
            )
        ]

    def __str__(self):
        return f"{self.order_id} - {self.type}"