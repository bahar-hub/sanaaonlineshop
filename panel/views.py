from django.contrib.auth.decorators import user_passes_test
from django.contrib.auth import get_user_model
from django.shortcuts import render, redirect
import jdatetime


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

@user_passes_test(is_superuser, login_url="base:index")
def orders_view(request):
    return render(request, "panel/admin-orders-f.html")