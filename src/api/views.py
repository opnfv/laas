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
import math
from datetime import timedelta

from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, get_object_or_404
from django.utils.decorators import method_decorator
from django.utils import timezone
from django.views import View
from django.http.response import JsonResponse, HttpResponse
from rest_framework import viewsets
from rest_framework.authtoken.models import Token
from django.views.decorators.csrf import csrf_exempt
from django.core.exceptions import ObjectDoesNotExist

from api.serializers.booking_serializer import BookingSerializer
from api.serializers.old_serializers import UserSerializer
from api.forms import DowntimeForm
from account.models import UserProfile, Lab
from booking.models import Booking
from api.models import LabManagerTracker, AutomationAPIManager, get_task, APILog
from notifier.manager import NotificationHandler
from analytics.models import ActiveVPNUser
from booking.quick_deployer import create_from_API
from resource_inventory.models import ResourceTemplate


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


def auth_and_log(request, endpoint):
    """
    Function to authenticate an API user and log info
    in the API log model. This is to keep record of
    all calls to the dashboard
    """
    user_token = request.META.get('HTTP_AUTH_TOKEN')
    try:
        token = Token.objects.get(key=user_token)
    except Token.DoesNotExist:
        return HttpResponse('Unauthorized', status=401)

    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')

    body = None
    if request.method in ['POST', 'PUT']:
        body = json.loads(request.body.decode('utf-8')),

    APILog.objects.create(
        user=token.user,
        call_time=timezone.now(),
        method=request.method,
        endpoint=endpoint,
        body=body,
        ip_addr=ip
    )

    return token


"""
Booking API Views
"""


def user_bookings(request):
    token = auth_and_log(request, 'booking')
    bookings = Booking.objects.filter(owner=token.user, end__gte=timezone.now())
    output = [AutomationAPIManager.serialize_booking(booking)
              for booking in bookings]
    return JsonResponse(output, safe=False)


@csrf_exempt
def specific_booking(request, booking_id=""):
    token = auth_and_log(request, 'booking/{}'.format(booking_id))

    booking = get_object_or_404(Booking, pk=booking_id, owner=token.user)
    if request.method == "GET":
        sbooking = AutomationAPIManager.serialize_booking(booking)
        return JsonResponse(sbooking, safe=False)

    if request.method == "DELETE":
        if booking.end < timezone.now():
            return HttpResponse("Booking already over", status=400)

        booking.end = timezone.now()
        booking.save()
        return HttpResponse("Booking successfully cancelled")


@csrf_exempt
def extend_booking(request, booking_id="", days=""):
    token = auth_and_log(request, 'booking/{}/extendBooking/{}'.format(booking_id, days))

    booking = get_object_or_404(Booking, pk=booking_id, owner=token.user)

    if booking.end < timezone.now():
        return HttpResponse("This booking is already over, cannot extend")

    if days > 30:
        return HttpResponse("Cannot extend a booking longer than 30 days")

    if booking.ext_count == 0:
        return HttpResponse("Booking has already been extended 2 times, cannot extend again")

    booking.end += timedelta(days=days)
    booking.ext_count -= 1
    booking.save()

    return HttpResponse("Booking successfully extended")


@csrf_exempt
def make_booking(request):
    token = auth_and_log(request, 'booking/makeBooking')

    try:
        booking = create_from_API(request.body, token.user)
    except Exception as e:
        return HttpResponse(str(e), status=400)

    sbooking = AutomationAPIManager.serialize_booking(booking)
    return JsonResponse(sbooking, safe=False)


"""
Resource Inventory API Views
"""


def available_templates(request):
    token = auth_and_log(request, 'resource_inventory/availableTemplates')

    # get available templates
    # mirrors MultipleSelectFilter Widget
    avt = []
    for lab in Lab.objects.all():
        for template in ResourceTemplate.objects.filter(lab=lab, owner=token.user, public=True):
            available_resources = lab.get_available_resources()
            required_resources = template.get_required_resources()
            least_available = 100

            for resource, count_required in required_resources.items():
                try:
                    curr_count = math.floor(available_resources[str(resource)] / count_required)
                    if curr_count < least_available:
                        least_available = curr_count
                except KeyError:
                    least_available = 0

            if least_available > 0:
                avt.append((template, least_available))

    savt = [AutomationAPIManager.serialize_template(temp)
            for temp in avt]

    return JsonResponse(savt, safe=False)


def images_for_template(request, template_id=""):
    _ = auth_and_log(request, 'resource_inventory/{}/images'.format(template_id))

    template = get_object_or_404(ResourceTemplate, pk=template_id)
    images = [AutomationAPIManager.serialize_image(config.image)
              for config in template.getConfigs()]
    return JsonResponse(images, safe=False)


"""
User API Views
"""


def all_users(request):
    token = auth_and_log(request, 'users')

    users = [AutomationAPIManager.serialize_userprofile(up)
             for up in UserProfile.objects.exclude(user=token.user)]

    return JsonResponse(users, safe=False)
