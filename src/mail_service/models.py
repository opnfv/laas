from django.db import models
# Create your models here.

class EmailNotification(models.Model):
    sent = models.BooleanField(default=False)
    title = models.CharField(max_length=150)
    message = models.TextField()
    recipient = models.CharField(max_length=300)
    booking_id = models.DecimalField(max_digits=6, decimal_places=0)

    def __str__(self):
        return "Email Notification Object for " + self.recipient + " (" + str(self.booking_id) + ")"

class EmailQueue(models.Model):
    email = models.OneToOneField(EmailNotification, on_delete=models.CASCADE, null=True)
