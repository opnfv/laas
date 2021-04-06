##############################################################################
# Copyright (c) 2020 Parker Berberian, Sawyer Bergeron, Sean Smith and others.
#
# All rights reserved. This program and the accompanying materials
# are made available under the terms of the Apache License, Version 2.0
# which accompanies this distribution, and is available at
# http://www.apache.org/licenses/LICENSE-2.0
##############################################################################
from booking.models import Booking
from resource_inventory.models import ResourceQuery
from datetime import datetime, timedelta
from collections import Counter
import pytz


class StatisticsManager(object):

    @staticmethod
    def getContinuousBookingTimeSeries(span=28):
        """
        Calculate Booking usage data points.

        Gathers all active bookings that fall in interval [(now - span), (now + 1 week)].
        x data points are every 12 hours
        y values are the integer number of bookings/users active at time
        """

        x = []
        y = []
        users = []
        projects = []

        now = datetime.now(pytz.utc)
        delta = timedelta(days=span)
        start = now - delta
        end = now + timedelta(weeks=1)

        bookings = Booking.objects.filter(
            start__lte=end,
            end__gte=start
        ).prefetch_related("collaborators")

        # get data
        while start <= end:
            active_users = 0

            books = bookings.filter(
                start__lte=start,
                end__gte=start
            ).prefetch_related("collaborators")

            for booking in books:
                active_users += booking.collaborators.all().count() + 1

            x.append(str(start.month) + '-' + str(start.day))
            y.append(books.count())
            users.append(active_users)

            start += timedelta(hours=12)

        in_use = len(ResourceQuery.filter(booked=True))
        not_in_use = len(ResourceQuery.filter(booked=False))

        projects = [x.project for x in bookings]
        proj_count = sorted(Counter(projects).items(), key=lambda x: x[1])

        project_keys = [proj[0] for proj in proj_count[-5:]]
        project_counts = [proj[1] for proj in proj_count[-5:]]

        return {
            "booking": [x, y],
            "user": [x, users],
            "utils": [in_use, not_in_use],
            "projects": [project_keys, project_counts]
        }
