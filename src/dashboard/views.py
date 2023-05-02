##############################################################################
# Copyright (c) 2016 Max Breitenfeldt and others.
# Copyright (c) 2018 Parker Berberian, Sawyer Bergeron, and others.
#
# All rights reserved. This program and the accompanying materials
# are made available under the terms of the Apache License, Version 2.0
# which accompanies this distribution, and is available at
# http://www.apache.org/licenses/LICENSE-2.0
##############################################################################


import json
import os
from django.shortcuts import get_object_or_404
from django.views.generic import TemplateView
from django.shortcuts import render
from django.db.models import Q
from django.http import HttpResponse

from datetime import datetime
import pytz
import requests

from account.models import Lab
from booking.models import Booking

from resource_inventory.models import Image, ResourceProfile, ResourceQuery
from workflow.workflow_manager import ManagerTracker

from laas_dashboard import settings


def lab_list_view(request) -> HttpResponse:
    labs = Lab.objects.all()
    context = {"labs": labs, 'title': ''}

    return render(request, "dashboard/lab_list.html", context)


def lab_detail_view(request, lab_name) -> HttpResponse:
    liblaas_base_url = os.environ.get("LIBLAAS_BASE_URL")

    # Hard coded until liblaas supports the concept of a lab
    lab = {
        "name": "UNH IOL",
        "location" : "University of New Hampshire, Durham NH, 03824 USA",
        "contact_email" : "nfv-lab@iol.unh.edu",
        "status": 0
    }

    # image list removed until endpoint for liblaas is created
    # images = Image.objects.filter(from_lab=lab).filter(public=True)

    hosts = json.loads(requests.get(liblaas_base_url + "booking/hosts/all").text)
    flavors = json.loads(requests.get(liblaas_base_url + "flavor/").text)
    print(flavors)

    return render(
        request,
        "dashboard/lab_detail.html",
        {
            'title': "Lab Overview",
            'lab': lab,
            'flavors': flavors,
            # 'images': images,
            'hosts': hosts
        }
    )


def host_profile_detail_view(request) -> HttpResponse:

    return render(
        request,
        "dashboard/host_profile_detail.html",
        {
            'title': "Host Types",
        }
    )


def landing_view(request) -> HttpResponse:
    manager = ManagerTracker.managers.get(request.session.get('manager_session'))
    user = request.user
    if not user.is_anonymous:
        bookings = Booking.objects.filter(
            Q(owner=user) | Q(collaborators=user),
            end__gte=datetime.now(pytz.utc)
        )
    else:
        bookings = None

    LFID = True if settings.AUTH_SETTING == 'LFID' else False
    return render(
        request,
        'dashboard/landing.html',
        {
            'manager': manager is not None,
            'title': "Welcome to the Lab as a Service Dashboard",
            'bookings': bookings,
            'LFID': LFID
        }
    )


class LandingView(TemplateView):
    template_name = "dashboard/landing.html"

    def get_context_data(self, **kwargs) -> dict:
        context = super(LandingView, self).get_context_data(**kwargs)

        hosts = []

        for host_profile in ResourceProfile.objects.all():
            name = host_profile.name
            description = host_profile.description
            in_labs = host_profile.labs

            interfaces = host_profile.interfaceprofile
            storage = host_profile.storageprofile
            cpu = host_profile.cpuprofile
            ram = host_profile.ramprofile

            host = (name, description, in_labs, interfaces, storage, cpu, ram)
            hosts.append(host)

        context.update({'hosts': hosts})

        return context
