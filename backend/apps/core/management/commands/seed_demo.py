from django.core.management.base import BaseCommand
from decimal import Decimal
from django.utils import timezone
from apps.core.models import Tenant, User, UserRole, TenantStatus, AuditLog
from apps.products.models import Product, StockMovement, PriceHistory, MovementType
from apps.baskets.models import Basket, BasketItem, BasketStatus
from apps.transactions.models import Transaction, PaymentMethod, TransactionStatus
from apps.debts.models import Debt, DebtHistory, DebtHistoryType

class Command(BaseCommand):
    help = "Dastlabki platforma admini va sinov do'koni ma'lumotlarini yaratadi"

    def handle(self, *args, **options):
        self.stdout.write("Baza uchun sinov ma'lumotlarini yuklash boshlandi...")

        # 1. Platform Super Admin
        admin_email = "admin@sotuvpro.uz"
        admin_user = User.objects.filter(email=admin_email).first()
        if not admin_user:
            admin_user = User.objects.create_superuser(
                email=admin_email,
                name="Aziz Karimov",
                password="adminpassword2026",
                role=UserRole.ADMIN
            )
            self.stdout.write(self.style.SUCCESS(f"Platforma Super Admin yaratildi: {admin_email} / adminpassword2026"))

        # 2. Demo Tenant 1: Toshkent Elektron
        toshkent_tenant, created = Tenant.objects.get_or_create(
            name="Toshkent Elektron",
            defaults={
                'address': 'Chilonzor tumani, Toshkent shahri',
                'status': TenantStatus.ACTIVE,
                'settings': {
                    'max_worker_finalize_amount': 1000000.0,
                    'allow_negative_stock': False,
                    'auto_sms_enabled': True
                }
            }
        )

        # 3. Manager
        manager_user, _ = User.objects.get_or_create(
            email="manager@toshkent.uz",
            defaults={
                'tenant': toshkent_tenant,
                'name': 'Sardor Aliyev (Manager)',
                'role': UserRole.MANAGER,
                'is_staff': True
            }
        )
        manager_user.set_password("managerpass2026")
        manager_user.set_pin("1234")
        manager_user.save()

        # 4. Worker
        worker_user, _ = User.objects.get_or_create(
            name="Bekzod Rahimov",
            tenant=toshkent_tenant,
            defaults={
                'email': 'bekzod@toshkent.uz',
                'phone_number': '+998901234567',
                'role': UserRole.WORKER,
            }
        )
        worker_user.set_pin("5555")
        worker_user.save()

        # 5. Products
        p1, _ = Product.objects.get_or_create(
            tenant=toshkent_tenant,
            name="iPhone 15 Pro Max",
            defaults={
                'purchase_unit': 'blok',
                'sale_unit': 'dona',
                'conversion_factor': Decimal('10.0000'),
                'price_per_sale_unit': Decimal('16500000.00'),
                'current_stock': Decimal('24.0000'),
                'reserved_stock': Decimal('0.0000'),
                'barcode': '4780001234567',
                'qr_code': 'QR-IPHONE-15PM',
                'low_stock_threshold': Decimal('5.0000')
            }
        )

        p2, _ = Product.objects.get_or_create(
            tenant=toshkent_tenant,
            name="Samsung Galaxy A54",
            defaults={
                'purchase_unit': 'quti',
                'sale_unit': 'dona',
                'conversion_factor': Decimal('20.0000'),
                'price_per_sale_unit': Decimal('4200000.00'),
                'current_stock': Decimal('3.0000'),
                'reserved_stock': Decimal('0.0000'),
                'barcode': '4780007654321',
                'qr_code': 'QR-SAMS-A54',
                'low_stock_threshold': Decimal('5.0000')
            }
        )

        # 6. Audit Log
        AuditLog.objects.create(
            tenant=toshkent_tenant,
            user=admin_user,
            action="tenant_created",
            details={'tenant_name': toshkent_tenant.name, 'note': 'Demo ma\'lumotlar yuklandi'},
            ip_address="127.0.0.1"
        )

        self.stdout.write(self.style.SUCCESS("Demo ma'lumotlar muvaffaqiyatli yuklandi!"))
