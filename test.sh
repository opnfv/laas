#!/bin/bash
##############################################################################
# Copyright (c) 2018 Parker Berberian, Sawyer Bergeron, and others.
#
# All rights reserved. This program and the accompanying materials
# are made available under the terms of the Apache License, Version 2.0
# which accompanies this distribution, and is available at
# http://www.apache.org/licenses/LICENSE-2.0
##############################################################################

# first, basic lint with flake8
find . -type f -name "*.py" -not -name "manage.py" | xargs flake8 --count --ignore E501


# this file should be executed from the dir it is in
docker exec -it dg01 coverage --source='.' manage.py test
