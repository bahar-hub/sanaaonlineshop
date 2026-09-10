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