from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0002_order_payment_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="orderitem",
            name="markup_percent",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=6),
        ),
    ]
