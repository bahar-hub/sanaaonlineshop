from django.shortcuts import render

# Create your views here.
def customer_view(request):
    return render(request, 'panel/admin-customers-f.html')


def admin_manage_view(request):
    return render(request, 'panel/adminpage.html')

def report_view(request):
    return render(request, 'panel/admin-reports-f.html')

def orders_view(request):
    return render(request, 'panel/admin-orders-f.html')