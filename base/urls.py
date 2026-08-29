from django.urls import path
from .views import *

app_name = 'base'

urlpatterns = [
    path('', index_view, name='index'),
]