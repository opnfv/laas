##############################################################################
# Copyright (c) 2016 Max Breitenfeldt and others.
# Copyright (c) 2018 Parker Berberian, Sawyer Bergeron, and others.
#
# All rights reserved. This program and the accompanying materials
# are made available under the terms of the Apache License, Version 2.0
# which accompanies this distribution, and is available at
# http://www.apache.org/licenses/LICENSE-2.0
##############################################################################


from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from booking.models import Booking
from dashboard.testing_utils import make_resource_template, make_user


class BookingModelTestCase(TestCase):
    """
    Test the Booking model.

    Creates all the scafolding needed and tests the Booking model
    """

    def setUp(self):
        """
        Prepare for Booking model tests.

        Creates all the needed models, such as users, resources, and configurations
        """
        self.owner = User.objects.create(username='owner')
        self.res1 = make_resource_template(name="Test template 1")
        self.res2 = make_resource_template(name="Test template 2")
        self.user1 = make_user(username='user1')

    def test_start_end(self):
        """
        Verify the start and end fields.

        if the start of a booking is greater or equal then the end,
        saving should raise a ValueException
        """
        start = timezone.now()
        end = start - timedelta(weeks=1)
        self.assertRaises(
            ValueError,
            Booking.objects.create,
            start=start,
            end=end,
            resource=self.res1,
            owner=self.user1,
        )
        end = start
        self.assertRaises(
            ValueError,
            Booking.objects.create,
            start=start,
            end=end,
            resource=self.res1,
            owner=self.user1,
        )

    def test_conflicts(self):
        """
        Verify conflicting dates are dealt with.

        saving an overlapping booking on the same resource
        should raise a ValueException
        saving for different resources should succeed
        """
        start = timezone.now()
        end = start + timedelta(weeks=1)
        self.assertTrue(
            Booking.objects.create(
                start=start,
                end=end,
                owner=self.user1,
                resource=self.res1,
            )
        )

        self.assertRaises(
            ValueError,
            Booking.objects.create,
            start=start,
            end=end,
            resource=self.res1,
            owner=self.user1,
        )

        self.assertRaises(
            ValueError,
            Booking.objects.create,
            start=start + timedelta(days=1),
            end=end - timedelta(days=1),
            resource=self.res1,
            owner=self.user1,
        )

        self.assertRaises(
            ValueError,
            Booking.objects.create,
            start=start - timedelta(days=1),
            end=end,
            resource=self.res1,
            owner=self.user1,
        )

        self.assertRaises(
            ValueError,
            Booking.objects.create,
            start=start - timedelta(days=1),
            end=end - timedelta(days=1),
            resource=self.res1,
            owner=self.user1,
        )

        self.assertRaises(
            ValueError,
            Booking.objects.create,
            start=start,
            end=end + timedelta(days=1),
            resource=self.res1,
            owner=self.user1,
        )

        self.assertRaises(
            ValueError,
            Booking.objects.create,
            start=start + timedelta(days=1),
            end=end + timedelta(days=1),
            resource=self.res1,
            owner=self.user1,
        )

        self.assertTrue(
            Booking.objects.create(
                start=start - timedelta(days=1),
                end=start,
                owner=self.user1,
                resource=self.res1,
            )
        )

        self.assertTrue(
            Booking.objects.create(
                start=end,
                end=end + timedelta(days=1),
                owner=self.user1,
                resource=self.res1,
            )
        )

        self.assertTrue(
            Booking.objects.create(
                start=start - timedelta(days=2),
                end=start - timedelta(days=1),
                owner=self.user1,
                resource=self.res1,
            )
        )

        self.assertTrue(
            Booking.objects.create(
                start=end + timedelta(days=1),
                end=end + timedelta(days=2),
                owner=self.user1,
                resource=self.res1,
            )
        )

        self.assertTrue(
            Booking.objects.create(
                start=start,
                end=end,
                owner=self.user1,
                resource=self.res2,
            )
        )

    def test_extensions(self):
        """
        Test booking extensions.

        saving a booking with an extended end time is allows to happen twice,
        and each extension must be a maximum of one week long
        """
        start = timezone.now()
        end = start + timedelta(weeks=1)
        self.assertTrue(
            Booking.objects.create(
                start=start,
                end=end,
                owner=self.user1,
                resource=self.res1,
            )
        )

        booking = Booking.objects.all().first()  # should be only thing in db

        self.assertEquals(booking.ext_count, 2)
        booking.end = booking.end + timedelta(days=3)
        try:
            booking.save()
        except Exception:
            self.fail("save() threw an exception")
