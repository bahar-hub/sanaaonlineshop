
    
import os
import django

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    "sana.settings"
)

django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

username = "rootsquad"
email = "admin@sanaaonlineshop.com"
password = "@rootsquad2026"
phone = "09120000000"

user, created = User.objects.get_or_create(
    username=username,
    defaults={
        "email": email,
        "phone": phone,
    }
)

if created:
    user.set_password(password)
    user.is_staff = True
    user.is_superuser = True
    user.save()
    print("Admin created")
else:
    user.set_password(password)
    user.is_staff = True
    user.is_superuser = True
    user.save()
    print("Admin updated")