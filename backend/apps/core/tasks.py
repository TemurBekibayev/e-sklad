import logging
try:
    from celery import shared_task
except ImportError:
    def shared_task(func):
        return func
from django.core.management import call_command

logger = logging.getLogger(__name__)

@shared_task
def check_subscriptions_task():
    logger.info('Executing check_subscriptions_task...')
    call_command('check_subscriptions')
    logger.info('check_subscriptions_task completed.')
