from decimal import Decimal
from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_user_plain_password_user_plain_pin'),
    ]

    operations = [
        migrations.AddField(
            model_name='tenant',
            name='sms_price_per_unit',
            field=models.DecimalField(decimal_places=2, default=Decimal('100.00'), max_digits=10, verbose_name="Bitta SMS narxi (so'mda)"),
        ),
        migrations.AddField(
            model_name='tenant',
            name='subscription_monthly_fee',
            field=models.DecimalField(decimal_places=2, default=Decimal('250000.00'), max_digits=14, verbose_name="Oylik platforma abonent to'lovi (so'mda)"),
        ),
    ]
