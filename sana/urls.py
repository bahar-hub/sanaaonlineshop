from django.contrib import admin
from django.urls import path, include
from django.conf.urls.static import static
from django.conf import settings
from django.http import HttpResponse



def netarz_verify(request):
    return HttpResponse(
        "ntz-7dkqgcr5yqek549weurs6hms97ez6ytj",
        content_type="text/plain",
    )



urlpatterns = [
    path(
        ".well-known/netarz-fx-verify.txt",
        netarz_verify,
    ),
    path('admin/', admin.site.urls),
    path('', include('base.urls')),
    path('panel/', include('panel.urls')),
    path('profile/', include('customer.urls')),
    
    path(
        "orders/",
        include("orders.urls")
    ),
   
]

if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT,
    )

urlpatterns += static(settings.STATIC_URL, document_root = settings.STATIC_ROOT)
urlpatterns += static(settings.MEDIA_URL, document_root = settings.MEDIA_ROOT)