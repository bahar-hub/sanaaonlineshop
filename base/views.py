from django.shortcuts import render


app_name = 'base'

# Create your views here.
def index_view(request):
    return render(request, 'base/index.html')