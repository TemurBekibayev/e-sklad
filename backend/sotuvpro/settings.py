import os
import sys
from pathlib import Path
from datetime import timedelta
import environ

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Add apps folder to Python path
sys.path.insert(0, os.path.join(BASE_DIR, 'apps'))

env = environ.Env(
    DJANGO_DEBUG=(bool, True),
    DJANGO_SECRET_KEY=(str, 'django-insecure-sotuvpro-default-secret-key-2026'),
    ALLOWED_HOSTS=(list, ['*']),
    CORS_ALLOWED_ORIGINS=(list, [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:19006',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
    ]),
)

# Read .env file from root or backend
env_file = BASE_DIR.parent / '.env'
if env_file.exists():
    environ.Env.read_env(str(env_file))
elif (BASE_DIR / '.env').exists():
    environ.Env.read_env(str(BASE_DIR / '.env'))

SECRET_KEY = env('DJANGO_SECRET_KEY')
DEBUG = env('DJANGO_DEBUG')
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['*'])

INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third party packages
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'channels',
    'drf_spectacular',

    # SotuvPro Apps
    'apps.core.apps.CoreConfig',
    'apps.products.apps.ProductsConfig',
    'apps.baskets.apps.BasketsConfig',
    'apps.transactions.apps.TransactionsConfig',
    'apps.debts.apps.DebtsConfig',
    'apps.reports.apps.ReportsConfig',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.core.middleware.TenantContextMiddleware',
]

ROOT_URLCONF = 'sotuvpro.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'sotuvpro.wsgi.application'
ASGI_APPLICATION = 'sotuvpro.asgi.application'

# Database Configuration
DATABASES = {
    'default': env.db(
        'DATABASE_URL',
        default=f"postgres://{env('DB_USER', default='sotuvpro_user')}:{env('DB_PASSWORD', default='sotuvpro_secure_password_2026')}@{env('DB_HOST', default='localhost')}:{env('DB_PORT', default='5432')}/{env('DB_NAME', default='sotuvpro_db')}"
    )
}

# Custom User Model
AUTH_USER_MODEL = 'core.User'

# Password validation & Hashers (PBKDF2/argon2)
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
    'django.contrib.auth.hashers.Argon2PasswordHasher',
]

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 6}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'uz'
TIME_ZONE = 'Asia/Tashkent'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'apps.core.authentication.CustomJWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_THROTTLING_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
        'rest_framework.throttling.ScopedRateThrottle',
    ],
    'DEFAULT_THROTTLING_RATES': {
        'anon': '30/minute',
        'user': '120/minute',
        'auth': '10/minute',
    },
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# Simple JWT Configuration (Doimiy uzoq muddatli sessiya - 1 yil)
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=env.int('JWT_ACCESS_TOKEN_LIFETIME_DAYS', default=365)),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=env.int('JWT_REFRESH_TOKEN_LIFETIME_DAYS', default=730)),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'TOKEN_OBTAIN_SERIALIZER': 'apps.core.serializers.CustomTokenObtainPairSerializer',
}

# Redis & Channels Configuration
REDIS_HOST = env('REDIS_HOST', default='localhost')
REDIS_PORT = env.int('REDIS_PORT', default=6379)
REDIS_URL = env('REDIS_URL', default=f'redis://{REDIS_HOST}:{REDIS_PORT}/0')

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [(REDIS_HOST, REDIS_PORT)],
        },
    },
}

# Celery Configuration
CELERY_BROKER_URL = env('CELERY_BROKER_URL', default=f'redis://{REDIS_HOST}:{REDIS_PORT}/1')
CELERY_RESULT_BACKEND = env('CELERY_RESULT_BACKEND', default=f'redis://{REDIS_HOST}:{REDIS_PORT}/1')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

from celery.schedules import crontab
CELERY_BEAT_SCHEDULE = {
    'send-daily-debt-reminders': {
        'task': 'apps.debts.tasks.send_debt_reminders_task',
        'schedule': crontab(hour=9, minute=0),  # Har kuni ertalab 09:00 da
    },
}

# Eskiz.uz SMS Gateway Configuration
ESKIZ_EMAIL = env('ESKIZ_EMAIL', default='')
ESKIZ_PASSWORD = env('ESKIZ_PASSWORD', default='')
ESKIZ_FROM = env('ESKIZ_FROM', default='4546')
ESKIZ_IS_TEST = env.bool('ESKIZ_IS_TEST', default=True)

# OpenAPI / Swagger Documentation
SPECTACULAR_SETTINGS = {
    'TITLE': 'SotuvPro API',
    'DESCRIPTION': 'SotuvPro ko\'p-tenantli sklad, savdo va qarz nazorati tizimi REST & WebSocket API',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# CORS Configuration
CORS_ALLOW_ALL_ORIGINS = DEBUG
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:19006',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
])
