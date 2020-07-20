import json
import traceback
from resource_inventory.models import *

def read_from_json():
    with open('model_transfer.json', 'r') as input_file:
        outer = json.load(input_file)

        """
        {
            booking_id: {
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
            restore_booking(booking_id, booking_dict)

def restore_booking(booking_id, booking_dict):
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
    for _network_id, network in booking_dict['nets'].items():
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
            vm.reserve_vlans([network['vlan']])
        except Exception as e:
            print("error reserving vlan " + str(network['vlan']) + ", error is: " + str(e))
            traceback.print_exc()
    for host_id, host in booking_dict['hosts'].items():
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

        for interface_name, interface_dict in host['nets']:
            interface = Interface.objects.get(mac_address=interface_dict['mac_address'])

            iconfig = InterfaceConfiguration.objects.create(
                    profile = interface.profile,
                    resource_config = config
                )

            interface.acts_as = iconfig

            for vlan_id, vlan_info in interface_dict['vlans']:
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

        booking = Booking.objects.create(
                owner = owner,
                lab = lab,
                start = b_info['start'],
                end = b_info['end'],
                purpose = b_info['purpose'],
                project = b_info['project'],
                pdf = b_info['pdf'],
                idf = b_info['idf'],
                resource = bundle,
            )

        for uid in b_info['collaborators']:
            user = User.objects.get(id=uid)

            booking.collaborators.add(user)

#def config_from_host_dict(host_dict, network_set) -> ResourceConfiguration:
