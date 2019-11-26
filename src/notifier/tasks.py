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
from booking.models import Booking
from notifier.models import Emailed
from notifier.manager import NotificationHandler


@shared_task
def notify_expiring():
    """
    Notify users if their booking is within 48 hours of expiring.
    """
    # Expiring within 48 hours
    expire_time = timezone.now() + timezone.timedelta(hours=48)
    # Don't email people about bookings that have started recently
    start_time = timezone.now() + timezone.timedelta(hours=12)
    bookings = Booking.objects.filter(end__gt=timezone.now(),
        end__lte=expire_time,
        start__gte=start_time)
    for booking in bookings:
        if Emailed.objects.filter(almost_end_booking=booking).exists():
            continue
        NotificationHandler.notify_booking_expiring(booking)
        Emailed.objects.create(almost_end_booking=booking)
