##############################################################################
# Copyright (c) 2018 Sawyer Bergeron, Parker Berberian, Sean Smith, and others.
#
# All rights reserved. This program and the accompanying materials
# are made available under the terms of the Apache License, Version 2.0
# which accompanies this distribution, and is available at
# http://www.apache.org/licenses/LICENSE-2.0
##############################################################################

from django.db.models import Q

from resource_inventory.models import (
    ResourceTemplate,
    ResourceProfile,
    ResourceQuery,
    Image,
    DiskProfile,
    CpuProfile,
    RamProfile,
    InterfaceProfile,
    InterfaceConfiguration,
    Interface,
    Network
)


def RP_has_all_components():
    """
    Check that every ResourceProfile has an InterfaceProfile,
    DiskProfile, CpuProfile, and RamProfile.
    """

    rp_set = ResourceProfile.objects.all()

    for rp in rp_set:
        ip = InterfaceProfile.objects.filter(host=rp).exists()
        dp = DiskProfile.objects.filter(host=rp).exists()
        cp = CpuProfile.objects.filter(host=rp).exists()
        ram = RamProfile.objects.filter(host=rp).exists()

        if not ip:
            print("No InterfaceProfile for host ", rp.name)

        if not dp:
            print("No DiskProfile for host ", rp.name)

        if not cp:
            print("No CpuProfile for host ", rp.name)

        if not ram:
            print("No RamProfile for host ", rp.name)

    return ip or dp or cp or ram


def Ip_for_all_ifaces():
    """
    Check that every InterfaceProfile for a Resource has
    an Interface and that each interface has a profile that
    matches the InterfaceConfiguration.
    """

    result = True
    res_set = ResourceQuery.filter()

    for res in res_set:
        iface_profile_set = InterfaceProfile.objects.filter(host=res.profile)
        iface_set = Interface.objects.filter(Q(profile__in=iface_profile_set))

        # find out what profiles we have
        curr_profiles = [iface.profile for iface in iface_set]
        missing_profiles = set(curr_profiles) - set(iface_profile_set)

        if missing_profiles:
            print('No interface for profiles', missing_profiles, 'for host', res.name)
            result = False
        else:
            # need to make sure config/iface combination is correct
            for iface in iface_set:
                if iface.acts_as.profile != iface.profile:
                    print("Configuration/Profile don't match!")
                    print(iface.acts_as, ' has profile ', iface.acts_as.profile)
                    print('Iface has profile ', iface.profile)
                    result = False
    return result


def RP_has_Image():
    """
    Make sure every ResourceProfile has an Image.
    """

    result = True

    rp_set = ResourceProfile.objects.all()
    image_set = Image.objects.all()
    image_profiles = [image.profile for image in image_set]

    for rp in rp_set:
        if rp not in image_profiles:
            print("ResourceProfile ", rp.name, " has no image associated with it.")
            result = False
    return result


def All_Temps_Have_Net():
    """
    Make sure all templates have a network
    and at least one public network.
    """

    result = True
    templates = ResourceTemplate.objects.all()
    nets = Network.objects.all()

    public = False
    for temp in templates:
        temp_nets = nets.objects.filter(bundle=temp)
        if not temp_nets.exists():
            result = False
            print("Template ", temp, " has no networks!")
        else:
            for net in temp_nets:
                if net.is_public:
                    public = True

            if not public:
                print("Template ", temp, " has no public network!")
                result = False
    return result


def Every_Pod_Has_Net():
    """
    Make sure every resource in a pod has a connection
    to a network in the pod and no connection outside
    the pod.
    """

    result = True

    templates = ResourceTemplate.objects.all()
    resources = ResourceQuery.filter()
    networks = Network.objects.all()

    for res in resources:
        template = templates.objects.filter(profile=res.profile)
        temp_net = networks.objects.filter(bundle=template)  # this might merge with line above

        # Surely there is a better way to do this...
        iface_profiles = InterfaceProfile.objects.filter(host=res.profile)
        iface_configs = InterfaceConfiguration.objects.filter(profile__in=iface_profiles)
        net_connects = [config.connections.network for config in iface_configs]

        if net_connects is None:
            print("Host ", res, " has no network connections.")
            result = False
        else:
            for list_nets in net_connects:
                for net in list_nets:
                    if net not in temp_net:
                        print(net, " not in pod, but assigned to ", res.name)
                        result = False

    return result


RP_has_all_components()


def main():
    print('aslkdj')


if __name__ == "__main__":
    main()
