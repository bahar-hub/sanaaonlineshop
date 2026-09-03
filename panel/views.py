from django.contrib.auth.decorators import user_passes_test
from django.contrib.auth import get_user_model
from django.shortcuts import render, redirect


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

    customers = User.objects.filter(
        is_superuser=False
    ).order_by("-date_joined")

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
    return render(request, "panel/admin-reports-f.html")


@user_passes_test(is_superuser, login_url="base:index")
def orders_view(request):
    return render(request, "panel/admin-orders-f.html")