##############################################################################
# Copyright (c) 2016 Max Breitenfeldt and others.
# Copyright (c) 2018 Parker Berberian, Sawyer Bergeron, and others.
#
# All rights reserved. This program and the accompanying materials
# are made available under the terms of the Apache License, Version 2.0
# which accompanies this distribution, and is available at
# http://www.apache.org/licenses/LICENSE-2.0
##############################################################################


from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect
from django.utils.decorators import method_decorator
from django.utils import timezone
from django.views import View
from django.http import QueryDict
from django.http.response import JsonResponse, HttpResponse
from rest_framework import viewsets
from rest_framework.authtoken.models import Token
from django.views.decorators.csrf import csrf_exempt
from django.core.exceptions import ObjectDoesNotExist

from api.serializers.booking_serializer import BookingSerializer
from api.serializers.old_serializers import UserSerializer
from api.forms import DowntimeForm
from account.models import UserProfile
from booking.models import Booking
from api.models import LabManagerTracker, get_task, Job
from notifier.manager import NotificationHandler
from analytics.models import ActiveVPNUser
from resource_inventory.models import (
    Image,
    Opsys,
    CloudInitFile,
)

import json

"""
API views.

All functions return a Json blob
Most functions that deal with info from a specific lab (tasks, host info)
requires the Lab auth token.
    for example, curl -H auth-token:mylabsauthtoken url

Most functions let you GET or POST to the same endpoint, and
the correct thing will happen
"""


class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer
    filter_fields = ('resource', 'id')


class UserViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all()
    serializer_class = UserSerializer


@method_decorator(login_required, name='dispatch')
class GenerateTokenView(View):
    def get(self, request, *args, **kwargs):
        user = self.request.user
        token, created = Token.objects.get_or_create(user=user)
        if not created:
            token.delete()
            Token.objects.create(user=user)
        return redirect('account:settings')


def lab_inventory(request, lab_name=""):
    lab_token = request.META.get('HTTP_AUTH_TOKEN')
    lab_manager = LabManagerTracker.get(lab_name, lab_token)
    return JsonResponse(lab_manager.get_inventory(), safe=False)


@csrf_exempt
def lab_host(request, lab_name="", host_id=""):
    lab_token = request.META.get('HTTP_AUTH_TOKEN')
    lab_manager = LabManagerTracker.get(lab_name, lab_token)
    if request.method == "GET":
        return JsonResponse(lab_manager.get_host(host_id), safe=False)
    if request.method == "POST":
        return JsonResponse(lab_manager.update_host(host_id, request.POST), safe=False)

# API extension for Cobbler integration

def all_images(request, lab_name=""):
    a = []
    for i in Image.objects.all():
        a.append(i.serialize())
    return JsonResponse(a, safe=False)


def all_opsyss(request, lab_name=""):
    a = []
    for opsys in Opsys.objects.all():
        a.append(opsys.serialize())

    return JsonResponse(a, safe=False)

@csrf_exempt
def single_image(request, lab_name="", image_id=""):
    lab_token = request.META.get('HTTP_AUTH_TOKEN')
    lab_manager = LabManagerTracker.get(lab_name, lab_token)
    img = lab_manager.get_image(image_id).first()
    
    if request.method == "GET":
        if not img:
            return HttpResponse(status=404)
        return JsonResponse(img.serialize(), safe=False)

    if request.method == "POST":
        # get POST data
        data = json.loads(request.body.decode('utf-8'))
        if img:
            img.update(data)
        else:
            # append lab name and the ID from the URL
            data['from_lab_id'] = lab_name
            data['lab_id'] = image_id
        
            # create and save a new Image object
            img = Image.new_from_data(data)

        img.save()

        # indicate success in response
        return HttpResponse(status=200)
    return HttpResponse(status=405)


@csrf_exempt
def single_opsys(request, lab_name="", opsys_id=""):
    lab_token = request.META.get('HTTP_AUTH_TOKEN')
    lab_manager = LabManagerTracker.get(lab_name, lab_token) 
    opsys = lab_manager.get_opsys(opsys_id).first()

    if request.method == "GET":
        if not opsys:
            return HttpResponse(status=404)
        return JsonResponse(opsys.serialize(), safe=False)

    if request.method == "POST":
        data = json.loads(request.body.decode('utf-8'))
        if opsys:
            opsys.update(data)
        else:
            # only name, available, and obsolete are needed to create an Opsys
            # other fields are derived from the URL parameters
            
            data['from_lab_id'] = lab_name
            data['lab_id'] = opsys_id
            opsys = Opsys.new_from_data(data)

        opsys.save()
        return HttpResponse(status=200)
    return HttpResponse(status=405)

# end API extension

def get_pdf(request, lab_name="", booking_id=""):
    lab_token = request.META.get('HTTP_AUTH_TOKEN')
    lab_manager = LabManagerTracker.get(lab_name, lab_token)
    return HttpResponse(lab_manager.get_pdf(booking_id), content_type="text/plain")


def get_idf(request, lab_name="", booking_id=""):
    lab_token = request.META.get('HTTP_AUTH_TOKEN')
    lab_manager = LabManagerTracker.get(lab_name, lab_token)
    return HttpResponse(lab_manager.get_idf(booking_id), content_type="text/plain")


def lab_status(request, lab_name=""):
    lab_token = request.META.get('HTTP_AUTH_TOKEN')
    lab_manager = LabManagerTracker.get(lab_name, lab_token)
    if request.method == "POST":
        return JsonResponse(lab_manager.set_status(request.POST), safe=False)
    return JsonResponse(lab_manager.get_status(), safe=False)


def lab_users(request, lab_name=""):
    lab_token = request.META.get('HTTP_AUTH_TOKEN')
    lab_manager = LabManagerTracker.get(lab_name, lab_token)
    return HttpResponse(lab_manager.get_users(), content_type="text/plain")


def lab_user(request, lab_name="", user_id=-1):
    lab_token = request.META.get('HTTP_AUTH_TOKEN')
    lab_manager = LabManagerTracker.get(lab_name, lab_token)
    return HttpResponse(lab_manager.get_user(user_id), content_type="text/plain")


@csrf_exempt
def update_host_bmc(request, lab_name="", host_id=""):
    lab_token = request.META.get('HTTP_AUTH_TOKEN')
    lab_manager = LabManagerTracker.get(lab_name, lab_token)
    if request.method == "POST":
        # update / create RemoteInfo for host
        return JsonResponse(
            lab_manager.update_host_remote_info(request.POST, host_id),
            safe=False
        )


def lab_profile(request, lab_name=""):
    lab_token = request.META.get('HTTP_AUTH_TOKEN')
    lab_manager = LabManagerTracker.get(lab_name, lab_token)
    return JsonResponse(lab_manager.get_profile(), safe=False)


@csrf_exempt
def specific_task(request, lab_name="", job_id="", task_id=""):
    lab_token = request.META.get('HTTP_AUTH_TOKEN')
    LabManagerTracker.get(lab_name, lab_token)  # Authorize caller, but we dont need the result

    if request.method == "POST":
        task = get_task(task_id)
        if 'status' in request.POST:
            task.status = request.POST.get('status')
        if 'message' in request.POST:
            task.message = request.POST.get('message')
        if 'lab_token' in request.POST:
            task.lab_token = request.POST.get('lab_token')
        task.save()
        NotificationHandler.task_updated(task)
        d = {}
        d['task'] = task.config.get_delta()
        m = {}
        m['status'] = task.status
        m['job'] = str(task.job)
        m['message'] = task.message
        d['meta'] = m
        return JsonResponse(d, safe=False)
    elif request.method == "GET":
        return JsonResponse(get_task(task_id).config.get_delta())


@csrf_exempt
def specific_job(request, lab_name="", job_id=""):
    lab_token = request.META.get('HTTP_AUTH_TOKEN')
    lab_manager = LabManagerTracker.get(lab_name, lab_token)
    if request.method == "POST":
        return JsonResponse(lab_manager.update_job(job_id, request.POST), safe=False)
    return JsonResponse(lab_manager.get_job(job_id), safe=False)

@csrf_exempt
def resource_ci_userdata(request, lab_name="", job_id="", resource_id="", file_id=0):
    #lab_token = request.META.get('HTTP_AUTH_TOKEN')
    #lab_manager = LabManagerTracker.get(lab_name, lab_token)

    #job = lab_manager.get_job(job_id)
    job = Job.objects.get(id=job_id)

    cifile = None
    try:
        cifile = CloudInitFile.get(job.booking.id, resource_id, file_id)
    except ObjectDoesNotExist:
        return HttpResponseNotFound("Could not find a matching resource by id " + str(resource_id))

    return HttpResponse(cifile.serialize(), status=200)

@csrf_exempt
def resource_ci_metadata(request, lab_name="", job_id="", resource_id="", file_id=0):
    return HttpResponse("#cloud-config", status=200)

@csrf_exempt
def resource_ci_userdata_directory(request, lab_name="", job_id="", resource_id=""):
    files = [{"id": file.file_id, "priority": file.priority} for file in CloudInitFile.objects.filter(job_id=job_id, resource_id=resource_id).order_by("priority").all()]

    return HttpResponse(json.dumps(files), status=200)


def new_jobs(request, lab_name=""):
    lab_token = request.META.get('HTTP_AUTH_TOKEN')
    lab_manager = LabManagerTracker.get(lab_name, lab_token)
    return JsonResponse(lab_manager.get_new_jobs(), safe=False)


def current_jobs(request, lab_name=""):
    lab_token = request.META.get('HTTP_AUTH_TOKEN')
    lab_manager = LabManagerTracker.get(lab_name, lab_token)
    return JsonResponse(lab_manager.get_current_jobs(), safe=False)


@csrf_exempt
def analytics_job(request, lab_name=""):
    """ returns all jobs with type booking"""
    lab_token = request.META.get('HTTP_AUTH_TOKEN')
    lab_manager = LabManagerTracker.get(lab_name, lab_token)
    if request.method == "GET":
        return JsonResponse(lab_manager.get_analytics_job(), safe=False)
    if request.method == "POST":
        users = json.loads(request.body.decode('utf-8'))['active_users']
        try:
            ActiveVPNUser.create(lab_name, users)
        except ObjectDoesNotExist:
            return JsonResponse('Lab does not exist!', safe=False)
        return HttpResponse(status=200)
    return HttpResponse(status=405)


def lab_downtime(request, lab_name=""):
    lab_token = request.META.get('HTTP_AUTH_TOKEN')
    lab_manager = LabManagerTracker.get(lab_name, lab_token)
    if request.method == "GET":
        return JsonResponse(lab_manager.get_downtime_json())
    if request.method == "POST":
        return post_lab_downtime(request, lab_manager)
    if request.method == "DELETE":
        return delete_lab_downtime(lab_manager)
    return HttpResponse(status=405)


def post_lab_downtime(request, lab_manager):
    current_downtime = lab_manager.get_downtime()
    if current_downtime.exists():
        return JsonResponse({"error": "Lab is already in downtime"}, status=422)
    form = DowntimeForm(request.POST)
    if form.is_valid():
        return JsonResponse(lab_manager.create_downtime(form))
    else:
        return JsonResponse(form.errors.get_json_data(), status=400)


def delete_lab_downtime(lab_manager):
    current_downtime = lab_manager.get_downtime()
    if current_downtime.exists():
        dt = current_downtime.first()
        dt.end = timezone.now()
        dt.save()
        return JsonResponse(lab_manager.get_downtime_json(), safe=False)
    else:
        return JsonResponse({"error": "Lab is not in downtime"}, status=422)


def done_jobs(request, lab_name=""):
    lab_token = request.META.get('HTTP_AUTH_TOKEN')
    lab_manager = LabManagerTracker.get(lab_name, lab_token)
    return JsonResponse(lab_manager.get_done_jobs(), safe=False)
