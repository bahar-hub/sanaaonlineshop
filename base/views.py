from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout, get_user_model


User = get_user_model()


def index_view(request):

    if request.user.is_authenticated:

        if request.user.is_superuser:
            return redirect("panel:orders")

        return redirect("customer:profile")

    return render(request, "base/index.html")


def login_view(request):

    if request.method == "POST":

        username = request.POST.get("username", "").strip()
        password = request.POST.get("password", "")

        user = authenticate(
            request,
            username=username,
            password=password,
        )

        if user is not None:

            login(request, user)

            if user.is_superuser:
                return redirect("panel:orders")

            return redirect("customer:profile")

        return render(
            request,
            "base/index.html",
            {
                "login_error": "نام کاربری یا رمز عبور اشتباه است."
            },
        )

    return redirect("base:index")


def signup_view(request):

    if request.method == "POST":

        first_name = request.POST.get("firstName", "").strip()
        last_name = request.POST.get("lastName", "").strip()
        phone = request.POST.get("phone", "").strip()
        address = request.POST.get("address", "").strip()
        username = request.POST.get("username", "").strip()
        password = request.POST.get("password", "")
        password_confirm = request.POST.get("passwordConfirm", "")

        # بررسی یکسان بودن رمز عبور
        if password != password_confirm:

            return render(
                request,
                "base/index.html",
                {
                    "signup_error": "رمز عبور و تکرار رمز عبور یکسان نیستند."
                },
            )

        # بررسی نام کاربری تکراری
        if User.objects.filter(username=username).exists():

            return render(
                request,
                "base/index.html",
                {
                    "signup_error": "این نام کاربری قبلاً استفاده شده است."
                },
            )

        # بررسی شماره تلفن تکراری
        if User.objects.filter(phone=phone).exists():

            return render(
                request,
                "base/index.html",
                {
                    "signup_error": "این شماره تلفن قبلاً ثبت شده است."
                },
            )

        # ساخت کاربر
        user = User.objects.create_user(
            username=username,
            password=password,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            address=address,
        )

        # ورود خودکار بعد از ثبت نام
        login(request, user)

        # مشتری بعد از ثبت نام → پروفایل
        return redirect("customer:profile")

    return redirect("base:index")


def logout_view(request):

    logout(request)

    return redirect("base:index")