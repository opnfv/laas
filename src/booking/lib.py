##############################################################################
# Copyright (c) 2019 Parker Berberian, Sawyer Bergeron, and others.
#
# All rights reserved. This program and the accompanying materials
# are made available under the terms of the Apache License, Version 2.0
# which accompanies this distribution, and is available at
# http://www.apache.org/licenses/LICENSE-2.0
##############################################################################

from account.models import UserProfile


def get_user_field_opts() -> dict:
    return {
        'show_from_noentry': False,
        'show_x_results': 5,
        'results_scrollable': True,
        'selectable_limit': -1,
        'placeholder': 'Search for other users',
        'name': 'users',
        'disabled': False
    }


def get_user_items(exclude=None) -> dict:
    queryset = UserProfile.objects.filter(public_user=True).select_related('user').exclude(user=exclude)
    items = {}
    for userprofile in queryset:
        item = {
            'id': userprofile.id,
            'expanded_name': userprofile.full_name if userprofile.full_name else userprofile.user.username,
            'small_name': userprofile.user.username,
            'string': userprofile.email_addr if userprofile.email_addr else userprofile.user.username,
        }
        items[userprofile.id] = item
    return items
