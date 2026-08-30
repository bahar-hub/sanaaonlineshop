from django.shortcuts import render
from django.contrib.auth import authenticate, login

# Create your views here.
def index_view(request):
    return render(request, 'base/index.html')


