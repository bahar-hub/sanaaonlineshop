from .views import telegram_webhook
from django.urls import path

# app_name = 'orders'

urlpatterns = [

    path(
        "telegram/webhook/",
        telegram_webhook,
        name="telegram_webhook"
    ),

]