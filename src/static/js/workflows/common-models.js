/*
common-models.js
Defines classes used by the workflows
Functions as the "model" part of MVC
*/

// Provided by the LibLaaS API
// TemplateBlob classes
class TemplateBlob {
    constructor() {
        this.id = null; // UUID (String)
        this.owner = null; // String
        this.lab_name = null; // String
        this.pod_name = null; // String
        this.pod_desc = null; // String
        this.public = null; // bool
        this.host_list = []; // List<HostConfigBlob>
        this.networks = []; // List<NetworkBlob>
    }

    // Deserialize incoming JSON and set all fields
    fromJSON() {

    }
}

class HostConfigBlob {
    constructor() {
        this.hostname; // String 
        this.flavor; // UUID (String)
        this.image; // UUID (String)
        this.cifile = []; // List<String> 
    }
}

class NetworkBlob {
    constructor() {
        this.name; //String
        this.bondgroups = []; //List<BondgroupBlob>,
    }
}

class BondgroupBlob {
    constructor() {
        this.connections = []; //List<ConnectionBlob>
    }
}

class ConnectionBlob {
    constructor() {
        this.iface; // IfaceBlob,
        this.tagged; // bool,
    }
}

class IfaceBlob {
    constructor() {
        this.hostname; // String,
        this.name; // String,
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
    constructor({flavor_id, name, description}) {
        this.flavor_id; // UUID (String)
        this.name; // String
        this.description; // String

        // Object destructuring
        if (flavor_id || name || description) {
            this.flavor_id = flavor_id;
            this.name = name;
            this.description = description;
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