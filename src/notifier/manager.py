##############################################################################
# Copyright (c) 2018 Parker Berberian, Sawyer Bergeron and others.
# Copyright (c) 2020 Sawyer Bergeron, Sean Smith, and others.
#
# All rights reserved. This program and the accompanying materials
# are made available under the terms of the Apache License, Version 2.0
# which accompanies this distribution, and is available at
# http://www.apache.org/licenses/LICENSE-2.0
##############################################################################
from notifier.models import Notification

from django.template.loader import render_to_string
from django.utils import timezone


class NotificationHandler(object):

    @classmethod
    def notify_new_booking(cls, booking):
        template = "notifier/new_booking.html"
        titles = ["You have a new booking (" + str(booking.id) + ")", "You have been added to a booking (" + str(booking.id) + ")"]
        cls.booking_notify(booking, template, titles)

    @classmethod
    def notify_booking_end(cls, booking):
        template = "notifier/end_booking.html"
        titles = ["Your booking (" + str(booking.id) + ") has ended", "A booking (" + str(booking.id) + ") that you collaborate on has ended"]
        cls.booking_notify(booking, template, titles)

    @classmethod
    def notify_booking_expiring(cls, booking):
        template = "notifier/expiring_booking.html"
        titles = ["Your booking (" + str(booking.id) + ") is about to expire", "A booking (" + str(booking.id) + ") that you collaborate on is about to expire"]
        cls.booking_notify(booking, template, titles)

    @classmethod
    def booking_notify(cls, booking, template, titles):
        """
        Create a notification for a booking owner and collaborators using the template.

        titles is a list - the first is the title for the owner's notification,
            the last is the title for the collaborators'
        """
        owner_notif = Notification.objects.create(
            title=titles[0],
            content=render_to_string(
                template,
                context={
                    "booking": booking,
                    "owner": True
                }
            )
        )
        owner_notif.recipients.add(booking.owner.userprofile)
        if not booking.collaborators.all().exists():
            return  # no collaborators - were done

        collab_notif = Notification.objects.create(
            title=titles[-1],
            content=render_to_string(
                template,
                context={
                    "booking": booking,
                    "owner": False
                }
            )
        )
        for c in booking.collaborators.all():
            collab_notif.recipients.add(c.userprofile)
