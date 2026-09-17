from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0006_alter_order_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="orderitem",
            name="brand",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="orderitem",
            name="size",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.AddField(
            model_name="orderitem",
            name="description",
            field=models.TextField(blank=True, default=""),
        ),
    ]
