from django.urls import path
from .views import *

app_name = 'panel'

urlpatterns = [
    path('', admin_manage_view, name='admin_page'),
    path('customers/', customer_view, name='customers'),
    path('report/', report_view, name='report'),
    path('orders/', orders_view, name='orders'),


]