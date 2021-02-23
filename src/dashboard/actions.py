###############################################################################
# Copyright (c) 2019 Parker Berberian, Sawyer Bergeron, and others.
#
# All rights reserved. This program and the accompanying materials
# are made available under the terms of the Apache License, Version 2.0
# which accompanies this distribution, and is available at
# http://www.apache.org/licenses/LICENSE-2.0
###############################################################################

from resource_inventory.models import ResourceQuery, Vlan
from account.models import Lab
from booking.models import Booking
from datetime import datetime
from django.core.exceptions import ObjectDoesNotExist
import pytz


def free_leaked_hosts():

    bundles = [booking.resource for booking in Booking.objects.filter(end__gt=datetime.now(pytz.utc))]
    active_hosts = set(ResourceQuery.filter(bundle__in=bundles))
    marked_hosts = set(ResourceQuery.filter(booked=True, working=True))

    for host in (marked_hosts - active_hosts):
        host.booked = False
        host.save()

        try:
            book = Booking.objects.get(resource=host.bundle)
            book.resource = None
            book.save()
        except ObjectDoesNotExist:
            pass

    print("released {} hosts".format(len(marked_hosts - active_hosts)))


def free_leaked_public_vlans():

    for lab in Lab.objects.all():
        booked_interfaces = set([
            iface
            for host in ResourceQuery.filter(booked=True, lab=lab)
            for iface in host.interfaces.all()
        ])

        in_use_vlans = Vlan.objects.filter(
            interfaces__in=booked_interfaces).distinct('vlan_id')

        manager = lab.vlan_manager

        for vlan in Vlan.objects.all():
            if vlan not in in_use_vlans:
                if vlan.public:
                    manager.release_public_vlan(vlan.vlan_id)
                manager.release_vlans(vlan)
