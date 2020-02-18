##############################################################################
# Copyright (c) 2018 Parker Berberian, Sawyer Bergeron, and others.
#
# All rights reserved. This program and the accompanying materials
# are made available under the terms of the Apache License, Version 2.0
# which accompanies this distribution, and is available at
# http://www.apache.org/licenses/LICENSE-2.0
##############################################################################
import django.forms as forms
from django.forms.widgets import NumberInput

from workflow.forms import (
    MultipleSelectFilterField,
    MultipleSelectFilterWidget,
    FormUtils)
from account.models import UserProfile, Lab
from resource_inventory.models import Image, Installer, Scenario, HostProfile
from workflow.forms import SearchableSelectMultipleField
from booking.lib import get_user_items, get_user_field_opts


class QuickBookingForm(forms.Form):
    purpose = forms.CharField(max_length=1000)
    project = forms.CharField(max_length=400)
    hostname = forms.CharField(max_length=400)

    installer = forms.ModelChoiceField(queryset=Installer.objects.all(), required=False)
    scenario = forms.ModelChoiceField(queryset=Scenario.objects.all(), required=False)

    def __init__(self, data=None, user=None, *args, **kwargs):
        if "default_user" in kwargs:
            default_user = kwargs.pop("default_user")
        else:
            default_user = "you"
        self.default_user = default_user
        self.user = user

        super(QuickBookingForm, self).__init__(data=data, **kwargs)

        self.fields["image"] = forms.ModelChoiceField(
            Image.objects.filter(public=True) | Image.objects.filter(owner=user)
        )

        self.fields['users'] = SearchableSelectMultipleField(
            queryset=UserProfile.objects.select_related('user').exclude(user=user),
            items=get_user_items(exclude=user),
            required=False,
            **get_user_field_opts()
        )

        attrs = FormUtils.getLabData(0)
        self.fields['filter_field'] = MultipleSelectFilterField(widget=MultipleSelectFilterWidget(**attrs))
        self.fields['length'] = forms.IntegerField(
            widget=NumberInput(
                attrs={
                    "type": "range",
                    'min': "1",
                    "max": "21",
                    "value": "1"
                }
            )
        )

    def build_user_list(self):
        """
        Build list of UserProfiles.

        returns a mapping of UserProfile ids to displayable objects expected by
        searchable multiple select widget
        """
        try:
            users = {}
            d_qset = UserProfile.objects.select_related('user').all().exclude(user__username=self.default_user)
            for userprofile in d_qset:
                user = {
                    'id': userprofile.user.id,
                    'expanded_name': userprofile.full_name,
                    'small_name': userprofile.user.username,
                    'string': userprofile.email_addr
                }

                users[userprofile.user.id] = user

            return users
        except Exception:
            pass

    def build_search_widget_attrs(self, chosen_users, default_user="you"):

        attrs = {
            'set': self.build_user_list(),
            'show_from_noentry': "false",
            'show_x_results': 10,
            'scrollable': "false",
            'selectable_limit': -1,
            'name': "users",
            'placeholder': "username",
            'initial': chosen_users,
            'edit': False
        }
        return attrs

    def is_valid(self):
        # Check if invalid first
        if not super().is_valid():
            return False

        lab, host_profile = self.parse_host_field()
        self.cleaned_data['lab'] = lab
        self.cleaned_data['host_profile'] = host_profile
        self.cleaned_data['user'] = self.user

        self.check_invariants()

        # Do this last
        return True

    def check_invariants(self):
        """
        Verify all the contraints on the requested booking.

        verifies software compatibility, booking length, etc
        """
        installer = self.cleaned_data['installer']
        image = self.cleaned_data['image']
        scenario = self.cleaned_data['scenario']
        lab = self.cleaned_data['lab']
        host_profile = self.cleaned_data['host_profile']
        length = self.cleaned_data['length']
        user = self.cleaned_data['user']
        # check that image os is compatible with installer
        if installer in image.os.sup_installers.all():
            # if installer not here, we can omit that and not check for scenario
            if not scenario:
                raise IncompatibleScenarioForInstaller("An OPNFV Installer needs a scenario to be chosen to work properly")
            if scenario not in installer.sup_scenarios.all():
                raise IncompatibleScenarioForInstaller("The chosen installer does not support the chosen scenario")
        if image.from_lab != lab:
            raise ImageNotAvailableAtLab("The chosen image is not available at the chosen hosting lab")
        if image.host_type != host_profile:
            raise IncompatibleImageForHost("The chosen image is not available for the chosen host type")
        if not image.public and image.owner != user:
            raise ImageOwnershipInvalid("You are not the owner of the chosen private image")
        if length < 1 or length > 21:
            raise BookingLengthException("Booking must be between 1 and 21 days long")

    def parse_host_field(self):
        """
        Parse the json from the frontend.

        returns a reference to the selected Lab and HostProfile objects
        """
        lab, profile = (None, None)
        lab_dict = self.cleaned_data['filter_field']['lab']
        for lab_info in lab_dict.values():
            if lab_info['selected']:
                lab = Lab.objects.get(lab_user__id=lab_info['id'])

        host_dict = self.cleaned_data['filter_field']['host']
        for host_info in host_dict.values():
            if host_info['selected']:
                profile = HostProfile.objects.get(pk=host_info['id'])

        if lab is None:
            raise NoLabSelectedError("No lab was selected")
        if profile is None:
            raise HostProfileDNE("No Host was selected")

        return lab, profile

class HostReImageForm(forms.Form):

    image_id = forms.IntegerField()
    host_id = forms.IntegerField()
