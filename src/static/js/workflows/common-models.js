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
    constructor() {
        this.template_id; // UUID (String)
        this.allowed_users = []; // List<String>,
        this.global_cifile; // String,
    }
}

// Utility Classes
class ImageBlob {
    constructor() {
        this.name; // String
        this.description // String,
    }
}

// Not yet implemented on LibLaaS
class LabBlob {
    constructor(jsonBlob) {
        this.name; // String
        this.description; // String
        this.location; //String
        this.status; // Number

        if (jsonBlob) this.fromJSON;
    }

    fromJSON(jsonBlob) {
        this.name = jsonBlob.name;
        this.description = jsonBlob.description;
        this.location = jsonBlob.location;
        this.status = jsonBlob.status
    }
}