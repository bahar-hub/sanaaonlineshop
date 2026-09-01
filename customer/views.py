from django.shortcuts import render
from django.contrib import messages
from django.contrib.auth.decorators import user_passes_test


def is_customer(user):

    return user.is_authenticated and not user.is_superuser


@user_passes_test(is_customer, login_url="base:index")
def profile_view(request):
    

    if request.method == "POST":

        phone = request.POST.get("phone", "").strip()
        address = request.POST.get("address", "").strip()

        request.user.phone = phone
        request.user.address = address

        request.user.save()
        messages.success(
            request,
            "اطلاعات با موفقیت ذخیره شد."
        )

    context = {'customer' : request.user}

    return render(
        request,
        "customer/customer.html",
        context
    )