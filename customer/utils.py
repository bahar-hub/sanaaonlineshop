import hashlib
from datetime import timedelta

import requests
from django.conf import settings
from django.utils import timezone

from .models import PasswordResetOTP


def send_password_reset_otp(user):
    response = requests.post(
        settings.MELIPAYAMAK_OTP_URL,
        json={
            "to": user.phone,
        },
        timeout=15,
    )

    response.raise_for_status()

    data = response.json()

    code = str(data.get("code", "")).strip()

    if not code:
        raise ValueError("OTP از Melipayamak دریافت نشد.")

    PasswordResetOTP.objects.filter(
        user=user,
        is_used=False,
    ).update(is_used=True)

    PasswordResetOTP.objects.create(
        user=user,
        code_hash=hashlib.sha256(code.encode()).hexdigest(),
        expires_at=timezone.now() + timedelta(minutes=5),
    )

    return True