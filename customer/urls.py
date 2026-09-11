from django.urls import path

from .views import *

app_name = 'customer'

urlpatterns = [

    path('', profile_view, name='profile'),

    path(
        'orders/',
        customer_orders_api,
        name='orders_api',
    ),
    path(
    'orders/<int:order_id>/',
    customer_order_detail_api,
    name='order_detail_api',
    ),

]