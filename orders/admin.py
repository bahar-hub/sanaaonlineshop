from django.contrib import admin

from .models import Order, OrderItem, Invoice


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


class InvoiceInline(admin.TabularInline):
    model = Invoice
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "user",
        "status",
        "registered_at",
        "total_usd",
        "total_irr",
    )

    list_filter = (
        "status",
        "registered_at",
    )

    search_fields = (
        "user__username",
        "user__phone",
        "user__first_name",
        "user__last_name",
    )

    inlines = [
        OrderItemInline,
        InvoiceInline,
    ]


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "order",
        "product_name",
        "quantity",
        "currency",
        "product_price",
    )


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "order",
        "type",
        "issued_at",
        "profit_usd",
    )