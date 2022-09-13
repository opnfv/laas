// PodTemplate Classes
class Connection {
    constructor(network, tagged) {
      this.network = network; // String
      this.tagged = tagged; // Boolean
    }

    equals(connection) {
      if (this.network != connection.network) return false;
      if (this.tagged != connection.tagged) return false;
      return true;
    }
  }

  class HostInterface {
    constructor(name) {
      this.name = name; // String
      this.connections = []; // Array of Connection objects
    }

    add_connection(connection) {
      this.connections.push(connection);
    }

    equals(host_interface) {
      if (this.name != host_interface.name) return false;
      if (!this.connections.equals(host_interface.connections)) return false;

      return true;
    }

    hasUntagged() {
      for (let i in this.connections) {
        if (this.connections[i].tagged == false) {
          return true;
        }
      }

      return false;
    }

    remove_connection(connection) {

      let index = -1;

      for (let i in this.connections) { // Find index of connection to delete
        if (connection.equals(this.connections[i])) {
          index = i;
          break;
        }
      }

      if (index == -1) {
        console.log("Connection not in list. Unable to remove");
        return;
      }

      // Create temp array and copy all connection objects except the one to be removed
      const temp = [];
      for (let i in this.connections) {
        if (i != index) {
          temp.push(this.connections[i])
        }
      }

      this.connections = temp;

    }
  }


  class Host {
    constructor(hostname, flavor, image) {
      this.hostname = hostname; // String
      this.flavor = flavor; // String
      this.image = image; // String
      this.interfaces = []; // Array of HostInterface objects
    }

    add_interface(host_interface) {
      this.interfaces.push(host_interface); // HostInterface object
    }

  }

  // Class that holds information about the pod being designed
  class PodTemplate {
    constructor() {
      this.username = ""; // String
      this.lab_name = ""; // String
      this.pod_name = ""; // String
      this.pod_desc = ""; // String
      this.host_list = []; // Array of Host objects
      this.network_list = []; // Array of strings
    }

    toString() {
      let str = "";
      str += "Template Owner: " + this.username;
      str += "\nLab: " + this.lab_name;
      str += "\nPod Name: " + this.pod_name;
      str += "\nPod Desc: " + this.pod_desc;
      str += "\nHost List:";
      for (let i in this.host_list) {
        str += "\n  " + this.host_list[i].hostname +':'
        for (let j in this.host_list[i].interfaces) {
          str += "\n    " + this.host_list[i].interfaces[j].name;
          for (let k in this.host_list[i].interfaces[j].connections) {
            str += "\n      " + this.host_list[i].interfaces[j].connections[k].network + "," + this.host_list[i].interfaces[j].connections[k].tagged;
          }
        }
      }
      str += "\nNetworks: " + this.network_list;

      return str;
    }

    add_host(host) {
      this.host_list.push(host); // Host object
    }

    remove_host(hostname) {
      let index = -1;

      for (let i in this.host_list) { // Find index of host to delete based off of hostname (string)
        if (hostname == this.host_list[i].hostname) {
          index = i;
          break;
        }
      }

      if (index == -1) {
        console.log("Host not in list. Unable to remove");
        return;
      }

      // Create temp array and copy all host objects except the one to be removed
      const temp = [];
      for (let i in this.host_list) {
        if (i != index) {
          temp.push(this.host_list[i])
        }
      }

      this.host_list = temp;
    }

    add_network(network) {
      this.network_list.push(network); // String
    }

    remove_network(network) {
      let index = -1;

      for (let i in this.network_list) { // Find index of network to delete
        if (network == this.network_list[i]) {
          index = i;
          break;
        }
      }

      if (index == -1) {
        console.log("Network not in list. Unable to remove");
        return;
      }

      // Create temp array and copy all networks except the one to be removed
      const temp = [];
      for (let i in this.network_list) {
        if (i != index) {
          temp.push(this.network_list[i])
        }
      }

      // Mutate this.network_list
      this.network_list = temp;
    }

    import_template(liblaas_data) {
      // TODO: Read JSON from liblaas and convert back to js object
    }

    export_template() {
      return JSON.stringify(this);
    }

  }