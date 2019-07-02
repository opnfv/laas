##############################################################################
# Copyright (c) 2018 Parker Berberian, Sawyer Bergeron, and others.
#
# All rights reserved. This program and the accompanying materials
# are made available under the terms of the Apache License, Version 2.0
# which accompanies this distribution, and is available at
# http://www.apache.org/licenses/LICENSE-2.0
##############################################################################


from django.http import HttpResponse, JsonResponse, HttpResponseRedirect
from django.shortcuts import render
from django.urls import reverse

import uuid

from workflow.workflow_manager import ManagerTracker, SessionManager
from booking.models import Booking

import logging
logger = logging.getLogger(__name__)


def attempt_auth(request):
    try:
        manager = ManagerTracker.managers[request.session['manager_session']]

        return manager

    except KeyError:
        return None


def get_redirect_response(result):
    if not result:
        return {}

    # need to get type of result, and switch on the type
    # since has_result, result must be populated with a valid object
    if isinstance(result, Booking):
        return {
            'redir_url': reverse('booking:booking_detail', kwargs={'booking_id': result.id})
        }
    else:
        return {}


def delete_session(request):
    manager = attempt_auth(request)

    if not manager:
        return no_workflow(request)

    not_last_workflow, result = manager.pop_workflow()

    if not_last_workflow:  # this was not the last workflow, so don't redirect away
        return JsonResponse({})
    else:
        del ManagerTracker.managers[request.session['manager_session']]
        return JsonResponse(get_redirect_response(result))


def add_workflow(request):
    manager = attempt_auth(request)
    if not manager:
        return no_workflow(request)
    try:
        workflow_type = int(request.POST.get('workflow_type'))
    except ValueError:
        return HttpResponse(status=400)

    manager.add_workflow(workflow_type=workflow_type)
    return manager.render(request)  # do we want this?


def cancel_workflow(request):
    manager = attempt_auth(request)
    if not manager:
        return no_workflow(request)

    if not manager.pop_workflow():
        del ManagerTracker.managers[request.session['manager_session']]


def manager_view(request):
    manager = attempt_auth(request)
    if not manager:
        return no_workflow(request)

    return manager.handle_request(request)


def viewport_view(request):
    print("viewport view")
    if not request.user.is_authenticated:
        return login(request)

    print("viewport view2")
    manager = attempt_auth(request)
    if manager is None:
        return no_workflow(request)

    print("viewport view3")
    if request.method != 'GET':
        return HttpResponse(status=405)
    return render(request, 'workflow/viewport-base.html')


def create_workflow(request):
    if request.method != 'POST':
        return HttpResponse(status=405)
    workflow_type = request.POST.get('workflow_type', None)
    try:
        workflow_type = int(workflow_type)
    except Exception:
        return HttpResponse(status=400)
    mgr_uuid = create_session(workflow_type, request=request,)
    request.session['manager_session'] = mgr_uuid
    return HttpResponse()


def create_session(wf_type, request):
    smgr = SessionManager(request=request)
    smgr.add_workflow(workflow_type=wf_type, target_id=request.POST.get("target"))
    manager_uuid = uuid.uuid4().hex
    ManagerTracker.getInstance().managers[manager_uuid] = smgr

    return manager_uuid


def no_workflow(request):
    return render(request, 'workflow/no_workflow.html', {'title': "Not Found"}, status=404)


def login(request):
    return render(request, "dashboard/login.html", {'title': 'Authentication Required'})
