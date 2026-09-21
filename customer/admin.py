from django.contrib import admin
from .models import User

admin.site.register(User)


from .models import TelegramConnection


@admin.register(TelegramConnection)
class TelegramConnectionAdmin(admin.ModelAdmin):

    list_display = (
        "user",
        "telegram_id",
        "is_active",
        "connected_at",
    )

    search_fields = (
        "user__phone",
        "telegram_id",
    )

    readonly_fields = (
        "connected_at",
        "disconnected_at",
    )