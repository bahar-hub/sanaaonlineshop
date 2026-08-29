from django.shortcuts import render


app_name = 'base'

# Create your views here.
def index_view(request):
    return render(request, 'base/index.html')


def customer_view(request):
    return render(request, 'admin-customers-f.html')


def admin_manage_view(request):
    return render(request, 'adminpage.html')