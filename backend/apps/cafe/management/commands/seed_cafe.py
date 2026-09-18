from decimal import Decimal
from django.core.management.base import BaseCommand
from apps.core.models import Tenant
from apps.cafe.models import Hall, Table

class Command(BaseCommand):
    help = 'Seeds initial halls and tables only for cafe/restaurant tenants'

    def is_cafe_tenant(self, tenant):
        if not tenant:
            return False
        if isinstance(tenant.settings, dict):
            b_type = tenant.settings.get('business_type')
            if b_type == 'cafe':
                return True
            if b_type == 'retail':
                return False
        name_lower = (tenant.name or '').lower()
        return any(k in name_lower for k in ['kafe', 'cafe', 'restoran', 'oshxona', 'bar', 'choyxona'])

    def handle(self, *args, **options):
        for tenant in Tenant.objects.all():
            if not self.is_cafe_tenant(tenant):
                continue

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
            self.stdout.write(self.style.SUCCESS(f'Successfully initialized tables for cafe tenant: {tenant.name}'))
