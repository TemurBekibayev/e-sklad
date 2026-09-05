from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('debts', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='debt',
            name='is_phone_verified',
            field=models.BooleanField(default=False, verbose_name='Telefon raqami SMS-kod bilan tasdiqlanganmi'),
        ),
        migrations.AddField(
            model_name='debt',
            name='verified_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Tasdiqlangan sana va vaqt'),
        ),
    ]
