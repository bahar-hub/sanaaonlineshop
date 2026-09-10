from django.urls import path
from .views import *

app_name = 'panel'

urlpatterns = [
    path('', admin_manage_view, name='admin_page'),
    path('customers/', customer_view, name='customers'),
    path('report/', report_view, name='report'),
    path('orders/', orders_view, name='orders'),
    path(
        "orders/create/",
        create_order_view,
        name="create_order",
    ),

    path(
        "orders/<int:order_id>/update/",
        update_order_view,
        name="update_order",
    ),

    path(
        "orders/<int:order_id>/delete/",
        delete_order_view,
        name="delete_order",
    ),
]