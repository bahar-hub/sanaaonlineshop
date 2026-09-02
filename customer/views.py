
from django.shortcuts import render
from django.contrib import messages
from django.contrib.auth.decorators import user_passes_test
from django.contrib.auth import update_session_auth_hash


def is_customer(user):
    return user.is_authenticated and not user.is_superuser


@user_passes_test(is_customer, login_url="base:index")
def profile_view(request):

    if request.method == "POST":

        action = request.POST.get("action")

        # =========================
        # Update Profile
        # =========================

        if action == "update_profile":

            phone = request.POST.get("phone", "").strip()
            address = request.POST.get("address", "").strip()

            request.user.phone = phone
            request.user.address = address

            request.user.save()

            messages.success(
                request,
                "اطلاعات با موفقیت ذخیره شد.",
                extra_tags="profile"
            )

        # =========================
        # Change Password
        # =========================

        elif action == "change_password":

            old_password = request.POST.get("oldPassword", "")
            new_password = request.POST.get("newPassword", "")

            if not request.user.check_password(old_password):

                messages.error(
                    request,
                    "رمز عبور فعلی صحیح نیست.",
                    extra_tags="password"
                )

            elif len(new_password) < 6:

                messages.error(
                    request,
                    "رمز عبور جدید باید حداقل ۶ کاراکتر باشد.",
                    extra_tags="password"
                )

            elif old_password == new_password:

                messages.error(
                    request,
                    "رمز عبور جدید باید با رمز فعلی متفاوت باشد.",
                    extra_tags="password"
                )

            else:

                request.user.set_password(new_password)
                request.user.save()

                update_session_auth_hash(
                    request,
                    request.user
                )

                messages.success(
                    request,
                    "رمز عبور با موفقیت تغییر کرد.",
                    extra_tags="password"
                )

    context = {
        "customer": request.user
    }

    return render(
        request,
        "customer/customer.html",
        context
    )
