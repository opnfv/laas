/*
common-models.js
Defines classes used by the workflows
Functions as the "model" part of MVC
*/

// Provided by the LibLaaS API
// TemplateBlob classes
class TemplateBlob {
    constructor({id, owner, lab_name, pod_name, pod_desc, pub, host_list, networks}) {
        this.id = null; // UUID (String)
        this.owner = null; // String
        this.lab_name = null; // String
        this.pod_name = null; // String
        this.pod_desc = null; // String
        this.public = null; // bool
        this.host_list = []; // List<HostConfigBlob>
        this.networks = []; // List<NetworkBlob>

        // Object destructuring
        if (id || owner) {
            this.id = id;
            this.owner = owner
            this.lab_name = lab_name;
            this.pod_name = pod_name;
            this.pod_desc = pod_desc;
            this.public = pub
        }

        // Separated so that the lists are never set to null
        if (host_list) {
            this.host_list = host_list;
        }

        if (networks) {
            this.networks = networks;
        }
    }

    /**
     * Takes a network name (string) and returns the network stored in the template, or null if it does not exist
     * @param {String} network_name 
     */
    findNetwork(network_name) {
        for (const network of this.networks) {
            if (network.name == network_name) {
                return network;
            }
        }

        // Did not find it
        return null;
    }


    /**
     * Takes a hostname (string) and returns the host stored in the template, or null if it does not exist
     * @param {String} hostname
     */
        findHost(hostname) {
            for (const host of this.host_list) {
                if (host.hostname == hostname) {
                    return host;
                }
            }
    
            // Did not find it
            return null;
        }
}

class HostConfigBlob {
    constructor({hostname, flavor, image, cifile}) {
        this.hostname; // String 
        this.flavor; // UUID (String)
        this.image; // UUID (String)
        this.cifile = []; // List<String> 

        if (hostname) {
            this.hostname = hostname;
            this.flavor = flavor;
            this.image = image;
            this.cifile = cifile;
        }
    }
}

class NetworkBlob {
    constructor({name, bondgroups}) {
        this.name; //String
        this.bondgroups = []; //List<BondgroupBlob>,

        // Object destructuring
        if (name) {
            this.name = name;
        }

        // Seperate check so that bondgroups is never set to null
        if (bondgroups) {
            this.bondgroups = bondgroups;
        } else {
            this.addBondgroup(new BondgroupBlob({}));
        }
    }

    /** Takes a BondgroupBlob and adds to the list. Creates an empty list first if null */
    addBondgroup(bg) {
        if (this.bondgroups == null) {
            this.bondgroups = [];
        }

        this.bondgroups.push(bg);
    }
}

class BondgroupBlob {
    constructor({connections}) {
        this.connections = []; //List<ConnectionBlob>

        if (connections) {
            this.connections = connections;
        }
    }

    /** Takes a ConnectionBlob and adds to the list. Creates an empty list first if null */
    addConnection(conn) {
        if (this.connections == null) {
            this.connections = [];
        }

        this.connections.push(conn);
    }
}

class ConnectionBlob {
    constructor({iface, tagged}) {
        this.iface; // IfaceBlob,
        this.tagged; // bool,

        if (iface || tagged) {
            this.iface = iface;
            this.tagged = tagged;
        }
    }
}

class IfaceBlob {
    constructor({hostname, name}) {
        this.hostname; // String,
        this.name; // String,

        if (hostname || name) {
            this.hostname = hostname;
            this.name = name;
        }
    }
}

// BookingClasses
class BookingBlob {
    constructor({template_id, allowed_users, global_cifile}) {
        this.template_id; // UUID (String)
        this.allowed_users = []; // List<String>,
        this.global_cifile; // String,

        if (template_id || allowed_users || global_cifile) {
            this.template_id = template_id;
            this.allowed_users = allowed_users;
            this.global_cifile = global_cifile;
        }
    }
}

class BookingMetaData {
    constructor() {
        this.purpose = null; // String
        this.project = null; // String
        this.length = 1; // Number
    }
}

// Utility Classes
class ImageBlob {
    constructor({image_id, name}) {
        this.image_id; // UUID (String)
        this.name // String,

        if (image_id || name) {
            this.image_id = image_id;
            this.name = name;
        }
    }
}

class FlavorBlob {
    constructor({flavor_id, name, interfaces}) {
        this.flavor_id; // UUID (String)
        this.name; // String
        this.interfaces; // List<String>

        // Object destructuring
        if (flavor_id || name) {
            this.flavor_id = flavor_id;
            this.name = name;
        }

        if (interfaces) {
            this.interfaces = interfaces;
        }
    }

}

class LabBlob {
    constructor({name, description, location, status}) {
        this.name; // String
        this.description; // String
        this.location; //String
        this.status; // Number

        // Object destructuring
        if (name || description || location || status) {
            this.name = name;
            this.description = description;
            this.location = location;
            this.status = status;
        }
    }
}