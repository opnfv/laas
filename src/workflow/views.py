##############################################################################
# Copyright (c) 2018 Parker Berberian, Sawyer Bergeron, and others.
#
# All rights reserved. This program and the accompanying materials
# are made available under the terms of the Apache License, Version 2.0
# which accompanies this distribution, and is available at
# http://www.apache.org/licenses/LICENSE-2.0
##############################################################################

from django.shortcuts import render
from laas_dashboard.settings import TEMPLATE_OVERRIDE
from django.http import HttpResponse


def no_workflow(request):
    return render(request, 'workflow/no_workflow.html', {'title': "Not Found"}, status=404)


def login(request):
    return render(request, "dashboard/login.html", {'title': 'Authentication Required'})

def design_a_pod_view(request):
    if request.method == "GET":
        if not request.user.is_authenticated:
            return login(request)
        template = "workflow/design_a_pod.html"
        context = {
            "dashboard": str(TEMPLATE_OVERRIDE)
        }
        return render(request, template, context)
    
    if request.method == "POST":
        pass # todo - call an API endpoint on liblaas

    return HttpResponse(status=405)
