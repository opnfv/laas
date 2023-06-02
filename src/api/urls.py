##############################################################################
# Copyright (c) 2016 Max Breitenfeldt and others.
# Copyright (c) 2018 Sawyer Bergeron, Parker Berberian, and others
#
# All rights reserved. This program and the accompanying materials
# are made available under the terms of the Apache License, Version 2.0
# which accompanies this distribution, and is available at
# http://www.apache.org/licenses/LICENSE-2.0
##############################################################################


"""
laas_dashboard URL Configuration.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.10/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.conf.urls import url, include
    2. Add a URL to urlpatterns:  url(r'^blog/', include('blog.urls'))
"""
from django.conf.urls import url
from django.urls import path

from api.views import (
    lab_profile,
    lab_status,
    lab_downtime,
    get_pdf,
    get_idf,
    lab_users,
    lab_user,
    GenerateTokenView,
    extend_booking,
    list_labs,
    get_ssh_key,
    talk_to_liblaas
)

urlpatterns = [

    path('labs/<slug:lab_name>/profile', lab_profile),
    path('labs/<slug:lab_name>/status', lab_status),
    path('labs/<slug:lab_name>/downtime', lab_downtime),
    path('labs/<slug:lab_name>/booking/<int:booking_id>/pdf', get_pdf, name="get-pdf"),
    path('labs/<slug:lab_name>/booking/<int:booking_id>/idf', get_idf, name="get-idf"),
    path('labs/<slug:lab_name>/users', lab_users),
    path('labs/<slug:lab_name>/users/<int:user_id>', lab_user),

    path('booking/<int:booking_id>/extendBooking/<int:days>', extend_booking),

    path('labs', list_labs),
    path('get_ssh_key', get_ssh_key),
    path('talk_to_liblaas', talk_to_liblaas),

    url(r'^token$', GenerateTokenView.as_view(), name='generate_token'),
]
