##############################################################################
# Copyright (c) 2018 Sawyer Bergeron, Parker Berberian, and others.
# Copyright (c) 2020 Sawyer Bergeron, Sean Smith, and others.
#
# All rights reserved. This program and the accompanying materials
# are made available under the terms of the Apache License, Version 2.0
# which accompanies this distribution, and is available at
# http://www.apache.org/licenses/LICENSE-2.0
##############################################################################


import django.forms as forms
from django.forms import widgets, ValidationError
from django.utils.safestring import mark_safe
from django.template.loader import render_to_string
from django.forms.widgets import NumberInput

import json

from account.models import Lab
from account.models import UserProfile

from booking.lib import get_user_items, get_user_field_opts


class SearchableSelectMultipleWidget(widgets.SelectMultiple):
    template_name = 'dashboard/searchable_select_multiple.html'

    def __init__(self, attrs=None):
        self.items = attrs['items']
        self.show_from_noentry = attrs['show_from_noentry']
        self.show_x_results = attrs['show_x_results']
        self.results_scrollable = attrs['results_scrollable']
        self.selectable_limit = attrs['selectable_limit']
        self.placeholder = attrs['placeholder']
        self.name = attrs['name']
        self.initial = attrs.get("initial", [])

        super(SearchableSelectMultipleWidget, self).__init__()

    def render(self, name, value, attrs=None, renderer=None):

        context = self.get_context(attrs)
        return mark_safe(render_to_string(self.template_name, context))

    def get_context(self, attrs) -> dict:
        return {
            'items': self.items,
            'name': self.name,
            'show_from_noentry': self.show_from_noentry,
            'show_x_results': self.show_x_results,
            'results_scrollable': self.results_scrollable,
            'selectable_limit': self.selectable_limit,
            'placeholder': self.placeholder,
            'initial': self.initial,
        }


class SearchableSelectMultipleField(forms.Field):
    def __init__(self, *args, required=True, widget=None, label=None, disabled=False,
                 items=None, queryset=None, show_from_noentry=True, show_x_results=-1,
                 results_scrollable=False, selectable_limit=-1, placeholder="search here",
                 name="searchable_select", initial=[], **kwargs):
        """
        From the documentation.

        # required -- Boolean that specifies whether the field is required.
        #             True by default.
        # widget -- A Widget class, or instance of a Widget class, that should
        #           be used for this Field when displaying it. Each Field has a
        #           default Widget that it'll use if you don't specify this. In
        #           most cases, the default widget is TextInput.
        # label -- A verbose name for this field, for use in displaying this
        #          field in a form. By default, Django will use a "pretty"
        #          version of the form field name, if the Field is part of a
        #          Form.
        # initial -- A value to use in this Field's initial display. This value
        #            is *not* used as a fallback if data isn't given.
        # help_text -- An optional string to use as "help text" for this Field.
        # error_messages -- An optional dictionary to override the default
        #                   messages that the field will raise.
        # show_hidden_initial -- Boolean that specifies if it is needed to render a
        #                        hidden widget with initial value after widget.
        # validators -- List of additional validators to use
        # localize -- Boolean that specifies if the field should be localized.
        # disabled -- Boolean that specifies whether the field is disabled, that
        #             is its widget is shown in the form but not editable.
        # label_suffix -- Suffix to be added to the label. Overrides
        #                 form's label_suffix.
        """
        self.widget = widget
        if self.widget is None:
            self.widget = SearchableSelectMultipleWidget(
                attrs={
                    'items': items,
                    'initial': [obj.id for obj in initial],
                    'show_from_noentry': show_from_noentry,
                    'show_x_results': show_x_results,
                    'results_scrollable': results_scrollable,
                    'selectable_limit': selectable_limit,
                    'placeholder': placeholder,
                    'name': name,
                    'disabled': disabled
                }
            )
        self.disabled = disabled
        self.queryset = queryset
        self.selectable_limit = selectable_limit

        super().__init__(disabled=disabled, **kwargs)

        self.required = required

    def clean(self, data) -> list:
        data = data[0]
        if not data:
            if self.required:
                raise ValidationError("Nothing was selected")
            else:
                return []
        try:
            data_as_list = json.loads(data)
        except json.decoder.JSONDecodeError:
            data_as_list = None
        if not data_as_list:
            raise ValidationError("Contents Not JSON")
        if self.selectable_limit != -1:
            if len(data_as_list) > self.selectable_limit:
                raise ValidationError("Too many items were selected")

        items = []
        for elem in data_as_list:
            items.append(self.queryset.get(id=elem))

        return items


class SearchableSelectAbstractForm(forms.Form):
    def __init__(self, *args, queryset=None, initial=[], **kwargs):
        self.queryset = queryset
        items = self.generate_items(self.queryset)
        options = self.generate_options()

        super(SearchableSelectAbstractForm, self).__init__(*args, **kwargs)
        self.fields['searchable_select'] = SearchableSelectMultipleField(
            initial=initial,
            items=items,
            queryset=self.queryset,
            **options
        )

    def get_validated_bundle(self):
        bundles = self.cleaned_data['searchable_select']
        if len(bundles) < 1:  # don't need to check for >1, as field does that for us
            raise ValidationError("No bundle was selected")
        return bundles[0]

    def generate_items(self, queryset):
        raise Exception("SearchableSelectAbstractForm does not implement concrete generate_items()")

    def generate_options(self, disabled=False) -> dict:
        return {
            'show_from_noentry': True,
            'show_x_results': -1,
            'results_scrollable': True,
            'selectable_limit': 1,
            'placeholder': 'Search for a Bundle',
            'name': 'searchable_select',
            'disabled': False
        }



class BookingMetaForm(forms.Form):
    # Django Form class for Book a Pod
    length = forms.IntegerField(
        widget=NumberInput(
            attrs={
                "type": "range",
                'min': "1",
                "max": "21",
                "value": "1"
            }
        )
    )
    purpose = forms.CharField(max_length=1000)
    project = forms.CharField(max_length=400)
    info_file = forms.CharField(max_length=1000, required=False)
    deploy_opnfv = forms.BooleanField(required=False)

    def __init__(self, *args, user_initial=[], owner=None, **kwargs):
        super(BookingMetaForm, self).__init__(**kwargs)

        self.fields['users'] = SearchableSelectMultipleField(
            queryset=UserProfile.objects.select_related('user').exclude(user=owner),
            initial=user_initial,
            items=get_user_items(exclude=owner),
            required=False,
            **get_user_field_opts()
        )
