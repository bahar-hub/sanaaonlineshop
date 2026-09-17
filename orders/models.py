from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.db import models


class Order(models.Model):

    class Status(models.TextChoices):
        REGISTERED = "registered", "ثبت شده"
        SHIPPED = "shipped", "ارسال شده"
        DELIVERED = "delivered", "تحویل داده شده"
        CANCELLED = "cancelled", "لغو شده"

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
    registered_at = models.DateTimeField(auto_now_add=True)

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.REGISTERED,
    )

    # Kept for backwards compatibility/reporting. For mixed-currency orders,
    # total_irr is the authoritative amount and total_usd is only an equivalent.
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
        """Recalculate using each item's marked-up sale price and own FX rate."""
        items_total_irr = sum(
            (item.line_total_irr for item in self.items.all()),
            Decimal("0"),
        )

        self.total_irr = (
            items_total_irr
            + (self.shipping_cost or Decimal("0"))
            + (self.service_cost or Decimal("0"))
        ).quantize(Decimal("1"), rounding=ROUND_HALF_UP)

        if self.usd_rate and self.usd_rate > 0:
            self.total_usd = (self.total_irr / self.usd_rate).quantize(
                Decimal("0.01"),
                rounding=ROUND_HALF_UP,
            )
        else:
            self.total_usd = Decimal("0")

        self.save(update_fields=["total_usd", "total_irr"])


class OrderItem(models.Model):

    class Currency(models.TextChoices):
        USD = "USD", "دلار"
        EUR = "EUR", "یورو"
        TRY = "TRY", "لیر"
        GBP = "GBP", "پوند"
        AED = "AED", "درهم"

    DEFAULT_MARKUP_BY_CURRENCY = {
        "USD": Decimal("42"),   # آمریکا / کانادا
        "EUR": Decimal("25"),   # آلمان / اسپانیا / ایتالیا
        "TRY": Decimal("20"),   # ترکیه
        "AED": Decimal("25"),   # دبی / عمان
        "GBP": Decimal("0"),    # برای سازگاری با داده‌های قبلی
    }

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
    product_name = models.CharField(max_length=255)
    brand = models.CharField(max_length=255, blank=True, default="")
    size = models.CharField(max_length=100, blank=True, default="")
    description = models.TextField(blank=True, default="")
    quantity = models.PositiveIntegerField(default=1)
    currency = models.CharField(
        max_length=3,
        choices=Currency.choices,
        default=Currency.USD,
    )

    # Price entered by admin BEFORE percentage increase, in the selected currency.
    product_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    # Percentage snapshot saved on the item so old invoices never change when
    # defaults are changed later.
    markup_percent = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0,
    )

    # Legacy field retained for compatibility with existing DB/admin invoices.
    admin_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    # Rial value of one unit of selected foreign currency at order time.
    exchange_rate = models.DecimalField(
        max_digits=18,
        decimal_places=4,
        default=0,
    )

    def __str__(self):
        return self.product_name

    @property
    def sale_unit_price(self):
        """Foreign-currency product price. Markup is NOT applied here."""
        return (self.product_price or Decimal("0")).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )

    @property
    def adjusted_exchange_rate(self):
        """FX rate after applying markup percentage to the Rial/Toman rate."""
        base_rate = self.exchange_rate or Decimal("0")
        markup = self.markup_percent or Decimal("0")
        multiplier = Decimal("1") + (markup / Decimal("100"))
        return (base_rate * multiplier).quantize(
            Decimal("1"),
            rounding=ROUND_HALF_UP,
        )

    @property
    def base_unit_price_irr(self):
        """Product price using the original FX rate, before markup."""
        return (
            (self.product_price or Decimal("0"))
            * (self.exchange_rate or Decimal("0"))
        ).quantize(
            Decimal("1"),
            rounding=ROUND_HALF_UP,
        )

    @property
    def unit_price_irr(self):
        """Product price using the adjusted FX rate, after markup."""
        return (
            (self.product_price or Decimal("0"))
            * self.adjusted_exchange_rate
        ).quantize(
            Decimal("1"),
            rounding=ROUND_HALF_UP,
        )

    @property
    def line_total_irr(self):
        return (self.unit_price_irr * self.quantity).quantize(
            Decimal("1"),
            rounding=ROUND_HALF_UP,
        )

    @property
    def markup_amount_irr(self):
        base_total = self.base_unit_price_irr * self.quantity
        return (self.line_total_irr - base_total).quantize(
            Decimal("1"),
            rounding=ROUND_HALF_UP,
        )


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
    issued_at = models.DateTimeField(auto_now_add=True)
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
