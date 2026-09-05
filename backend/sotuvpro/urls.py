from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from apps.core.views import AdminDashboardStatsView, AdminReportsView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # API v1 routes
    path('api/v1/auth/', include('apps.core.urls_auth')),
    path('api/v1/users/', include('apps.core.urls_users')),
    path('api/v1/tenants/', include('apps.core.urls_tenants')),
    path('api/v1/products/', include('apps.products.urls')),
    path('api/v1/baskets/', include('apps.baskets.urls')),
    path('api/v1/transactions/', include('apps.transactions.urls')),
    path('api/v1/debts/', include('apps.debts.urls')),
    path('api/v1/reports/', include('apps.reports.urls_reports')),
    path('api/v1/admin/reports/', AdminReportsView.as_view(), name='admin_reports'),
    path('api/v1/admin/stats/', AdminDashboardStatsView.as_view(), name='admin_stats'),
    path('api/v1/admin/', include('apps.reports.urls_admin')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
