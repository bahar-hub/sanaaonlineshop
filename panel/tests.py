from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse


@override_settings(NETARZ_FX_KEY="fx-ntz-v1-test")
class ExchangeRateViewTests(TestCase):
    def setUp(self):
        cache.clear()
        self.admin = get_user_model().objects.create_superuser(
            username="rate-admin",
            phone="09120000000",
            password="test-password",
        )
        self.client.force_login(self.admin)

    @patch("panel.views.requests.get")
    def test_converts_toman_quote_to_rial_per_one_unit(self, mocked_get):
        response = Mock(ok=True)
        response.json.return_value = {
            "data": {"code": "USD", "unit": 1, "sell": 102900},
            "meta": {"as_of": "2026-09-05T10:20:00+03:30"},
        }
        mocked_get.return_value = response

        result = self.client.get(
            reverse("panel:exchange_rate"),
            {"currency": "USD"},
        )

        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()["rate"], 1029000)
        self.assertEqual(result.json()["quoteCurrency"], "IRR")

    def test_rejects_unsupported_currency(self):
        result = self.client.get(
            reverse("panel:exchange_rate"),
            {"currency": "BTC"},
        )

        self.assertEqual(result.status_code, 400)
        self.assertFalse(result.json()["success"])

# Create your tests here.
