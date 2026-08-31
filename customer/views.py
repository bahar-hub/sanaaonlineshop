from django.shortcuts import render
from django.contrib.auth.decorators import user_passes_test


def is_customer(user):
    return user.is_authenticated and not user.is_superuser


@user_passes_test(is_customer, login_url="base:index")
def profile_view(request):
    return render(request, "customer/customer.html")