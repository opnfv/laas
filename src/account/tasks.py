##############################################################################
# Copyright (c) 2016 Max Breitenfeldt and others.
# Copyright (c) 2018 Parker Berberian, Sawyer Bergeron, and others.
#
# All rights reserved. This program and the accompanying materials
# are made available under the terms of the Apache License, Version 2.0
# which accompanies this distribution, and is available at
# http://www.apache.org/licenses/LICENSE-2.0
##############################################################################


from celery import shared_task
from django.contrib.auth.models import User
from jira import JIRAError

from account.jira_util import get_jira


@shared_task
def sync_jira_accounts():
    users = User.objects.all()
    for user in users:
        jira = get_jira(user)
        try:
            user_dict = jira.myself()
        except JIRAError:
            # User can be anonymous (local django admin account)
            continue
        try:
            user.email = user_dict['emailAddress']
        except KeyError:
            pass
        user.userprofile.url = user_dict['self']
        user.userprofile.full_name = user_dict['displayName']

        user.userprofile.save()
        user.save()
