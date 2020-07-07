##############################################################################
# Copyright (c) 2020 Sean Smith and others.
#
# All rights reserved. This program and the accompanying materials
# are made available under the terms of the Apache License, Version 2.0
# which accompanies this distribution, and is available at
# http://www.apache.org/licenses/LICENSE-2.0
##############################################################################
from booking.models import Booking
from datetime import datetime, timedelta
import pytz

from resource_inventory.models import (
    CpuProfile,
    ResourceQuery
)

from collections import Counter


class StatisticsManager(object):

    @staticmethod
    def getContinuousBookingTimeSeries(span=28):
        """
        This function drives the analytics board.

        First this calculates statistics that are static in the time period.
        Second it calcalulates active bookings and active users.

        Gathers all active bookings that fall in interval [(now - span), (now + 1 week)].
        x data points are every 12 hours
        y values are the integer number of bookings/users active at time
        """

        x = []
        y = []
        users = []

        now = datetime.now(pytz.utc)
        delta = timedelta(days=365)
        start = now - delta
        end = now + timedelta(weeks=1)

        bookings = Booking.objects.filter(
            start__lte=end,
            end__gte=start
        )

        while start <= end:
            bookings = Booking.objects.filter(
                start__lte=start,
                end__gte=start
            ).prefetch_related("collaborators")

            active_users = StatisticsManager.current_users(bookings)

            bundles = [book.resource for book in bookings]
            resources = [ResourceQuery.filter(bundle=bundle) for bundle in bundles]

            arch_dict = StatisticsManager.hosts_booked(bookings, resources)
            hosts = StatisticsManager.hosts_per_booking(bookings, resources)

            x.append(str(start))
            y.append(bookings.count())
            users.append(active_users)

            start += timedelta(hours=12)

        return {"booking": [x, y], "user": [x, users]}

    @staticmethod
    def current_users(bookings):
        active_users = 0
        for booking in bookings:
            active_users += booking.collaborators.all().count() + 1
        return active_users

    @staticmethod
    def hosts_booked(bookings, resources):
        """ Find how many of each architecture is booked """
        flat_resources = [resource for booking in resources for resource in booking]

        active_x86 = 0
        for resource in flat_resources:
            active_x86 += CpuProfile.objects.filter(
                architecture='x86_64',
                host=resource.profile
            ).count()

        active_arm = len(flat_resources) - active_x86

        return {'x86 Servers': active_x86, 'arm Servers': active_arm}

    @staticmethod
    def hosts_per_booking(bookings, resources):
        """ Get number of hosts in a booking for all bookings"""
        return [len(book) for book in resources]

    @staticmethod
    def collaborators_per_booking(bookings):
        """ Get number of collaborators for bookings """
        return [book.collaborators.all().count() for book in bookings]

    @staticmethod
    def user_count_bookings(bookings):
        """ Find how many bookings each user has open """
        return dict(Counter([book.owner for book in bookings]))
