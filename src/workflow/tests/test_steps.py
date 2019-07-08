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
from dashboard.testing_utils import make_lab, make_user, make_os, make_complete_host_profile, make_opnfv_role, make_image, make_grb, make_config_bundle, make_host, make_user_profile
from workflow import resource_bundle_workflow
from workflow import booking_workflow
from workflow import sw_bundle_workflow
from workflow.models import Repository
from workflow.tests import test_fixtures


class TestConfig(object):
    """
    Basic class to instantiate and hold reference
    to models we will need often
    """
    def __init__(self, usr=None):
        self.lab = make_lab()
        self.user = usr or make_user()
        self.os = make_os()
        self.host_prof = make_complete_host_profile(self.lab)
        self.host = make_host(self.host_prof, self.lab, name="host1")

        # pod description as required by testing lib
        self.topology = {
            "host1": {
                "type": self.host_prof,
                "role": make_opnfv_role(),
                "image": make_image(self.lab, 3, self.user, self.os, self.host_prof),
                "nets": [
                    [{"name": "public", "tagged": True, "public": True}]
                ]
            }
        }


class StepTestCase(TestCase):

    # after setUp is called, this should be an instance of a step
    step = None

    post_data = {}  # subclasses will set this

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.factory = RequestFactory()
        cls.user_prof = make_user_profile()
        cls.user = cls.user_prof.user

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
        super().setUp()

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
    def setUpTestData(cls):
        super().setUpTestData()
        conf = TestConfig(usr=cls.user)
        cls.obj_id = make_grb(conf.topology, conf.user, conf.lab).id


class SoftwareSelectTestCase(StepTestCase):
    step = booking_workflow.SWConfig_Select

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        conf = TestConfig(usr=cls.user)
        grb = make_grb(conf.topology, conf.user, conf.lab)
        host_map = {"host1": conf.host}
        cls.obj_id = make_config_bundle(grb, conf.user, conf.topology, host_map).id


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
