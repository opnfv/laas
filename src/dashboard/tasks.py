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
from notifier.manager import NotificationHandler



@shared_task
def booking_poll():
    def cleanup_resource_task(qs):
        # todo
        pass

    def cleanup_software(qs):
        # todo
        pass

    def cleanup_access(qs):
        # todo
        pass

    pass


@shared_task
def free_hosts():
    pass
