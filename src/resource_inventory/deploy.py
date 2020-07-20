import json
import traceback
import sys
from resource_inventory.models import *
from booking.models import *
from account.models import *
from django.db.models import Max

def make_template(profile):
    public_port_profile = InterfaceProfile.objects.filter(host=profile).order_by('speed').first()
    
    if not public_port_profile:
        print("couldn't find primary port for profile", profile)
        return

    base_template = ResourceTemplate.objects.create(
            name=profile.name,
            xml="",
            description="Default template that contains a single " + profile.name + " host attached to port " + public_port_profile.name,
            lab=profile.labs.first(),
            public=True,
            copy_of=None,
            temporary=False,
            owner=None,
        )

    base_net = Network.objects.create(name="public", is_public=True, bundle=base_template)

    base_config = ResourceConfiguration.objects.create(
            profile = profile,
            image = Image.objects.filter(host_type=profile).first(),
            template = base_template,
            is_head_node = True,
            name = "laas_node",
        )

    for interface_profile in InterfaceProfile.objects.filter(host=profile).all():
        iconfig = InterfaceConfiguration.objects.create(
                profile=interface_profile,
                resource_config=base_config,
            )

        if interface_profile == public_port_profile: 
            connection = NetworkConnection.objects.create(network = base_net, vlan_is_tagged = False)
            iconfig.connections.add(connection)
            iconfig.save()

def cleanup():
    lab = Lab.objects.get(name="UNH_IOL")
    vm = lab.vlan_manager

    for vlan in Vlan.objects.all():
        vlan.delete()

    for server in Server.objects.all():
        server.booked = False
        server.save()

    for template in ResourceTemplate.objects.all():
        template.delete()

    for config in ResourceConfiguration.objects.all():
        config.delete()

    for job in Job.objects.all():
        job.delete()

    # not going to delete bookings, can just reuse them!
    #for booking in Booking.objects.all():
        #try:
            #print("deleting booking by id", booking.id)
            #booking.delete()
        #except:
            #print("error deleting booking:")
            #traceback.print_exc()

    for vlan in range(0, 4096):
        try:
            vm.release_vlans([vlan])
        except:
            print("failed to release vlan", vlan)
            traceback.print_exc()
            pass
        try:
            vm.release_public_vlan(vlan)
        except:
            #print("failed to release pub", vlan)
            #traceback.print_exc()
            pass

    print("vlans is now", vm.vlans)
    print("reserved is now", vm.reserved_vlans)

from api.models import *

def make_job(booking):
    JobFactory.makeCompleteJob(booking)

    job = Job.objects.get(booking=booking)

    for task_relation in job.get_tasklist():
        task_relation.config.state = ConfigState.CLEAN
        task_relation.config.save()
        task_relation.status = JobStatus.DONE
        task_relation.save()

    job.status = JobStatus.DONE
    job.save()

def read_from_json():
    with open('model_transfer.json', 'r') as input_file:
        outer = json.load(input_file)

        cleanup()

        for profile in ResourceProfile.objects.all():
            make_template(profile)

        #return

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
                'nets': {
                    network_id: {
                        'name': str,
                        'public': bool,
                        'vlan': int (vlan id)
                    }
                }
            }
        }
        """

        for booking_id, booking_dict in outer.items():
            print("restoring booking by id ", booking_id)
            restore_booking(booking_id, booking_dict)

def restore_booking(booking_id, booking_dict):
    try:
        Booking.objects.get(id=booking_id)
    except:
        print("skipping as id invalid")
        return # booking no longer valid, just let it go

    print("found a booking by the id")

    owner = User.objects.get(id=booking_dict['owner'])
    lab = Lab.objects.get(name="UNH_IOL")

    # create matching base models for non-null refs
    template_info = booking_dict['template']

    template = ResourceTemplate.objects.create(
            name=template_info['name'],
            xml=template_info['xml'],
            description=template_info['description'],
            lab=lab,
            public=False,
            copy_of=None,
            temporary=True,
            owner=owner,
        )

    bundle = ResourceBundle.objects.create(template=template)

    networks = {}

    physical_networks = {}


    # allocate hosts
    for network in booking_dict['nets']:
        print("restoring network:", network)
        # create generic network repr
        network_model = Network.objects.create(name=network['name'], is_public=network['public'], bundle=template)

        physical_network = PhysicalNetwork.objects.create(
                generic_network = network_model,
                vlan_id = network['vlan']
            )

        networks[network['vlan']] = network_model

        physical_networks[network['vlan']] = physical_network
        
        # check how to get IOL
        vm = lab.vlan_manager
        if not vm.is_available([network['vlan']]):
            print("error: vlan " + str(network['vlan']) + " was not available")

        if network['public']:
            try:
                vm.reserve_public_vlan(network['vlan'])
            except Exception as e:
                print("error reserving public vlan " + str(network['vlan']) + " perhaps it's already reserved? Error type was " + str(e))
                traceback.print_exc()

        try:
            print("reserving vlan id", network['vlan'])
            vm.reserve_vlans([network['vlan']])
        except Exception as e:
            print("error reserving vlan " + str(network['vlan']) + ", error is: " + str(e))
            traceback.print_exc()
    for host_lab_name, host in booking_dict['hosts'].items():
        print("restoring server: ", host_lab_name)
        server = Server.objects.get(name=host['resource_lab_name'])
        image = Image.objects.get(id=host['image_id'])

        server.booked = True
        server.bundle = bundle

        config=ResourceConfiguration.objects.create(
                profile=server.profile,
                image=image,
                template=template,
                is_head_node=host['head_node'],
                name=host['hostname']
            )

        server.config = config

        for interface_name, interface_dict in host['interfaces'].items():
            interface = Interface.objects.get(mac_address=interface_dict['mac_address'])

            iconfig = InterfaceConfiguration.objects.create(
                    profile = interface.profile,
                    resource_config = config
                )

            interface.acts_as = iconfig

            for vlan_id, vlan_info in interface_dict['vlans'].items():
                net_connection = NetworkConnection.objects.create(
                        network = networks[vlan_info['vlan']],
                        vlan_is_tagged = vlan_info['tagged']
                    )

                iconfig.connections.add(net_connection)

                vlan_connection = Vlan.objects.create(
                        vlan_id = vlan_info['vlan'],
                        tagged = vlan_info['tagged'],
                        network = physical_networks[vlan_info['vlan']],
                        public = networks[vlan_info['vlan']].is_public
                    )

                interface.config.add(vlan_connection)

        b_info = booking_dict['info']

        booking = Booking.objects.get(id=booking_id)
        booking.resource = bundle

        #booking = Booking.objects.create(
        #        owner = owner,
        #        lab = lab,
        #        start = b_info['start'],
        #        end = b_info['end'],
        #        purpose = b_info['purpose'],
        #        project = b_info['project'],
        #        pdf = b_info['pdf'],
        #        idf = b_info['idf'],
        #        resource = bundle,
        #    )

        server.save()

        for uid in b_info['collaborators']:
            user = User.objects.get(id=uid)

            booking.collaborators.add(user)

    make_job(booking)

    job = Job.objects.get(booking=booking)
    job_info = booking_dict['job_info']


    for (cls, name) in [
            (SnapshotRelation, "snapshot"),
            (HostNetworkRelation, 'network'), 
            (HostHardwareRelation, 'hardware'),
            (AccessRelation, 'access'),
            (SoftwareRelation, 'software'),
            ]:
        #job_info[name] = [(r.lab_token, r.message) for r in cls.objects.filter(job=job).all()]
        relations = cls.objects.filter(job=job).all()

        info = job_info[name]

        if relations.count() != len(info):
            if relations.count() > len(info):
                print("warning: a job has more relations than there is info present for a type, numbers were: ", relations.count(), len(info))
            if relations.count() < len(info):
                print("error: not enough job relations for the number of info, numbers were: ", relations.count(), len(info))

            #print("relations:")
            #for r in relations:
                #print("    ", r.config.access_type)
            #print("info:")
            #for i in info:
                #print("    ", i)

        for rel in relations:
            try:
                info_el = info.pop()

                rel.lab_token = info_el[0]
                rel.message = info_el[1]
                rel.save()
            except:
                pass

#def config_from_host_dict(host_dict, network_set) -> ResourceConfiguration:
