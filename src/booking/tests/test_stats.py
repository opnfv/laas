##############################################################################
# Copyright (c) 2018 Parker Berberian, Sawyer Bergeron, and others.
#
# All rights reserved. This program and the accompanying materials
# are made available under the terms of the Apache License, Version 2.0
# which accompanies this distribution, and is available at
# http://www.apache.org/licenses/LICENSE-2.0
##############################################################################
import pytz
from datetime import timedelta, datetime

from django.test import TestCase, Client

from booking.models import Booking
from booking.stats import StatisticsManager as sm
from dashboard.testing_utils import make_user


class StatsTestCases(TestCase):

    def test_no_bookings(self):
        expected = {"booking": [[], []], "user": [[], []]}
        actual = sm.getContinuousBookingTimeSeries()

        self.assertEqual(actual, expected)

    # make sure booking outside span is not included

    def test_no_booking_outside_span(self):
        now = datetime.now(pytz.utc)
        time_list = [timedelta(days=x * 5 + 1) + now for x in range(4)]

        bad_date = now + timedelta(days=1200)
        Booking.objects.create(start=now, end=bad_date, owner=make_user(username='jj'))

        for time in time_list:

            Booking.objects.create(
                start=now,
                end=time,
                owner=make_user(username='a')
            )

        actual = sm.getContinuousBookingTimeSeries()
        dates = actual['booking'][0]

        for date in dates:
            self.assertNotEqual(date, bad_date)

    def test_all_dates_in_range(self):
        now = datetime.now(pytz.utc)
        spa = 30
        expected_dates = []

        for i in range(0, 10000):
            Booking.objects.create(
                start=now + timedelta(hours=i),
                end=now + timedelta(days=i),
                owner=make_user(username=str(i))
            )
            expected_dates.append(now + timedelta(hours=i))

        for span in range(1, 30):
            actual = sm.getContinuousBookingTimeSeries(span)
            dates = actual['booking'][0]

            for date in dates:
                if date > now + timedelta(days=span):
                    self.assertNotIn(date, expected_dates)
