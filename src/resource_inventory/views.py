##############################################################################
# Copyright (c) 2018 Sawyer Bergeron, Parker Berberian, and others.
#
# All rights reserved. This program and the accompanying materials
# are made available under the terms of the Apache License, Version 2.0
# which accompanies this distribution, and is available at
# http://www.apache.org/licenses/LICENSE-2.0
##############################################################################


import json
import os
from django.views.generic import TemplateView
from django.shortcuts import get_object_or_404
from django.shortcuts import render
import requests

from resource_inventory.models import ResourceProfile, ResourceQuery


class HostView(TemplateView):
    template_name = "resource/hosts.html"

    def get_context_data(self, **kwargs):
        context = super(HostView, self).get_context_data(**kwargs)
        liblaas_base_url = os.environ.get("LIBLAAS_BASE_URL")
        hosts = json.loads(requests.get(liblaas_base_url + "booking/hosts/all").text)
        context.update({'hosts': hosts, 'title': "Hardware Resources"})
        return context


def hostprofile_detail_view(request, flavor_id):

    liblaas_base_url = os.environ.get("LIBLAAS_BASE_URL")
    flavor = json.loads(requests.get(liblaas_base_url + "flavor/name/" + flavor_id + "/").text)
    print(flavor)
    return render(
        request,
        "resource/hostprofile_detail.html",
        {
            'title': "Host Type: " + str(flavor["name"]),
            'flavor': flavor
        }
    )
