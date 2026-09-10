from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    phone = models.CharField(
        max_length=20,
        unique=True,
        null=False,
        blank=False,
    )

    address = models.TextField(
        null=False,
        blank=False,
    )


class PasswordResetOTP(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="password_reset_otps",
    )

    code_hash = models.CharField(max_length=64)

    created_at = models.DateTimeField(auto_now_add=True)

    expires_at = models.DateTimeField()

    attempts = models.PositiveIntegerField(default=0)

    is_used = models.BooleanField(default=False)

    def is_expired(self):
        from django.utils import timezone
        return timezone.now() >= self.expires_at
