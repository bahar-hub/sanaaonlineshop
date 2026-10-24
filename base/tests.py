from html.parser import HTMLParser

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse


class FormParser(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.elements = {}
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('id'):
            self.elements[attrs['id']] = attrs


class SignupTests(TestCase):
    def setUp(self):
        self.data = {
            'firstName': 'مینا', 'lastName': 'احمدی',
            'phone': '09123456789', 'address': 'آدرس آزمایشی',
            'province': 'تهران', 'city': 'تهران',
            'username': 'testcustomer', 'password': 'Example-123',
            'passwordConfirm': 'Example-123',
        }

    def test_form_offers_required_location_fields_and_location_data(self):
        response = self.client.get(reverse('base:index'))
        fields = FormParser(response.content.decode()).elements
        self.assertIn('required', fields['signupProvince'])
        self.assertIn('required', fields['signupCity'])
        self.assertContains(response, 'id="iran-locations-data"')
        self.assertContains(response, 'js/modules/iran-locations.js')

    def test_valid_signup_saves_location_and_logs_customer_in(self):
        response = self.client.post(reverse('base:signup'), self.data)
        self.assertRedirects(response, reverse('customer:profile'), fetch_redirect_response=False)
        user = get_user_model().objects.get(username='testcustomer')
        self.assertEqual((user.province, user.city), ('تهران', 'تهران'))
        self.assertEqual(str(user.pk), self.client.session['_auth_user_id'])

    def test_errors_are_visible_and_preserve_non_password_fields(self):
        cases = [
            ({'province': ''}, 'لطفاً استان را انتخاب کنید.'),
            ({'province': 'نامعتبر'}, 'استان انتخاب‌شده معتبر نیست.'),
            ({'city': ''}, 'لطفاً شهر را انتخاب کنید.'),
            ({'city': 'شیراز'}, 'شهر انتخاب‌شده متعلق به این استان نیست.'),
            ({'passwordConfirm': 'Different-123'}, 'رمز عبور و تکرار رمز عبور یکسان نیستند.'),
        ]
        for changes, message in cases:
            with self.subTest(changes=changes):
                data = {**self.data, **changes}
                response = self.client.post(reverse('base:signup'), data)
                self.assertContains(response, message)
                fields = FormParser(response.content.decode()).elements
                self.assertNotIn('hidden', fields['authPage'])
                self.assertIn('is-active', fields['signupForm']['class'])
                self.assertEqual(fields['signupUsername']['value'], 'testcustomer')
                self.assertEqual(fields['signupProvince']['data-selected'], data['province'])
                self.assertEqual(fields['signupCity']['data-selected'], data['city'])
                self.assertNotIn('value', fields['signupPassword'])
                self.assertNotIn('value', fields['signupPasswordConfirm'])
                self.assertFalse(get_user_model().objects.exists())

    def test_duplicate_username_and_phone_show_errors_without_creating_user(self):
        get_user_model().objects.create_user(username='existing', phone='09121111111', password='Example-123')
        for changes, message in [
            ({'username': 'existing'}, 'این نام کاربری قبلاً استفاده شده است.'),
            ({'phone': '09121111111'}, 'این شماره تلفن قبلاً ثبت شده است.'),
        ]:
            with self.subTest(changes=changes):
                response = self.client.post(reverse('base:signup'), {**self.data, **changes})
                self.assertContains(response, message)
                self.assertEqual(get_user_model().objects.count(), 1)

    def test_redisplayed_input_is_escaped(self):
        response = self.client.post(reverse('base:signup'), {
            **self.data, 'city': '', 'firstName': '\"><script>alert(1)</script>',
            'address': '</textarea><script>alert(1)</script>',
        })
        self.assertNotContains(response, '<script>alert(1)</script>')
        self.assertContains(response, '&lt;script&gt;alert(1)&lt;/script&gt;')
