from decimal import Decimal, ROUND_HALF_UP, ROUND_CEILING

from django.conf import settings
from django.db import models


class Order(models.Model):

    class Status(models.TextChoices):
        REGISTERED = "registered", "ثبت شده"
        SHIPPED_TO_IRAN = "shipped_to_iran", "ارسال به ایران"
        SHIPPED_TO_CUSTOMER = "shipped_to_customer", "ارسال به مشتری"
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
        """
        Recalculate using each item's marked-up sale price and own FX rate.
        Each item's line_total_irr already includes that item's own service
        fee, so it isn't added again here — only shipping is.
        """
        items_total_irr = sum(
            (item.line_total_irr for item in self.items.all()),
            Decimal("0"),
        )

        step = Decimal("10000")
        raw_total = items_total_irr + (self.shipping_cost or Decimal("0"))
        self.total_irr = (
            (raw_total / step).to_integral_value(rounding=ROUND_CEILING)
            * step
        )

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
        CAD = "CAD", "دلار کانادا"

    # درصدهای پیش‌فرض هر واحد پول:
    #   broker = سود واسطه، admin = سود ادمین، tax = مالیات (تکس)
    # مجموع این سه، درصد افزایشی است که روی نرخ ارز اعمال می‌شود.
    # فقط سود ادمین به‌عنوان سود پروژه محاسبه و نمایش داده می‌شود.
    DEFAULT_PERCENTS_BY_CURRENCY = {
        "EUR": {"broker": Decimal("15"), "admin": Decimal("10"), "tax": Decimal("0")},
        "USD": {"broker": Decimal("20"), "admin": Decimal("10"), "tax": Decimal("12")},
        "CAD": {"broker": Decimal("20"), "admin": Decimal("10"), "tax": Decimal("12")},
        "TRY": {"broker": Decimal("10"), "admin": Decimal("10"), "tax": Decimal("0")},
        "AED": {"broker": Decimal("15"), "admin": Decimal("10"), "tax": Decimal("0")},
        "GBP": {"broker": Decimal("0"), "admin": Decimal("0"), "tax": Decimal("0")},
    }

    DEFAULT_MARKUP_BY_CURRENCY = {
        currency: sum(parts.values(), Decimal("0"))
        for currency, parts in DEFAULT_PERCENTS_BY_CURRENCY.items()
    }

    @classmethod
    def default_percents(cls, currency):
        return dict(
            cls.DEFAULT_PERCENTS_BY_CURRENCY.get(
                currency,
                {"broker": Decimal("0"), "admin": Decimal("0"), "tax": Decimal("0")},
            )
        )

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
    color = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name="رنگ محصول"
    )
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

    # Breakdown of markup_percent (which is always broker + admin + tax).
    # Only admin_percent is the admin's real profit.
    broker_percent = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0,
        verbose_name="درصد واسطه",
    )
    admin_percent = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0,
        verbose_name="درصد ادمین",
    )
    tax_percent = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0,
        verbose_name="درصد تکس",
    )

    # Legacy field retained for compatibility with existing DB/admin invoices.
    admin_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    service_cost = models.DecimalField(
        max_digits=18,
        decimal_places=0,
        default=0,
        verbose_name="هزینه خدمات"
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
        """
        Total payable amount for this line: unit price (after markup) × qty,
        plus this item's own service fee — charged once per item entry, not
        multiplied by quantity. This is what actually gets billed for the
        item, so it's what feeds into the order grand total; it is never
        broken out as a separate "service cost" line anywhere the customer
        can see it.
        """
        line_before_service = (
            self.unit_price_irr * self.quantity
        ).quantize(
            Decimal("1"),
            rounding=ROUND_HALF_UP,
        )

        return (
            line_before_service
            + (self.service_cost or Decimal("0"))
        ).quantize(
            Decimal("1"),
            rounding=ROUND_HALF_UP,
        )

    @property
    def markup_amount_irr(self):
        """
        Currency-markup profit only. The service fee is a separate concept
        (an admin-entered charge for the item, not FX markup), so it is
        deliberately excluded here even though it's now part of
        line_total_irr.
        """
        line_before_service = (
            self.unit_price_irr * self.quantity
        ).quantize(
            Decimal("1"),
            rounding=ROUND_HALF_UP,
        )
        base_total = self.base_unit_price_irr * self.quantity
        return (line_before_service - base_total).quantize(
            Decimal("1"),
            rounding=ROUND_HALF_UP,
        )


    @property
    def admin_profit_irr(self):
        """
        Admin's real profit: admin_percent of the base (pre-markup) line
        value. Broker share and tax are pass-through costs, and the
        service fee is a separate charge, so none of them count here.
        """
        base_total = self.base_unit_price_irr * self.quantity
        return (
            base_total * (self.admin_percent or Decimal("0")) / Decimal("100")
        ).quantize(Decimal("1"), rounding=ROUND_HALF_UP)


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
