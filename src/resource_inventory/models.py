##############################################################################
# Copyright (c) 2018 Sawyer Bergeron, Parker Berberian, and others.
# Copyright (c) 2020 Sawyer Bergeron, Sean Smith, others.
#
# All rights reserved. This program and the accompanying materials
# are made available under the terms of the Apache License, Version 2.0
# which accompanies this distribution, and is available at
# http://www.apache.org/licenses/LICENSE-2.0
############################################################################################################################################################
# Copyright (c) 2018 Sawyer Bergeron, Parker Berberian, and others.
# Copyright (c) 2020 Sawyer Bergeron, Sean Smith, others.
#
# All rights reserved. This program and the accompanying materials
# are made available under the terms of the Apache License, Version 2.0
# which accompanies this distribution, and is available at
# http://www.apache.org/licenses/LICENSE-2.0
##############################################################################

from django.contrib.auth.models import User

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
import traceback
import json

import re
from collections import Counter

from account.models import Lab
from dashboard.utils import AbstractModelQuery

"""
Profiles of resources hosted by labs.

These describe hardware attributes of the different Resources a lab hosts.
A single Resource subclass (e.g. Server) may have instances that point to different
Profile models (e.g. an x86 server profile and armv8 server profile.
"""


# class ResourceProfile(models.Model):
#     pass


# class InterfaceProfile(models.Model):
#     pass


# class DiskProfile(models.Model):
#     pass


# class CpuProfile(models.Model):
#     pass


# class RamProfile(models.Model):
#     pass


# """
# Resource Models

# These models represent actual hardware resources
# with varying degrees of abstraction.
# """


# class CloudInitFile(models.Model):
#     pass


# class ResourceTemplate(models.Model):
#     pass


# class ResourceBundle(models.Model):
#     pass


# class ResourceConfiguration(models.Model):
#     pass


def get_default_remote_info():
    pass


# class Resource(models.Model):
#     pass


# class RemoteInfo(models.Model):
#     pass


# class Server(Resource):
#     pass



# class Opsys(models.Model):
#     pass

# class Image(models.Model):
#     pass

# """
# Networking configuration models
# """


# class Network(models.Model):
#     pass


# class PhysicalNetwork(models.Model):
#     pass


# class NetworkConnection(models.Model):
#     pass


# class Vlan(models.Model):
#     pass


# class InterfaceConfiguration(models.Model):
#     pass


# """
# OPNFV / Software configuration models
# """


# class Scenario(models.Model):
#     pass


# class Installer(models.Model):
#     pass


# class NetworkRole(models.Model):
#     pass



# class OPNFVConfig(models.Model):
#     pass


# class OPNFVRole(models.Model):
#     pass


# class ResourceOPNFVConfig(models.Model):
#     pass


# class Interface(models.Model):
#     pass

# Needs to stay so the migrations can be happy
def get_sentinal_opnfv_role():
    pass
