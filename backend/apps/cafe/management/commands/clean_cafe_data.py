import logging
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.core.models import Tenant
from apps.cafe.models import Hall, Table, Order, OrderItem, Shift

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Cleans up cafe tables, halls and orders from non-cafe (retail/shop) tenants, and deduplicates cafe tables'

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
        self.stdout.write(self.style.NOTICE('Starting Cafe Data Cleanup...'))

        with transaction.atomic():
            all_tenants = Tenant.objects.all()
            non_cafe_tenants = []
            cafe_tenants = []

            for t in all_tenants:
                if self.is_cafe_tenant(t):
                    cafe_tenants.append(t)
                else:
                    non_cafe_tenants.append(t)

            self.stdout.write(f'Found {len(cafe_tenants)} Cafe/Restaurant tenant(s): {[t.name for t in cafe_tenants]}')
            self.stdout.write(f'Found {len(non_cafe_tenants)} Retail/Shop tenant(s): {[t.name for t in non_cafe_tenants]}')

            # 1. Delete cafe data for non-cafe tenants
            deleted_items = 0
            deleted_orders = 0
            deleted_tables = 0
            deleted_halls = 0
            deleted_shifts = 0

            for t in non_cafe_tenants:
                items_cnt, _ = OrderItem.objects.filter(tenant=t).delete()
                orders_cnt, _ = Order.objects.filter(tenant=t).delete()
                tables_cnt, _ = Table.objects.filter(tenant=t).delete()
                halls_cnt, _ = Hall.objects.filter(tenant=t).delete()
                shifts_cnt, _ = Shift.objects.filter(tenant=t).delete()

                deleted_items += items_cnt
                deleted_orders += orders_cnt
                deleted_tables += tables_cnt
                deleted_halls += halls_cnt
                deleted_shifts += shifts_cnt

            self.stdout.write(self.style.SUCCESS(
                f'Cleaned non-cafe tenant data: {deleted_tables} tables, {deleted_halls} halls, {deleted_orders} orders deleted.'
            ))

            # 2. Deduplicate tables for Cafe tenants
            dedup_deleted = 0
            for t in cafe_tenants:
                tables_by_number = {}
                all_t_tables = Table.objects.filter(tenant=t).order_by('id')
                for tbl in all_t_tables:
                    num = tbl.number
                    if num not in tables_by_number:
                        tables_by_number[num] = []
                    tables_by_number[num].append(tbl)

                for num, tbl_list in tables_by_number.items():
                    if len(tbl_list) > 1:
                        # Keep table with active order or the first one
                        primary_table = next((x for x in tbl_list if x.active_order_id), tbl_list[0])
                        for duplicate in tbl_list:
                            if duplicate.id != primary_table.id:
                                # Re-link any orders to primary table before deleting
                                Order.objects.filter(table=duplicate).update(table=primary_table)
                                duplicate.delete()
                                dedup_deleted += 1

            self.stdout.write(self.style.SUCCESS(
                f'Deduplicated cafe tables: {dedup_deleted} duplicate table(s) removed.'
            ))

        self.stdout.write(self.style.SUCCESS('Cafe database cleanup successfully completed!'))
