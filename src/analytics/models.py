##############################################################################
# Copyright (c) 2020 Sean Smith and others.
#
# All rights reserved. This program and the accompanying materials
# are made available under the terms of the Apache License, Version 2.0
# which accompanies this distribution, and is available at
# http://www.apache.org/licenses/LICENSE-2.0
##############################################################################

from django.db import models


class ActiveVPNUsers(models.Model):
    """ Keeps track of how many VPN Users are connected to Lab """
    time_stamp = models.DateTimeField(auto_now_add=True)
    active_users = models.IntegerField()
