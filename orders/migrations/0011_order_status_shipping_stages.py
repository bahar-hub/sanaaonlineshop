from django.db import migrations, models


def shipped_to_iran(apps, schema_editor):
    # وضعیت قدیمی «ارسال شده» همان مرحله رسیدن سفارش به ایران بود.
    Order = apps.get_model("orders", "Order")
    Order.objects.filter(status="shipped").update(status="shipped_to_iran")


def iran_to_shipped(apps, schema_editor):
    Order = apps.get_model("orders", "Order")
    Order.objects.filter(
        status__in=["shipped_to_iran", "shipped_to_customer"]
    ).update(status="shipped")


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0010_order_service_cost"),
    ]

    operations = [
        migrations.AlterField(
            model_name="order",
            name="status",
            field=models.CharField(
                choices=[
                    ("registered", "ثبت شده"),
                    ("shipped_to_iran", "ارسال به ایران"),
                    ("shipped_to_customer", "ارسال به مشتری"),
                    ("delivered", "تحویل داده شده"),
                    ("cancelled", "لغو شده"),
                ],
                default="registered",
                max_length=20,
            ),
        ),
        migrations.RunPython(shipped_to_iran, iran_to_shipped),
    ]
