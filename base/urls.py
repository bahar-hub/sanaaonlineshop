from django.urls import path
from .views import *

app_name = 'base'

urlpatterns = [
    path('', index_view, name='index'),
    path('manage/', admin_manage_view, name='admin_page'),
    path('customers/', customer_view, name='customers'),
]