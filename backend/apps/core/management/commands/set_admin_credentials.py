from django.core.management.base import BaseCommand
from apps.core.models import User, UserRole

class Command(BaseCommand):
    help = "Super admin hisobini admin@getpos.uz / getpos4321 ga o'rnatadi yoki yangilaydi"

    def handle(self, *args, **options):
        email = "admin@getpos.uz"
        password = "getpos4321"

        old_admin = User.objects.filter(email="admin@sotuvpro.uz").first()
        if old_admin:
            old_admin.email = email
            old_admin.set_password(password)
            old_admin.role = UserRole.ADMIN
            old_admin.is_superuser = True
            old_admin.is_staff = True
            old_admin.save()
            self.stdout.write(self.style.SUCCESS(f"Mavjud admin {email} / {password} ga yangilandi."))
            return

        admin_user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'name': 'Aziz Karimov',
                'role': UserRole.ADMIN,
                'is_staff': True,
                'is_superuser': True
            }
        )
        admin_user.set_password(password)
        admin_user.role = UserRole.ADMIN
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.save()

        if created:
            self.stdout.write(self.style.SUCCESS(f"Yangi super admin yaratildi: {email} / {password}"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Super admin yangilandi: {email} / {password}"))
