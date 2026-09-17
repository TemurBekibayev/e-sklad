from decimal import Decimal
from django.core.management.base import BaseCommand
from apps.core.models import Tenant
from apps.cafe.models import Hall, Table

class Command(BaseCommand):
    help = 'Seeds initial halls and tables for all tenants'

    def handle(self, *args, **options):
        for tenant in Tenant.objects.all():
            hall, _ = Hall.objects.get_or_create(
                tenant=tenant,
                name='Asosiy Zal',
                defaults={'service_percent': Decimal('10.00'), 'sort_order': 1}
            )
            vip_hall, _ = Hall.objects.get_or_create(
                tenant=tenant,
                name='VIP Zal',
                defaults={'service_percent': Decimal('15.00'), 'sort_order': 2}
            )

            for i in range(1, 13):
                Table.objects.get_or_create(
                    tenant=tenant,
                    number=i,
                    defaults={'name': f'STOL - {i}', 'hall': hall, 'capacity': 4, 'status': 'free'}
                )
            for i in range(13, 16):
                Table.objects.get_or_create(
                    tenant=tenant,
                    number=i,
                    defaults={'name': f'VIP - {i-12}', 'hall': vip_hall, 'capacity': 8, 'status': 'free'}
                )
            self.stdout.write(self.style.SUCCESS(f'Successfully initialized tables for tenant: {tenant.name}'))
