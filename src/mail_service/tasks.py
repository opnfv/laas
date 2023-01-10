##############################################################################
# Copyright (c) 2016 Max Breitenfeldt and others.
# Copyright (c) 2018 Parker Berberian, Sawyer Bergeron, and others.
#
# All rights reserved. This program and the accompanying materials
# are made available under the terms of the Apache License, Version 2.0
# which accompanies this distribution, and is available at
# http://www.apache.org/licenses/LICENSE-2.0
##############################################################################


from celery import shared_task
from django.utils import timezone
from django.conf import settings
from booking.models import Booking
from mail_service.models import EmailNotification
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.core.mail import EmailMultiAlternatives
from notifier.manager import NotificationHandler
from mail_service.models import EmailQueue
from account.models import UserProfile
import os



def create_emails_for_booking(booking_id: int, step: str):
    """
    Creates email objects for a booking based on the step.
    Returns the list of email objects that were created.
    Valid steps: "new_booking", "expiring_booking", "end_booking"
    """
    booking = Booking.objects.get(id=booking_id)
    emails = []
    subjects = ["You have a new booking", "Your booking is expiring", "Your booking has expired"]
    templates= ["mail_service/new_booking.html", "mail_service/expiring_booking.html", "mail_service/end_booking.html"]
    dashboard_url = os.environ.get("DASHBOARD_URL", "<Dashboard url>")

    if step == "new_booking":
        index = 0
    elif step == "expiring_booking":
        index = 1
    elif step == "end_booking":
        index = 2
    else:
        raise ValueError

    # Make email for owner
    context = {'booking': booking, 'owner': True, "dashboard_url": dashboard_url, "is_email": True}
    title = subjects[index] + " (" + str(booking_id) + ")"
    message = render_to_string(templates[index], context)
    # recipient = booking.owner.userprofile.email
    user_profile = UserProfile.objects.get(user=booking.owner)
    if user_profile:
        recipient = user_profile.email_addr
    else:
        recipient = ""
    owner_email = EmailNotification.objects.create(sent=False, title=title, message=message, recipient=recipient, booking_id=booking.id)
    emails.append(owner_email)

    # Make emails for collaborators
    users = list(booking.collaborators.all())
    for user in users:
        context = {'booking': booking, 'owner': False, 'dashboard_url': dashboard_url, "is_email": True}
        title = subjects[index] + " (" + str(booking_id) + ")"
        message = render_to_string(templates[index], context)
        # recipient = user.userprofile.email
        user_profile = UserProfile.objects.get(user=user)
        if user_profile:
            recipient = user_profile.email_addr
        else:
            recipient = ""

        collab_email = EmailNotification.objects.create(sent=False, title=title, message=message, recipient=recipient, booking_id=booking.id)
        emails.append(collab_email)
    return emails

def send_email(email_notification: EmailNotification):
    """
    Sends the email to the recipient field of the object and marks as read
    Param: EmailNotification object
    """
    subject = email_notification.title
    from_address = settings.DEFAULT_EMAIL_FROM
    to_address = [email_notification.recipient]

    html_content = email_notification.message
    text_content = strip_tags(html_content)

    email = EmailMultiAlternatives(subject, text_content, from_address, to_address)
    email.attach_alternative(html_content, "text/html")
    email.send()
    email_notification.sent = True
    email_notification.save()

@shared_task
def process_expiring_bookings():
    """Create email objects and notify users on the dashboard if their booking is within 48 hours of expiring."""
    expire_time = timezone.now() + timezone.timedelta(hours=settings.EXPIRE_HOURS)
    # Don't email people about bookings that have started recently
    start_time = timezone.now() - timezone.timedelta(hours=settings.EXPIRE_LIFETIME)
    bookings = Booking.objects.filter(
        emailed_expiring=False, 
        end__lte=expire_time,
        start__lte=start_time
        )

    for booking in bookings:
        NotificationHandler.notify_booking_expiring(booking)
        emails = create_emails_for_booking(booking.id, "expiring_booking")
        for email in emails:
            EmailQueue.objects.create(email=email)
        booking.emailed_expiring = True
        booking.save()

@shared_task
def send_queued_emails():
    """Send and delete each queued email"""
    emails = EmailQueue.objects.all()
    for email_queue in emails:
        send_email(email_queue.email)
        email_queue.delete()

