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


class TelegramConnection(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="telegram_connection"
    )

    telegram_id = models.CharField(
        max_length=100,
        unique=True,
        null=True,
        blank=True
    )

    username = models.CharField(
        max_length=100,
        null=True,
        blank=True
    )

    first_name = models.CharField(
        max_length=100,
        null=True,
        blank=True
    )

    is_active = models.BooleanField(
        default=False
    )

    connected_at = models.DateTimeField(
        null=True,
        blank=True
    )

    disconnected_at = models.DateTimeField(
        null=True,
        blank=True
    )

    last_error = models.TextField(
        null=True,
        blank=True
    )


    def __str__(self):
        return f"{self.user} - Telegram"