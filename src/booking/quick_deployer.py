##############################################################################
# Copyright (c) 2018 Parker Berberian, Sawyer Bergeron, and others.
#
# All rights reserved. This program and the accompanying materials
# are made available under the terms of the Apache License, Version 2.0
# which accompanies this distribution, and is available at
# http://www.apache.org/licenses/LICENSE-2.0
##############################################################################


import json
import uuid
import re
from django.db.models import Q
from datetime import timedelta
from django.utils import timezone
from account.models import Lab

from resource_inventory.models import (
    Installer,
    Image,
    GenericResourceBundle,
    ConfigBundle,
    Host,
    HostProfile,
    HostConfiguration,
    GenericResource,
    GenericHost,
    GenericInterface,
    OPNFVRole,
    OPNFVConfig,
    Network,
    NetworkConnection,
    NetworkRole,
    HostOPNFVConfig,
)
from resource_inventory.resource_manager import ResourceManager
from resource_inventory.pdf_templater import PDFTemplater
from notifier.manager import NotificationHandler
from booking.models import Booking
from dashboard.exceptions import (
    InvalidHostnameException,
    ResourceAvailabilityException,
    ModelValidationException,
    BookingLengthException
)
from api.models import JobFactory


# model validity exceptions
class IncompatibleInstallerForOS(Exception):
    pass


class IncompatibleScenarioForInstaller(Exception):
    pass


class IncompatibleImageForHost(Exception):
    pass


class ImageOwnershipInvalid(Exception):
    pass


class ImageNotAvailableAtLab(Exception):
    pass


class LabDNE(Exception):
    pass


class HostProfileDNE(Exception):
    pass


class HostNotAvailable(Exception):
    pass


class NoLabSelectedError(Exception):
    pass


class OPNFVRoleDNE(Exception):
    pass


class NoRemainingPublicNetwork(Exception):
    pass


class BookingPermissionException(Exception):
    pass


def check_available_matching_host(lab, hostprofile):
    """
    Check the resources are available.

    Returns true if the requested host type is availble,
    Or throws an exception
    """
    available_host_types = ResourceManager.getInstance().getAvailableHostTypes(lab)
    if hostprofile not in available_host_types:
        # TODO: handle deleting generic resource in this instance along with grb
        raise HostNotAvailable('Requested host type is not available. Please try again later. Host availability can be viewed in the "Hosts" tab to the left.')

    hostset = Host.objects.filter(lab=lab, profile=hostprofile).filter(booked=False).filter(working=True)
    if not hostset.exists():
        raise HostNotAvailable("Couldn't find any matching unbooked hosts")

    return True


# Functions to create models

def generate_grb(owner, lab, common_id):
    """Create a Generic Resource Bundle."""
    grbundle = GenericResourceBundle(owner=owner)
    grbundle.lab = lab
    grbundle.name = "grbundle for quick booking with uid " + common_id
    grbundle.description = "grbundle created for quick-deploy booking"
    grbundle.save()

    return grbundle


def generate_gresource(bundle, hostname):
    """Create a Generic Resource."""
    if not re.match(r"(?=^.{1,253}$)(^([A-Za-z0-9-_]{1,62}\.)*[A-Za-z0-9-_]{1,63})$", hostname):
        raise InvalidHostnameException("Hostname must comply to RFC 952 and all extensions to it until this point")
    gresource = GenericResource(bundle=bundle, name=hostname)
    gresource.save()

    return gresource


def generate_ghost(generic_resource, host_profile):
    """Create a Generic Host."""
    ghost = GenericHost()
    ghost.resource = generic_resource
    ghost.profile = host_profile
    ghost.save()

    return ghost


def generate_config_bundle(owner, common_id, grbundle):
    """Create a Configuration Bundle."""
    cbundle = ConfigBundle()
    cbundle.owner = owner
    cbundle.name = "configbundle for quick booking with uid " + common_id
    cbundle.description = "configbundle created for quick-deploy booking"
    cbundle.bundle = grbundle
    cbundle.save()

    return cbundle


def generate_opnfvconfig(scenario, installer, config_bundle):
    """Create an OPNFV Configuration."""
    opnfvconfig = OPNFVConfig()
    opnfvconfig.scenario = scenario
    opnfvconfig.installer = installer
    opnfvconfig.bundle = config_bundle
    opnfvconfig.save()

    return opnfvconfig


def generate_hostconfig(generic_host, image, config_bundle):
    """Create a Host Configuration."""
    hconf = HostConfiguration()
    hconf.host = generic_host
    hconf.image = image
    hconf.bundle = config_bundle
    hconf.is_head_node = True
    hconf.save()

    return hconf


def generate_hostopnfv(hostconfig, opnfvconfig):
    """Relate the Host and OPNFV Configs."""
    config = HostOPNFVConfig()
    role = None
    try:
        role = OPNFVRole.objects.get(name="Jumphost")
    except Exception:
        role = OPNFVRole.objects.create(
            name="Jumphost",
            description="Single server jumphost role"
        )
    config.role = role
    config.host_config = hostconfig
    config.opnfv_config = opnfvconfig
    config.save()
    return config


def generate_resource_bundle(generic_resource_bundle, config_bundle):  # warning: requires cleanup
    """Create a Resource Bundle."""
    try:
        resource_manager = ResourceManager.getInstance()
        resource_bundle = resource_manager.convertResourceBundle(generic_resource_bundle, config=config_bundle)
        return resource_bundle
    except ResourceAvailabilityException:
        raise ResourceAvailabilityException("Requested resources not available")
    except ModelValidationException:
        raise ModelValidationException("Encountered error while saving grbundle")

def configure_networking(grb, config):
    # create network
    net = Network.objects.create(name="public", bundle=grb, is_public=True)
    # connect network to generic host
    grb.getResources()[0].generic_interfaces.first().connections.add(
        NetworkConnection.objects.create(network=net, vlan_is_tagged=False)
    )
    # asign network role
    role = NetworkRole.objects.create(name="public", network=net)
    opnfv_config = config.opnfv_config.first()
    if opnfv_config:
        opnfv_config.networks.add(role)


def create_from_form(form, request):
    """
    Create a Booking from the user's form.

    Large, nasty method to create a booking or return a useful error
    based on the form from the frontend
    """
    quick_booking_id = str(uuid.uuid4())

    host_field = form.cleaned_data['filter_field']
    purpose_field = form.cleaned_data['purpose']
    project_field = form.cleaned_data['project']
    users_field = form.cleaned_data['users']
    hostname = form.cleaned_data['hostname']
    length = form.cleaned_data['length']
    host_profile = form.cleaned_data['host_profile']
    lab = form.cleaned_data['lab']

    image = form.cleaned_data['image']
    scenario = form.cleaned_data['scenario']
    installer = form.cleaned_data['installer']

    check_available_matching_host(lab, host_profile)  # requires cleanup if failure after this point

    grbundle = generate_grb(request.user, lab, quick_booking_id)
    gresource = generate_gresource(grbundle, hostname)
    ghost = generate_ghost(gresource, host_profile)
    cbundle = generate_config_bundle(request.user, quick_booking_id, grbundle)
    hconf = generate_hostconfig(ghost, image, cbundle)

    # if no installer provided, just create blank host
    opnfv_config = None
    if installer:
        opnfv_config = generate_opnfvconfig(scenario, installer, cbundle)
        generate_hostopnfv(hconf, opnfv_config)

    # construct generic interfaces
    for interface_profile in host_profile.interfaceprofile.all():
        generic_interface = GenericInterface.objects.create(profile=interface_profile, host=ghost)
        generic_interface.save()

    configure_networking(grbundle, cbundle)

    # generate resource bundle
    resource_bundle = generate_resource_bundle(grbundle, cbundle)

    # generate booking
    booking = Booking.objects.create(
        purpose=purpose_field,
        project=project_field,
        lab=lab,
        owner=request.user,
        start=timezone.now(),
        end=timezone.now() + timedelta(days=int(length)),
        resource=resource_bundle,
        config_bundle=cbundle,
        opnfv_config=opnfv_config
    )
    booking.pdf = PDFTemplater.makePDF(booking)

    for collaborator in users_field:  # list of UserProfiles
        booking.collaborators.add(collaborator.user)

    booking.save()

    # generate job
    JobFactory.makeCompleteJob(booking)
    NotificationHandler.notify_new_booking(booking)

    return booking


def drop_filter(user):
    """
    Return a dictionary that contains filters.

    Only certain installlers are supported on certain images, etc
    so the image filter indexed at [imageid][installerid] is truthy if
    that installer is supported on that image
    """
    installer_filter = {}
    for image in Image.objects.all():
        installer_filter[image.id] = {}
        for installer in image.os.sup_installers.all():
            installer_filter[image.id][installer.id] = 1

    scenario_filter = {}
    for installer in Installer.objects.all():
        scenario_filter[installer.id] = {}
        for scenario in installer.sup_scenarios.all():
            scenario_filter[installer.id][scenario.id] = 1

    images = Image.objects.filter(Q(public=True) | Q(owner=user))
    image_filter = {}
    for image in images:
        image_filter[image.id] = {}
        image_filter[image.id]['lab'] = 'lab_' + str(image.from_lab.lab_user.id)
        image_filter[image.id]['host_profile'] = 'host_' + str(image.host_type.id)
        image_filter[image.id]['name'] = image.name

    return {'installer_filter': json.dumps(installer_filter),
            'scenario_filter': json.dumps(scenario_filter),
            'image_filter': json.dumps(image_filter)}
