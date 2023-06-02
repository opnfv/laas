##############################################################################
# Copyright (c) 2021 Sawyer Bergeron and others.
#
# All rights reserved. This program and the accompanying materials
# are made available under the terms of the Apache License, Version 2.0
# which accompanies this distribution, and is available at
# http://www.apache.org/licenses/LICENSE-2.0
##############################################################################
import sys
import inspect
import pydoc

from django.contrib.auth.models import User

from datetime import timedelta

from booking.models import Booking


def extend_booking(booking_id, days=0, hours=0, minutes=0, weeks=0):
    """
    Extend a booking by n <days, hours, minutes, weeks>

    @booking_id: id of the booking

    @days/@hours/@minutes/@weeks: the cumulative amount of delta to add to the length of the booking
    """

    booking = Booking.objects.get(id=booking_id)
    booking.end = booking.end + timedelta(days=days, hours=hours, minutes=minutes, weeks=weeks)
    booking.save()


def docs(function=None, fulltext=False):
    """
    Print documentation for a given function in admin_utils.
    Call without arguments for more information
    """

    fn = None

    if isinstance(function, str):
        try:
            fn = globals()[function]
        except KeyError:
            print("Couldn't find a function by the given name")
            return
    elif callable(function):
        fn = function
    else:
        print("docs(function: callable | str, fulltext: bool) was called with a 'function' that was neither callable nor a string name of a function")
        print("usage: docs('some_function_in_admin_utils', fulltext=True)")
        print("The 'fulltext' argument is used to choose if you want the complete source of the function printed. If this argument is false then you will only see the pydoc rendered documentation for the function")
        return

    if not fn:
        print("couldn't find a function by that name")

    if not fulltext:
        print("Pydoc documents the function as such:")
        print(pydoc.render_doc(fn))
    else:
        print("The full source of the function is this:")
        print(inspect.getsource(fn))


def admin_functions() -> list[str]:
    """
    List functions available to call within admin_utils
    """

    return [name for name, func in inspect.getmembers(sys.modules[__name__]) if (inspect.isfunction(func) and func.__module__ == __name__)]


print("Hint: call `docs(<function name>)` or `admin_functions()` for help on using the admin utils")
print("docs(<function name>) displays documentation on a given function")
print("admin_functions() lists all functions available to call within this module")
