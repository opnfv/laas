##############################################################################
# Copyright (c) 2016 Max Breitenfeldt and others.
# Copyright (c) 2018 Sawyer Bergeron, Parker Berberian, and others.
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
from django.conf import settings
from django.conf.urls import url, include
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.auth import views as auth_views


urlpatterns = [

    url(r'^workflow/', include('workflow.urls', namespace='workflow')),
    url(r'^', include('dashboard.urls', namespace='dashboard')),
    url(r'^booking/', include('booking.urls', namespace='booking')),
    url(r'^accounts/', include('account.urls', namespace='account')),
    url(r'^resource/', include('resource_inventory.urls', namespace='resource')),
    url(r'^admin/', admin.site.urls),
    url(r'^api-auth/', include('rest_framework.urls', namespace='rest_framework')),
    url(r'^api/', include('api.urls')),
    url(r'^messages/', include('notifier.urls', namespace='notifier')),
    url(r'^oidc/', include('mozilla_django_oidc.urls')),
    url(r'^login/$', auth_views.LoginView.as_view(template_name="account/simple_login.html", extra_context={'AUTH_SETTING': settings.AUTH_SETTING}), name='login'),
    url(r'^logout/$', auth_views.LogoutView.as_view(), name='logout'),
]

if settings.DEBUG is True:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
