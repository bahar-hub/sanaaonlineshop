from django.db import migrations


def normalize_old_statuses(apps, schema_editor):
    Order = apps.get_model("orders", "Order")

    # وضعیت‌های قدیمی را به نزدیک‌ترین وضعیت جدید تبدیل می‌کنیم.
    Order.objects.filter(status__in=["confirmed", "preparing"]).update(
        status="registered"
    )
    Order.objects.filter(status="returned").update(
        status="cancelled"
    )


def reverse_normalize_old_statuses(apps, schema_editor):
    # امکان تشخیص دقیق وضعیت قبلی بعد از تبدیل وجود ندارد.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0004_alter_order_status"),
    ]

    operations = [
        migrations.RunPython(
            normalize_old_statuses,
            reverse_normalize_old_statuses,
        ),
    ]
