from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('customer', '0003_telegramconnection'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='province',
            field=models.CharField(blank=True, default='', max_length=50, verbose_name='استان'),
        ),
        migrations.AddField(
            model_name='user',
            name='city',
            field=models.CharField(blank=True, default='', max_length=50, verbose_name='شهر'),
        ),
    ]
