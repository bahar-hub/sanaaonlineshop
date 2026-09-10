from decimal import Decimal, InvalidOperation

import json
import jdatetime

from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import user_passes_test
from django.http import JsonResponse
from django.shortcuts import (
    get_object_or_404,
    render,
    redirect,
)
from django.utils import timezone
from django.views.decorators.http import require_POST

from orders.models import (
    Order,
    OrderItem,
    Invoice,
)

from orders.services import (
    create_order,
    update_order,
    delete_order as delete_order_service,
)

def is_superuser(user):
    return user.is_authenticated and user.is_superuser


@user_passes_test(is_superuser, login_url="base:index")
def customer_view(request):

    User = get_user_model()

    if request.method == "POST":
        first_name = request.POST.get("first_name", "").strip()
        last_name = request.POST.get("last_name", "").strip()
        username = request.POST.get("username", "").strip()
        phone = request.POST.get("phone", "").strip()
        password = request.POST.get("password", "")
        address = request.POST.get("address", "").strip()

        user = User(
            first_name=first_name,
            last_name=last_name,
            username=username,
            phone=phone,
            address=address,
        )

        user.set_password(password)
        user.save()

        return redirect("panel:customers")

    customers = list(
        User.objects.filter(
            is_superuser=False
        ).order_by("-date_joined").values(
            "id",
            "first_name",
            "last_name",
            "phone",
            "date_joined",
        )
    )

    for customer in customers:
        customer["ordersCount"] = 0
        customer["totalSpent"] = 0
        customer["status"] = "active"
        customer["orders"] = []

        customer["name"] = (
            customer["first_name"] + " " + customer["last_name"]
        )
        customer["id"] = "C-" + str(customer["id"]).zfill(4)
        customer["joinDate"] = jdatetime.datetime.fromgregorian(
            datetime=customer["date_joined"]
        ).strftime("%Y/%m/%d")  

    context = {
        "customers": customers,
    }

    return render(
        request,
        "panel/admin-customers-f.html",
        context
    )


@user_passes_test(is_superuser, login_url="base:index")
def admin_manage_view(request):
    return render(request, "panel/adminpage.html")


@user_passes_test(is_superuser, login_url="base:index")
def report_view(request):
    User = get_user_model()

    customer_join_dates = [
        dt.isoformat()
        for dt in User.objects.filter(
            is_superuser=False
        ).values_list("date_joined", flat=True)
    ]

    context = {
        "customer_join_dates": customer_join_dates,
    }

    return render(
        request,
        "panel/admin-reports-f.html",
        context
    )



def serialize_order(order):
    customer = order.user

    customer_name = (
        f"{customer.first_name} "
        f"{customer.last_name}"
    ).strip()

    if not customer_name:
        customer_name = (
            customer.username
        )

    registered_at = (
        timezone.localtime(
            order.registered_at
        )
    )

    jalali_date = (
        jdatetime.datetime
        .fromgregorian(
            datetime=registered_at
        )
        .strftime(
            "%Y/%m/%d"
        )
    )

    currency_fields = {
        "USD": "unitPriceUsd",
        "EUR": "unitPriceEur",
        "TRY": "unitPriceTry",
        "GBP": "unitPriceGbp",
        "AED": "unitPriceAed",
    }

    order_items = list(
        order.items.all()
    )

    products = []

    for item in order_items:
        image_url = ""

        if item.photo:
            try:
                image_url = (
                    item.photo.url
                )
            except ValueError:
                image_url = ""

        product = {
            "id": item.id,
            "name":
                item.product_name,
            "qty":
                item.quantity,
            "currency":
                item.currency,
            "costPrice":
                float(
                    item.admin_cost
                ),
            "exchangeRate":
                float(
                    item.exchange_rate
                ),
            "image":
                image_url,
        }

        price_field = (
            currency_fields.get(
                item.currency
            )
        )

        if price_field:
            product[
                price_field
            ] = float(
                item.product_price
            )

        products.append(
            product
        )

    if order_items:
        order_currency = (
            order_items[0].currency
        )
    else:
        order_currency = "USD"

    invoice_types = {
        invoice.type
        for invoice
        in order.invoices.all()
    }

    invoice_status = (
        "issued"
        if (
            Invoice
            .InvoiceType
            .CUSTOMER
            in invoice_types
        )
        else "waiting"
    )

    total_irr = float(
        order.total_irr
    )

    is_paid = (
        order.payment_status
        ==
        Order.PaymentStatus.PAID
    )

    return {
        "id":
            order.id,

        "number":
            f"SN-{order.id:05d}",

        "date":
            jalali_date,

        "lastChangeDate":
            jalali_date,

        "customer": {
            "id":
                customer.id,

            "name":
                customer_name,

            "phone":
                customer.phone
                or "—",

            "address":
                customer.address
                or "—",

            "note":
                "",
        },

        "products":
            products,

        "currency":
            order_currency,

        "discountRial":
            0,

        "shippingRial":
            float(
                order.shipping_cost
            ),

        "serviceRial":
            float(
                order.service_cost
            ),

        "totalRial":
            total_irr,

        "paymentStatus":
            order.payment_status,

        "orderStatus":
            order.status,

        "invoiceStatus":
            invoice_status,

        "payment": {
            "method":
                "—",

            "trackingCode":
                "—",

            "paidDate":
                jalali_date
                if is_paid
                else "—",

            "paidRial":
                total_irr
                if is_paid
                else 0,

            "remainingRial":
                0
                if is_paid
                else total_irr,
        },
    }

def parse_order_request(request):
    User = get_user_model()

    customer_id = request.POST.get(
        "customer_id"
    )

    try:
        customer = User.objects.get(
            id=customer_id,
            is_superuser=False,
        )

    except (
        User.DoesNotExist,
        TypeError,
        ValueError,
    ):
        raise ValueError(
            "مشتری انتخاب‌شده معتبر نیست."
        )

    payment_status = request.POST.get(
        "payment_status",
        Order.PaymentStatus.PENDING,
    )

    if (
        payment_status
        not in Order.PaymentStatus.values
    ):
        raise ValueError(
            "وضعیت پرداخت معتبر نیست."
        )

    items_json = request.POST.get(
        "items",
        "[]",
    )

    try:
        raw_items = json.loads(
            items_json
        )

    except json.JSONDecodeError:
        raise ValueError(
            "اطلاعات اقلام سفارش معتبر نیست."
        )

    if (
        not isinstance(raw_items, list)
        or
        not raw_items
    ):
        raise ValueError(
            "سفارش باید حداقل یک آیتم داشته باشد."
        )

    items = []

    for index, item in enumerate(
        raw_items
    ):
        product_name = str(
            item.get(
                "product_name",
                ""
            )
        ).strip()

        if not product_name:
            raise ValueError(
                f"نام محصول شماره {index + 1} وارد نشده است."
            )

        currency = item.get(
            "currency"
        )

        if (
            currency
            not in OrderItem.Currency.values
        ):
            raise ValueError(
                f"ارز محصول شماره {index + 1} معتبر نیست."
            )

        try:
            quantity = int(
                item.get(
                    "quantity",
                    1
                )
            )

        except (
            TypeError,
            ValueError,
        ):
            raise ValueError(
                f"تعداد محصول شماره {index + 1} معتبر نیست."
            )

        if quantity < 1:
            raise ValueError(
                f"تعداد محصول شماره {index + 1} معتبر نیست."
            )

        try:
            product_price = Decimal(
                str(
                    item.get(
                        "product_price",
                        0
                    )
                )
            )

            admin_cost = Decimal(
                str(
                    item.get(
                        "admin_cost",
                        0
                    )
                )
            )

            exchange_rate = Decimal(
                str(
                    item.get(
                        "exchange_rate",
                        0
                    )
                )
            )

        except (
            InvalidOperation,
            TypeError,
            ValueError,
        ):
            raise ValueError(
                f"اطلاعات قیمت محصول شماره {index + 1} معتبر نیست."
            )

        if product_price <= 0:
            raise ValueError(
                f"قیمت محصول شماره {index + 1} باید بیشتر از صفر باشد."
            )

        if admin_cost < 0:
            raise ValueError(
                f"قیمت خرید محصول شماره {index + 1} معتبر نیست."
            )

        if exchange_rate <= 0:
            raise ValueError(
                f"نرخ ارز محصول شماره {index + 1} معتبر نیست."
            )

        item_id = item.get(
            "id"
        )

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

        else:
            item_id = None

        photo = request.FILES.get(
            f"item_photo_{index}"
        )

        items.append(
            {
                "id":
                    item_id,

                "product_name":
                    product_name,

                "quantity":
                    quantity,

                "currency":
                    currency,

                "product_price":
                    product_price,

                "admin_cost":
                    admin_cost,

                "exchange_rate":
                    exchange_rate,

                "photo":
                    photo,
            }
        )

    return {
        "customer":
            customer,

        "payment_status":
            payment_status,

        "shipping_cost":
            request.POST.get(
                "shipping_cost",
                "0",
            ),

        "service_cost":
            request.POST.get(
                "service_cost",
                "0",
            ),

        "usd_rate":
            request.POST.get(
                "usd_rate",
                "0",
            ),

        "items":
            items,
    }


@user_passes_test(
    is_superuser,
    login_url="base:index"
)
def orders_view(request):

    User = get_user_model()

    customers = (
        User.objects
        .filter(
            is_superuser=False
        )
        .order_by(
            "first_name",
            "last_name"
        )
    )

    orders_queryset = (
        Order.objects
        .select_related(
            "user"
        )
        .prefetch_related(
            "items",
            "invoices"
        )
        .order_by(
            "-registered_at"
        )
    )

    orders_data = [
        serialize_order(order)
        for order in orders_queryset
    ]

    context = {
        "customers":
            customers,

        "orders_data":
            orders_data,
    }

    return render(
        request,
        "panel/admin-orders-f.html",
        context,
    )



@require_POST
@user_passes_test(
    is_superuser,
    login_url="base:index"
)
def create_order_view(request):

    try:
        data = parse_order_request(
            request
        )

        order = create_order(
            user=
                data["customer"],

            items=
                data["items"],

            shipping_cost=
                data["shipping_cost"],

            service_cost=
                data["service_cost"],

            payment_status=
                data["payment_status"],

            usd_rate=
                data["usd_rate"],
        )

    except ValueError as exc:

        return JsonResponse(
            {
                "success": False,
                "message": str(exc),
            },
            status=400,
        )

    except Exception as exc:

        print(
            "CREATE ORDER ERROR:",
            repr(exc)
        )

        return JsonResponse(
            {
                "success": False,
                "message":
                    "ثبت سفارش با خطا مواجه شد.",
            },
            status=500,
        )

    return JsonResponse(
        {
            "success": True,

            "order":
                serialize_order(
                    order
                ),
        },
        status=201,
    )



@require_POST
@user_passes_test(
    is_superuser,
    login_url="base:index"
)
def update_order_view(
    request,
    order_id
):

    order = get_object_or_404(
        Order,
        id=order_id,
    )

    try:
        data = parse_order_request(
            request
        )

        order = update_order(
            order=order,

            user=
                data["customer"],

            items=
                data["items"],

            shipping_cost=
                data["shipping_cost"],

            service_cost=
                data["service_cost"],

            payment_status=
                data["payment_status"],

            usd_rate=
                data["usd_rate"],
        )

    except ValueError as exc:

        return JsonResponse(
            {
                "success": False,
                "message": str(exc),
            },
            status=400,
        )

    except Exception as exc:

        print(
            "UPDATE ORDER ERROR:",
            repr(exc)
        )

        return JsonResponse(
            {
                "success": False,
                "message":
                    "ویرایش سفارش با خطا مواجه شد.",
            },
            status=500,
        )

    return JsonResponse(
        {
            "success": True,

            "order":
                serialize_order(
                    order
                ),
        }
    )



@require_POST
@user_passes_test(
    is_superuser,
    login_url="base:index"
)
def delete_order_view(
    request,
    order_id
):

    order = get_object_or_404(
        Order,
        id=order_id,
    )

    order_number = (
        f"SN-{order.id:05d}"
    )

    try:

        delete_order_service(
            order
        )

    except Exception as exc:

        print(
            "DELETE ORDER ERROR:",
            repr(exc)
        )

        return JsonResponse(
            {
                "success": False,
                "message":
                    "حذف سفارش با خطا مواجه شد.",
            },
            status=500,
        )

    return JsonResponse(
        {
            "success": True,

            "order_id":
                order_id,

            "order_number":
                order_number,
        }
    )
