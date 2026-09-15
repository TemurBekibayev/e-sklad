from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.core.models import Tenant, TenantStatus

class Command(BaseCommand):
    help = "Barcha do'konlarning oylik to'lov muddatini tekshiradi va to'lovi tugaganlarni avtomatik bloklaydi / to'langanlarni ochadi"

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help="O'zgarishlarni bazaga saqlamasdan faqat ko'rsatish")

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        self.stdout.write("Do'konlar obuna to'lovlarini tekshirish boshlandi...")

        tenants = Tenant.objects.all()
        now = timezone.now().date()
        frozen_count = 0
        active_count = 0
        unchanged_count = 0

        for t in tenants:
            old_status = t.status
            new_status = t.check_and_update_subscription(save=(not dry_run))

            if old_status != new_status:
                if new_status == TenantStatus.FROZEN:
                    frozen_count += 1
                    self.stdout.write(self.style.WARNING(f"[BLOKLANDI] {t.name} (To'langan muddat: {t.paid_until})"))
                elif new_status == TenantStatus.ACTIVE:
                    active_count += 1
                    self.stdout.write(self.style.SUCCESS(f"[OCHILDI] {t.name} (To'langan muddat: {t.paid_until})"))
            else:
                unchanged_count += 1

        total = tenants.count()
        self.stdout.write(self.style.SUCCESS(
            f"Yakunlandi: Jami {total} ta do'kon tekshirildi. "
            f"Muzlatildi: {frozen_count} ta, Blokdan ochildi: {active_count} ta, O'zgarishsiz: {unchanged_count} ta."
        ))
