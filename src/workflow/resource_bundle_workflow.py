##############################################################################
# Copyright (c) 2018 Parker Berberian, Sawyer Bergeron, and others.
#
# All rights reserved. This program and the accompanying materials
# are made available under the terms of the Apache License, Version 2.0
# which accompanies this distribution, and is available at
# http://www.apache.org/licenses/LICENSE-2.0
##############################################################################


from django.conf import settings

import json
import re
from xml.dom import minidom
import traceback

from workflow.models import WorkflowStep
from account.models import Lab
from workflow.forms import (
    HardwareDefinitionForm,
    NetworkDefinitionForm,
    ResourceMetaForm,
)
from resource_inventory.models import (
    ResourceProfile,
    ResourceTemplate,
    ResourceConfiguration,
    InterfaceConfiguration,
    Network,
    NetworkConnection
)
from dashboard.exceptions import (
    InvalidVlanConfigurationException,
    NetworkExistsException,
    InvalidHostnameException,
    NonUniqueHostnameException,
    ResourceAvailabilityException
)

import logging
logger = logging.getLogger(__name__)


class Define_Hardware(WorkflowStep):

    template = 'resource/steps/define_hardware.html'
    title = "Define Hardware"
    description = "Choose the type and amount of machines you want"
    short_title = "hosts"

    def __init__(self, *args, **kwargs):
        self.form = None
        super().__init__(*args, **kwargs)

    def get_context(self):
        print("get context start")
        context = super(Define_Hardware, self).get_context()
        context['form'] = self.form or HardwareDefinitionForm()
        print("end get context")
        return context

    def update_models(self, data):
        print("updating models")
        data = data['filter_field']
        models = self.repo_get(self.repo.RESOURCE_TEMPLATE_MODELS, {})
        models['resources'] = []  # This will always clear existing data when this step changes
        models['interfaces'] = {}
        if "template" not in models:
            template = ResourceTemplate()
            template.save()
            models['template'] = template

        print("Data is: " + str(data))

        resource_data = data['resource']
        #names = {}

        new_template = models['template']

        public_network = Network(name="public", bundle=new_template, is_public=True)
        public_network.save()

        all_networks = {public_network.id: public_network}

        #all_resources = []

        for resource_template_dict in resource_data.values():
            if not resource_template_dict['selected']:
                continue

            id = resource_template_dict['id']
            old_template = ResourceTemplate.objects.get(id=id)
            #profile = ResourceProfile.objects.get(id=id)
            # instantiate genericHost and store in repo
            print("Resource template dict:")
            print(resource_template_dict)
            print("Start iter")
            for _ in range(0, resource_template_dict['count']):
                resource_configs = old_template.resourceConfigurations.all()
                for config in resource_configs:
                    new_config = ResourceConfiguration()
                    new_config.profile = config.profile
                    new_config.image = config.image
                    new_config.template = new_template

                    #need to save now for connections to refer to it later
                    new_config.save()
                    # TODO: reset template later after saving the template
                    for interface_config in config.interface_configs.all():
                        new_interface_config = InterfaceConfiguration()
                        new_interface_config.profile = interface_config.profile
                        new_interface_config.resource_config = new_config

                        for connection in interface_config.connections.all():
                            network = None
                            if connection.network.is_public:
                                network = public_network
                            else:
                                #check if network is known
                                if connection.network.id not in all_networks:
                                    #create matching one
                                    new_network = Network(
                                            name = connection.network.name + "_" + str(new_config.id),
                                            bundle = new_template,
                                            is_public = False)
                                    new_network.save()

                                    all_networks[connection.network.id] = new_network

                                network = all_networks[connection.network.id]

                            new_connection = NetworkConnection(
                                    network=network,
                                    vlan_is_tagged=connection.vlan_is_tagged)

                            new_interface_config.save() # can't do later because M2M on next line
                            new_connection.save()
                            
                            new_interface_config.connections.add(new_connection)

                        unique_resource_ref = new_config.name + "_" + str(new_config.id)
                        if unique_resource_ref not in models['interfaces']:
                            models['interfaces'][unique_resource_ref] = []
                        models['interfaces'][unique_resource_ref].append(interface_config)

                    models['resources'].append(new_config)

            print("Done iter")
            print("networks is")
            print(all_networks)
            models['networks'] = all_networks
            print("resources is")
            print(models['resources'])
            print("interfaces is")
            print(models['interfaces'])

            #for name in resource_template_dict.values():
            #    if not re.match(r"(?=^.{1,253}$)(^([A-Za-z0-9-_]{1,62}\.)*[A-Za-z0-9-_]{1,63})", name):
            #        print("InvalidHostnameException")
            #        raise InvalidHostnameException("Invalid hostname: '" + name + "'")
            #    if name in names:
            #        print("InvalidHostnameException")
            #        raise NonUniqueHostnameException("All hosts must have unique names")
            #    names[name] = True
            #    resourceConfig = ResourceConfiguration(profile=profile, template=models['bundle'])
            #    models['hosts'].append(resourceConfig)
            #    for interface_profile in profile.interfaceprofile.all():
            #        genericInterface = InterfaceConfiguration(profile=interface_profile, resource_config=resourceConfig)
            #        if resourceConfig.name not in models['interfaces']:
            #            models['interfaces'][resourceConfig.name] = []
            #        models['interfaces'][resourceConfig.name].append(genericInterface)

        # add selected lab to models
        for lab_dict in data['lab'].values():
            if lab_dict['selected']:
                models['template'].lab = Lab.objects.get(lab_user__id=lab_dict['id'])
                break  # if somehow we get two 'true' labs, we only use one

        # return to repo
        self.repo_put(self.repo.RESOURCE_TEMPLATE_MODELS, models)
        print("done update models")

    # TODO: fix when making confirm work
    def update_confirmation(self):
        confirm = self.repo_get(self.repo.CONFIRMATION, {})
        if "resource" not in confirm:
            confirm['resource'] = {}
        confirm['resource']['hosts'] = []
        models = self.repo_get(self.repo.GRESOURCE_BUNDLE_MODELS, {"hosts": []})
        for host in models['hosts']:
            host_dict = {"name": host.resource.name, "profile": host.profile.name}
            confirm['resource']['hosts'].append(host_dict)
        if "lab" in models:
            confirm['resource']['lab'] = models['lab'].lab_user.username
        self.repo_put(self.repo.CONFIRMATION, confirm)

    def post(self, post_data, user):
        try:
            self.form = HardwareDefinitionForm(post_data)
            if self.form.is_valid():
                self.update_models(self.form.cleaned_data)
                self.update_confirmation()
                self.set_valid("Step Completed")
            else:
                self.set_invalid("Please complete the fields highlighted in red to continue")
        except Exception as e:
            print("Caught exception: " + str(e))
            traceback.print_exc()
            #print(repr(e))
            self.set_invalid(str(e))


class Define_Nets(WorkflowStep):
    template = 'resource/steps/pod_definition.html'
    title = "Define Networks"
    description = "Use the tool below to draw the network topology of your POD"
    short_title = "networking"
    form = NetworkDefinitionForm

    def get_vlans(self):
        vlans = self.repo_get(self.repo.VLANS)
        if vlans:
            return vlans
        # try to grab some vlans from lab
        models = self.repo_get(self.repo.GRESOURCE_BUNDLE_MODELS, {})
        if "bundle" not in models:
            return None
        lab = models['bundle'].lab
        if lab is None or lab.vlan_manager is None:
            return None
        try:
            vlans = lab.vlan_manager.get_vlan(count=lab.vlan_manager.block_size)
            self.repo_put(self.repo.VLANS, vlans)
            return vlans
        except Exception:
            return None

    def make_mx_network_dict(self, network):
        network_dict = {
            'id': network.id,
            'name': network.name,
            'public': network.is_public
        }

        return network_dict

    def make_mx_resource_dict(self, resource_config):
        resource_dict = {
            'id': resource_config.id,
            'interfaces': [],
            'value': {
                'description': resource_config.profile.description
            }
        }

        for interface_config in resource_config.interface_configs.all():
            connections = []
            for connection in interface_config.connections.all():
                connections.append({'tagged': connection.vlan_is_tagged, 'network': connection.network.id})

            interface_dict = {
                "id": interface_config.id,
                "name": interface_config.profile.name,
                "description": "speed: " + str(interface_config.profile.speed) + "M\ntype: " + interface_config.profile.nic_type,
                "connections": connections
            }

            resource_dict['interfaces'].append(interface_dict)

        return resource_dict
                

    def make_mx_host_dict(self, generic_host):
        host = {
            'id': generic_host.resource.name,
            'interfaces': [],
            'value': {
                "name": generic_host.resource.name,
                "description": generic_host.profile.description
            }
        }
        for iface in generic_host.profile.interfaceprofile.all():
            host['interfaces'].append({
                "name": iface.name,
                "description": "speed: " + str(iface.speed) + "M\ntype: " + iface.nic_type
            })
        return host

    # first step guards this one, so can't get here without at least empty 
    # models being populated by step one
    def get_context(self):
        context = super(Define_Nets, self).get_context()
        context.update({
            'form': NetworkDefinitionForm(),
            'debug': settings.DEBUG,
            'resources': {},
            'networks': {},
            'vlans': [],
            # remove others
            'hosts': [],
            'added_hosts': [],
            'removed_hosts': []
        })
        models = self.repo_get(self.repo.RESOURCE_TEMPLATE_MODELS) # infallible, guarded by prior step
        for resource in models['resources']:
            d = self.make_mx_resource_dict(resource)
            context['resources'][d['id']] = d
            #context['resources'].append(self.make_mx_resource_dict(resource))

        for network in models['networks'].values():
            print("network right now is")
            print(network)
            d = self.make_mx_network_dict(network)
            context['networks'][d['id']] = d
            #context['networks'].append(self.make_mx_network_dict(network))


        #vlans = self.get_vlans()
        #if vlans:
        #    context['vlans'] = vlans
        #try:
        #    models = self.repo_get(self.repo.GRESOURCE_BUNDLE_MODELS, {})
        #    hosts = models.get("hosts", [])
        #    # calculate if the selected hosts have changed
        #    added_hosts = set()
        #    host_set = set(self.repo_get(self.repo.GRB_LAST_HOSTLIST, []))
        #    if len(host_set):
        #        new_host_set = set([h.resource.name + "*" + h.profile.name for h in models['hosts']])
        #        context['removed_hosts'] = [h.split("*")[0] for h in (host_set - new_host_set)]
        #        added_hosts.update([h.split("*")[0] for h in (new_host_set - host_set)])

        #    # add all host info to context
        #    for generic_host in hosts:
        #        host = self.make_mx_host_dict(generic_host)
        #        host_serialized = json.dumps(host)
        #        context['hosts'].append(host_serialized)
        #        if host['id'] in added_hosts:
        #            context['added_hosts'].append(host_serialized)
        #    bundle = models.get("bundle", False)
        #    if bundle:
        #        context['xml'] = bundle.xml or False

        #except Exception:
        #    pass
        print("Context:")
        print(context)

        return context

    def post(self, post_data, user):
        models = self.repo_get(self.repo.GRESOURCE_BUNDLE_MODELS, {})
        if 'hosts' in models:
            host_set = set([h.resource.name + "*" + h.profile.name for h in models['hosts']])
            self.repo_put(self.repo.GRB_LAST_HOSTLIST, host_set)
        try:
            xmlData = post_data.get("xml")
            self.updateModels(xmlData)
            # update model with xml
            self.set_valid("Networks applied successfully")
        except ResourceAvailabilityException:
            self.set_invalid("Public network not availble")
        except Exception as e:
            self.set_invalid("An error occurred when applying networks: " + str(e))

    def updateModels(self, xmlData):
        print("UpdateModels called")
        # return # for now, no clue why this gets called so early!
        models = self.repo_get(self.repo.RESOURCE_TEMPLATE_MODELS, {})
        models["connections"] = {}
        models['networks'] = {}
        given_hosts = None
        interfaces = None
        networks = None
        try:
            given_hosts, interfaces, networks = self.parseXml(xmlData)
        except Exception as e:
            print("tried to parse Xml, got exception instead:")
            print(e)
        print("Update models called for network step")
        print("given hosts, interfaces, networks:")
        print(given_hosts)
        print(interfaces)
        print(networks)
        return

        existing_host_list = models.get("hosts", [])
        existing_hosts = {}  # maps id to host
        for host in existing_host_list:
            existing_hosts[host.resource.name] = host

        bundle = models.get("bundle", ResourceTemplate(owner=self.repo_get(self.repo.SESSION_USER)))

        for net_id, net in networks.items():
            network = Network()
            network.name = net['name']
            network.bundle = bundle
            network.is_public = net['public']
            models['networks'][net_id] = network

        for hostid, given_host in given_hosts.items():
            existing_host = existing_hosts[hostid[5:]]

            for ifaceId in given_host['interfaces']:
                iface = interfaces[ifaceId]
                if existing_host.resource.name not in models['connections']:
                    models['connections'][existing_host.resource.name] = {}
                models['connections'][existing_host.resource.name][iface['profile_name']] = []
                for connection in iface['connections']:
                    network_id = connection['network']
                    net = models['networks'][network_id]
                    connection = NetworkConnection(vlan_is_tagged=connection['tagged'], network=net)
                    models['connections'][existing_host.resource.name][iface['profile_name']].append(connection)
        bundle.xml = xmlData
        self.repo_put(self.repo.GRESOURCE_BUNDLE_MODELS, models)

    def decomposeXml(self, xmlString):
        print("decomposeXml was called")
        """
        Translate XML into useable data.

        This function takes in an xml doc from our front end
        and returns dictionaries that map cellIds to the xml
        nodes themselves. There is no unpacking of the
        xml objects, just grouping and organizing
        """
        connections = {}
        networks = {}
        hosts = {}
        interfaces = {}
        network_ports = {}

        xmlDom = minidom.parseString(xmlString)
        root = xmlDom.documentElement.firstChild
        for cell in root.childNodes:
            cellId = cell.getAttribute('id')
            group = cellId.split("_")[0]
            parentGroup = cell.getAttribute("parent").split("_")[0]
            # place cell into correct group

            if cell.getAttribute("edge"):
                connections[cellId] = cell

            elif "network" in group:
                networks[cellId] = cell

            elif "host" in group:
                hosts[cellId] = cell

            elif "host" in parentGroup:
                interfaces[cellId] = cell

            # make network ports also map to thier network
            elif "network" in parentGroup:
                network_ports[cellId] = cell.getAttribute("parent")  # maps port ID to net ID

        print("DecomposeXml produces:")
        print(connections)
        print(networks)
        print(hosts)
        print(interfaces)
        print(network_ports)
        return connections, networks, hosts, interfaces, network_ports

    # serialize and deserialize xml from mxGraph
    def parseXml(self, xmlString):
        print("hello from parsexml")
        print("parseXml got xml string")
        #print(xmlString)
        networks = {}  # maps net name to network object
        hosts = {}  # cotains id -> hosts, each containing interfaces, referencing networks
        interfaces = {}  # maps id -> interface
        untagged_ifaces = set()  # used to check vlan config
        network_names = set()  # used to check network names
        xml_connections, xml_nets, xml_hosts, xml_ifaces, xml_ports = self.decomposeXml(xmlString)

        # parse Hosts
        for cellId, cell in xml_hosts.items():
            cell_json_str = cell.getAttribute("value")
            cell_json = json.loads(cell_json_str)
            print("this host json should contain 'name':")
            print(cell_json)
            host = {"interfaces": [], "name": cellId, "profile_name": cell_json['name']}
            hosts[cellId] = host

        # parse networks
        for cellId, cell in xml_nets.items():
            escaped_json_str = cell.getAttribute("value")
            json_str = escaped_json_str.replace('&quot;', '"')
            net_info = json.loads(json_str)
            print("This is a network json:")
            print(net_info)
            net_name = net_info['name']
            public = net_info['public']
            if net_name in network_names:
                print("Found non-unique net name")
                raise NetworkExistsException("Non unique network name found")
            network = {"name": net_name, "public": public, "id": cellId}
            networks[cellId] = network
            network_names.add(net_name)

        # parse interfaces
        for cellId, cell in xml_ifaces.items():
            parentId = cell.getAttribute('parent')
            cell_json_str = cell.getAttribute("value")
            cell_json = json.loads(cell_json_str)
            print("this interface json should contain 'name':")
            print(cell_json)
            iface = {"name": cellId, "connections": [], "profile_name": cell_json['name']}
            hosts[parentId]['interfaces'].append(cellId)
            interfaces[cellId] = iface

        # parse connections
        for cellId, cell in xml_connections.items():
            escaped_json_str = cell.getAttribute("value")
            json_str = escaped_json_str.replace('&quot;', '"')
            attributes = json.loads(json_str)
            tagged = attributes['tagged']
            interface = None
            network = None
            src = cell.getAttribute("source")
            tgt = cell.getAttribute("target")
            if src in interfaces:
                interface = interfaces[src]
                network = networks[xml_ports[tgt]]
            else:
                interface = interfaces[tgt]
                network = networks[xml_ports[src]]

            if not tagged:
                if interface['name'] in untagged_ifaces:
                    print("more than one untagged vlan")
                    raise InvalidVlanConfigurationException("More than one untagged vlan on an interface")
                untagged_ifaces.add(interface['name'])

            # add connection to interface
            interface['connections'].append({"tagged": tagged, "network": network['id']})

        print("parseXml returns")
        return hosts, interfaces, networks


class Resource_Meta_Info(WorkflowStep):
    template = 'resource/steps/meta_info.html'
    title = "Extra Info"
    description = "Please fill out the rest of the information about your resource"
    short_title = "pod info"

    def get_context(self):
        context = super(Resource_Meta_Info, self).get_context()
        name = ""
        desc = ""
        bundle = self.repo_get(self.repo.GRESOURCE_BUNDLE_MODELS, {}).get("bundle", False)
        if bundle and bundle.name:
            name = bundle.name
            desc = bundle.description
        context['form'] = ResourceMetaForm(initial={"bundle_name": name, "bundle_description": desc})
        return context

    def post(self, post_data, user):
        form = ResourceMetaForm(post_data)
        if form.is_valid():
            models = self.repo_get(self.repo.GRESOURCE_BUNDLE_MODELS, {})
            name = form.cleaned_data['bundle_name']
            desc = form.cleaned_data['bundle_description']
            bundle = models.get("bundle", ResourceTemplate(owner=self.repo_get(self.repo.SESSION_USER)))
            bundle.name = name
            bundle.description = desc
            models['bundle'] = bundle
            self.repo_put(self.repo.GRESOURCE_BUNDLE_MODELS, models)
            confirm = self.repo_get(self.repo.CONFIRMATION)
            if "resource" not in confirm:
                confirm['resource'] = {}
            confirm_info = confirm['resource']
            confirm_info["name"] = name
            tmp = desc
            if len(tmp) > 60:
                tmp = tmp[:60] + "..."
            confirm_info["description"] = tmp
            self.repo_put(self.repo.CONFIRMATION, confirm)
            self.set_valid("Step Completed")
        else:
            self.set_invalid("Please correct the fields highlighted in red to continue")
