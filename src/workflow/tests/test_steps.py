##############################################################################
# Copyright (c) 2018 Parker Berberian, Sawyer Bergeron, and others.
#
# All rights reserved. This program and the accompanying materials
# are made available under the terms of the Apache License, Version 2.0
# which accompanies this distribution, and is available at
# http://www.apache.org/licenses/LICENSE-2.0
##############################################################################

"""
This file tests basic functionality of each step class
More in depth case coverage of WorkflowStep.post() must happen elsewhere.
"""

import json
from unittest import SkipTest

from django.test import TestCase, RequestFactory
from django.contrib.auth.models import User

from account.models import UserProfile
from workflow import resource_bundle_workflow
from workflow import booking_workflow
from workflow import sw_bundle_workflow
from workflow.models import Repository
from workflow.tests import test_fixtures


class StepTestCase(TestCase):

    # after setUp is called, this should be an instance of a step
    step = None

    post_data = {}  # subclasses will set this

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.factory = RequestFactory()
        cls.user = User.objects.create(
            username="test_user", email="e@mail.com", password="pswd")
        UserProfile.objects.create(
            user=cls.user, oauth_token="tok", oauth_secret="sec")

    def setUp(self):
        super().setUp()
        if self.step is None:
            raise SkipTest("Step instance not given")
        self.step = self.step(1, Repository())

    def assertCorrectPostBehavior(self, post_data):
        """
        allows subclasses to override and make assertions about
        the side effects of self.step.post()
        post_data is the data passed into post()
        """
        return

    def assertValidHtml(self, html_str):
        """
        This method should make sure that html_str is a valid
        html fragment.
        However, I know of no good way of doing this in python
        """
        self.assertTrue(isinstance(html_str, str))
        self.assertGreater(len(html_str), 0)

    def test_render_to_string(self):
        request = self.factory.get("/workflow/manager/")
        request.user = self.user
        response_html = self.step.render_to_string(request)
        self.assertValidHtml(response_html)

    def test_post(self, data=None):
        post_data = data or self.post_data
        self.step.post(post_data, self.user)
        self.assertCorrectPostBehavior(data)


class SelectStepTestCase(StepTestCase):
    # ID of model to be sent to the step's form
    # can be an int or a list of ints
    obj_id = -1

    def setUp(self):
        super().setUpClass()

        try:
            iter(self.obj_id)
        except TypeError:
            self.obj_id = [self.obj_id]

        field_data = json.dumps(self.obj_id)
        self.post_data = {
            "searchable_select": [field_data]
        }


class DefineHardwareTestCase(StepTestCase):
    step = resource_bundle_workflow.Define_Hardware
    post_data = {
        "filter_field": {
            "lab": {
                "lab_35": {"selected": True, "id": 35}},
            "host": {
                "host_1": {"selected": True, "id": 1}}
        }
    }


class DefineNetworkTestCase(StepTestCase):
    step = resource_bundle_workflow.Define_Nets
    post_data = {"xml": test_fixtures.MX_GRAPH_MODEL}


class ResourceMetaTestCase(StepTestCase):
    step = resource_bundle_workflow.Resource_Meta_Info
    post_data = {
        "bundle_name": "my_bundle",
        "bundle_description": "My Bundle"
    }


class BookingResourceTestCase(StepTestCase):
    step = booking_workflow.Booking_Resource_Select

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.obj_id = GenericResourceBundle.objects.create
    post_data = {
        "searchable_select": ["[34]"]  # might need to create and check ID
    }


class SoftwareSelectTestCase(StepTestCase):
    step = booking_workflow.SWConfig_Select
    post_data = {
        "searchable_select": ["[34]"]  # might need to create and check ID
    }


class OPNFVSelectTestCase(StepTestCase):
    step = booking_workflow.OPNFV_Select
    post_data = {
        "searchable_select": ["[34]"]  # might need to create and check ID
    }


class BookingMetaTestCase(StepTestCase):
    step = booking_workflow.Booking_Meta
    post_data = {
        "length": 14,
        "purpose": "Testing",
        "project": "Lab as a Service",
        "users": ["[34]"]
    }


class ConfigResourceSelectTestCase(StepTestCase):
    step = sw_bundle_workflow.SWConf_Resource_Select
    post_data = {
        "searchable_select": ["[34]"]  # might need to create and check ID
    }


class DefineSoftwareTestCase(StepTestCase):
    step = sw_bundle_workflow.Define_Software
    post_data = {
    }  # TODO: formset


class ConfigSoftwareTestCase(StepTestCase):
    step = sw_bundle_workflow.Config_Software
    post_data = {
        "name": "config_bundle",
        "description": "My Config Bundle"
    }
