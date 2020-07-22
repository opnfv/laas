##############################################################################
# Copyright (c) 2020 Sean Smith and others
#
# All rights reserved. This program and the accompanying materials
# are made available under the terms of the Apache License, Version 2.0
# which accompanies this distribution, and is available at
# http://www.apache.org/licenses/LICENSE-2.0
##############################################################################
from django.db import models
from account.models import Lab


class ActiveVPNUsers(models.Model):
    """ Time series on number of users connected to lab """
    time_stamp = models.DateTimeField()
    active_users = models.IntegerField()
    lab = models.ForeignKey(Lab, on_delete=models.DO_NOTHING)
