from django.utils.cache import add_never_cache_headers


class NoCacheDynamicPagesMiddleware:
    """
    صفحات و APIهای پنل مشتری/ادمین هرگز نباید کش شوند؛ وگرنه مرورگر
    (یا پراکسی/CDN) با رفرش معمولی نسخه‌ی قدیمی سفارش‌ها را نشان می‌دهد
    و فقط Ctrl+Shift+R آن را به‌روز می‌کند.
    """

    PREFIXES = ("/profile/", "/panel/", "/orders/")

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if request.path.startswith(self.PREFIXES):
            add_never_cache_headers(response)
            response["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"

        return response
