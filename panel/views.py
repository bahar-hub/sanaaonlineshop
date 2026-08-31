from django.contrib.auth.decorators import user_passes_test
from django.shortcuts import render


def is_superuser(user):
    return user.is_authenticated and user.is_superuser


@user_passes_test(is_superuser, login_url="base:index")
def customer_view(request):
    return render(request, "panel/admin-customers-f.html")


@user_passes_test(is_superuser, login_url="base:index")
def admin_manage_view(request):
    return render(request, "panel/adminpage.html")


@user_passes_test(is_superuser, login_url="base:index")
def report_view(request):
    return render(request, "panel/admin-reports-f.html")


@user_passes_test(is_superuser, login_url="base:index")
def orders_view(request):
    return render(request, "panel/admin-orders-f.html")