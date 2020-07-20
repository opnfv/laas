import json
from datetime import datetime
import pytz

from booking.models import Booking
from resource_inventory.models import (
    Host
)

def write_models_to_JSON():
    """
    Goes through old LaaS Resource Models and writes needed
    columns to JSON.
    """

    outfile = {}
    for book in Booking.objects.filter(end__gte=datetime.now(pytz.utc)):
        # These were written before thinking about needing to refresh bookings
        bundle = book.resource

        #nets = set()
        nets = {}
        hosts = {}

        for host in Host.objects.filter(bundle=bundle).all():
            host_dict = {}
            template = host.template
            config = host.config
            gresource = host.template.resource
            hostname = gresource.name
            host_dict['hostname'] = hostname

            image = config.image
            host_dict['image_id'] = image.id

            host_dict['interfaces'] = {}

            for interface in host.interfaces.all():
                interface_dict = {}

                interface_dict['name'] = interface.name
                interface_dict['mac_address'] = interface.mac_address

                for vlan in interface.config.all():
                    vlan_dict = {}
                    vlan_dict['tagged'] = vlan.tagged
                    vlan_dict['vlan'] = vlan.vlan_id
                    vlan_dict['id'] = vlan.id

                    network = vlan.network

                    #nets.add(
                    nets[network.id] = {'name': network.name, 'public': network.is_public, 'vlan': vlan.vlan_id}

                    interface_dict['vlans'][vlan.id] = vlan_dict

                host_dict['interfaces'][interface.name] = interface_dict

            hosts[host.id] = host_dict

        outfile[book.id] = {}
        outfile[book.id]['hosts'] = hosts
        outfile[book.id]['nets'] = nets

    with open('model_transfer.json', 'w') as of:
        json.dump(outfile, of)


    # Need to go through all hosts and get interfaces and get
    # network connections and store in JSON. I was thinking
    # multi d array so we would have a setup like this
    # book.id {
    #   host {
    #       interfaces {
    #           network_connections : [],
    #           vlans :
    #for host in hosts:
    #    for interface in host.interfaces.all():
