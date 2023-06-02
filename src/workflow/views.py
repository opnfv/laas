##############################################################################
# Copyright (c) 2018 Parker Berberian, Sawyer Bergeron, and others.
#
# All rights reserved. This program and the accompanying materials
# are made available under the terms of the Apache License, Version 2.0
# which accompanies this distribution, and is available at
# http://www.apache.org/licenses/LICENSE-2.0
##############################################################################


import json
from django.http import HttpResponse
from django.shortcuts import render
from laas_dashboard.settings import TEMPLATE_OVERRIDE
from workflow.forms import BookingMetaForm
import os
from api.views import talk_to_liblaas, get_ssh_key
from django.views.decorators.csrf import csrf_exempt
from booking.models import Booking
from datetime import timedelta
from django.utils import timezone

import logging
logger = logging.getLogger(__name__)


def create_booking(aggregate_id, user_id, booking_length):
    print("creating booking with params:")
    print(aggregate_id)
    print(user_id)
    print(booking_length)
    Booking.objects.create(
    id=aggregate_id,
    owner=user_id,
    start=timezone.now(),
    end=timezone.now() + timedelta(days=int(booking_length)),
    )

@csrf_exempt
def design_a_pod(request):
    if request.method == 'GET':
        if not request.user.is_authenticated:
            return render(request, "dashboard/login.html", {'title': 'Authentication Required'})
        template = "workflow/design_a_pod.html"
        context = {
            "dashboard": str(TEMPLATE_OVERRIDE),
            "liblaas_base_url": str(os.environ.get("LIBLAAS_BASE_URL"))
        }

        return render(request, template, context)
    if request.method == 'POST':
        return talk_to_liblaas(request)

    return HttpResponse(status=405)


@csrf_exempt
def book_a_pod(request):
    if request.method == 'GET':
        if not request.user.is_authenticated:
            return render(request, "dashboard/login.html", {'title': 'Authentication Required'})
        template = "workflow/book_a_pod.html"
        context = {
            "username": request.user,
            "form": BookingMetaForm(initial={}, user_initial=[], owner=request.user),
            "dashboard": str(TEMPLATE_OVERRIDE)
        }
        return render(request, template, context)
    if request.method == 'POST':
        post_data = json.loads(request.body)

        # post to dashboard instead of post_data contains the "destination" key
        if "destination" in post_data:
            print("posting to dashboard")
            print(post_data)
            if post_data["purpose"] == "ssh-key":
                return get_ssh_key(request)
            if post_data["purpose"] == "create-booking":
                booking_info = post_data["booking_info"]
                create_booking(booking_info["aggregate_id"], request.user, booking_info["booking_length"])
                return HttpResponse(status=200)
            return HttpResponse(status=404)

        print("posting to liblaas")
        return talk_to_liblaas(request)
    
    return HttpResponse(status=405)
