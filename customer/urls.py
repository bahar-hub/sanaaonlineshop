from django.urls import path
from .views import *

app_name = 'customer'

urlpatterns = [
    path('', profile_view, name='profile'),

]