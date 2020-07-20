import json
from datetime import datetime
import pytz

from booking.models import Booking
from api.models import *
from resource_inventory.models import (
    Host
)

from django.core.serializers.json import DjangoJSONEncoder

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
        nets = []
        hosts = {}
        info = {}

        """
        {
            booking_id: {
                'job_info': {
                    'access': [(str: lab_token, str: message)],
                    'software': [(str: lab_token, str: message)],
                    'hardware': [(str: lab_token, str: message)],
                    'snapshot': [(str: lab_token, str: message)],
                    'network': [(str: lab_token, str: message)],
                },
                'template': {
                    'name': str,
                    'xml': str,
                    'description': str,
                },
                'owner': user_id,
                'info': {
                    'start': timedate,
                    'end': timedate,
                    'collaborators': List[user_id],
                    'purpose': str,
                    'project': str,
                    'pdf': str,
                    'idf': str,
                    'ext_count': int,
                }

                'hosts': {
                    host_lab_name: {
                        'hostname': str,
                        'image_id': id,
                        'resource_lab_name': str,
                        'head_node': bool,
                        'interfaces': { // todo: fix index in creation script
                            int_name: {
                                'name': str,
                                'mac_address': str,
                                'vlans': {
                                    vlan_id: {
                                        'tagged': bool,
                                        'vlan': int (vlan id),
                                    }
                                }
                            }
                        }
                    }
                }
                'nets': [
                    {
                        'name': str,
                        'public': bool,
                        'vlan': int (vlan id)
                    }
                ]
            }
        }
        """

        info = {
                'start': book.start.isoformat(),
                'end': book.end.isoformat(),
                'purpose': book.purpose,
                'project': book.project,
                'pdf': book.pdf,
                'idf': book.idf,
                'ext_count': book.ext_count,
                'collaborators': [u.id for u in book.collaborators.all()],
                }

        grb = book.resource.template

        template = {'name': grb.name, 'xml': grb.xml, 'description': grb.description}

        for host in Host.objects.filter(bundle=bundle).all():
            #ghost = host.template
            config = host.config

            gresource = host.template.resource

            resource_lab_name = host.name

            hostname = gresource.name

            interfaces = {}

            for interface in host.interfaces.all():
                interface_dict = {'vlans': {}, 'name': interface.name, 'mac_address': interface.mac_address}

                for vlan in interface.config.all():
                    vlan_dict = {}
                    vlan_dict['tagged'] = vlan.tagged
                    vlan_dict['vlan'] = vlan.vlan_id
                    vlan_dict['id'] = vlan.id

                    network = vlan.network

                    #nets.add(
                    nets.append({'name': network.name, 'public': network.is_public, 'vlan': vlan.vlan_id})

                    interface_dict['vlans'][vlan.id] = vlan_dict

                interfaces[interface.name] = interface_dict


            host_dict = {
                    'hostname': hostname,
                    'image_id': config.image.id,
                    'resource_lab_name': resource_lab_name,
                    'head_node': config.is_head_node,
                    'interfaces': interfaces,
                    }

            hosts[resource_lab_name] = host_dict

        job = Job.objects.get(booking=book)

        job_info = {}

        for (cls, name) in [
                (SnapshotRelation, "snapshot"),
                (HostNetworkRelation, 'network'), 
                (HostHardwareRelation, 'hardware'),
                (AccessRelation, 'access'),
                (SoftwareRelation, 'software'),
                ]:
            job_info[name] = [(r.lab_token, r.message) for r in cls.objects.filter(job=job).all()]

        book_dict = {
                'hosts': hosts,
                'nets': nets,
                'info': info,
                'owner': book.owner.id,
                'template': template,
                'job_info': job_info,
                }

        outfile[book.id] = book_dict

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
