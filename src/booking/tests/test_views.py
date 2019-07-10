##############################################################################
# Copyright (c) 2018 Parker Berberian, Sawyer Bergeron, and others.
#
# All rights reserved. This program and the accompanying materials
# are made available under the terms of the Apache License, Version 2.0
# which accompanies this distribution, and is available at
# http://www.apache.org/licenses/LICENSE-2.0
##############################################################################

from django.test import TestCase, Client
from django.contrib import messages
from dashboard.testing_utils import make_user


class QuickBookingURLTestCase(TestCase):

    @classmethod
    def setUpTestData(cls):
        cls.client = Client()
        cls.user = make_user(username="name", password="password")

    def test_get(self):
        self.client.login(username="name", password="password")
        response = self.client.get("/booking/quick/")
        self.assertEqual(response.status_code, 200)
        template_names = [t.name for t in response.templates]
        self.assertIn('booking/quick_deploy.html', template_names)

    def test_post(self):
        """
        view should accept the bad post request
        and give an error message to the user
        """
        self.client.login(username="name", password="password")
        response = self.client.post("/booking/quick/")  # empty post, should fail
        self.assertEqual(response.status_code, 200)
        msgs = response.context['messages']
        print([m for m in msgs])
        error_messages = [m for m in msgs if m.level == messages.ERROR]
        self.assertNotEqual(error_messages, [])
