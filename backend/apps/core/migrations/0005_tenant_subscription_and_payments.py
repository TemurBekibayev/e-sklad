import uuid
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_user_can_sell_on_debt_user_max_debt_limit'),
    ]

    operations = [
        migrations.AddField(
            model_name='tenant',
            name='auto_freeze_on_expiry',
            field=models.BooleanField(default=True, verbose_name="Muddat o'tganda avtomatik bloklash"),
        ),
        migrations.AddField(
            model_name='tenant',
            name='freeze_reason',
            field=models.CharField(blank=True, default='', max_length=255, verbose_name='Muzlatish sababi'),
        ),
        migrations.AddField(
            model_name='tenant',
            name='last_payment_amount',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=14, null=True, verbose_name="Oxirgi to'lov summasi"),
        ),
        migrations.AddField(
            model_name='tenant',
            name='last_payment_date',
            field=models.DateTimeField(blank=True, null=True, verbose_name="Oxirgi to'lov sanasi"),
        ),
        migrations.AddField(
            model_name='tenant',
            name='paid_until',
            field=models.DateField(blank=True, null=True, verbose_name="To'langan muddat (gacha)"),
        ),
        migrations.CreateModel(
            name='SubscriptionPayment',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=14, verbose_name="To'lov summasi (so'mda)")),
                ('months_paid', models.PositiveIntegerField(default=1, verbose_name="Necha oylik to'lov")),
                ('paid_from', models.DateField(verbose_name='Boshlanish sanasi')),
                ('paid_until', models.DateField(verbose_name="Yangi to'langan muddat (gacha)")),
                ('payment_method', models.CharField(choices=[('cash', 'Naqd pul'), ('card', 'Bank kartasi / Terminal'), ('bank_transfer', "Bank o'tkazmasi (Hisob raqam)"), ('click', 'Click'), ('payme', 'Payme'), ('admin', 'Admin tomonidan uzaytirildi')], default='cash', max_length=50, verbose_name="To'lov usuli")),
                ('payment_date', models.DateTimeField(default=django.utils.timezone.now, verbose_name="To'lov qabul qilingan vaqt")),
                ('notes', models.TextField(blank=True, default='', verbose_name='Izoh')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='received_subscription_payments', to=settings.AUTH_USER_MODEL, verbose_name='Qabul qilgan xodim/admin')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='subscription_payments', to='core.tenant', verbose_name="Do'kon")),
            ],
            options={
                'verbose_name': "Obuna to'lovi",
                'verbose_name_plural': "Obuna to'lovlari",
                'db_table': 'subscription_payments',
                'ordering': ['-payment_date'],
            },
        ),
    ]
