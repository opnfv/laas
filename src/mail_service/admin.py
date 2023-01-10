from django.contrib import admin
from mail_service.models import EmailNotification, EmailQueue
# Register your models here.
admin.site.register(EmailNotification)
admin.site.register(EmailQueue)