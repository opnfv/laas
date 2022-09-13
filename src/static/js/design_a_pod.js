  // LibLaas bridges
  function get_labs() {
    // TODO Talk to LibLaas to get lab list

    const lab = {'name': 'UNH_IOL', 'description': 'University of New Hampshire InterOperability Lab',
    'location': 'University of New Hampshire InterOperability Lab', 'status': 0 };

    let lab_list = [];
    lab_list.push(lab);
    return lab_list;
  }

  function get_flavors(lab) {
    // TODO Talk to LibLaas to get flavor list
    if (lab == 'UNH_IOL') {
      return ["Gigabyte Arm", "HPE x86 25G"];
    }
    console.log("No lab: " + lab);
    console.log("Lab not found error");
  }

  function get_images(flavor) {
    // TODO Talk to LibLaas to get image list for specific flavor
    if (flavor == "Gigabyte Arm") {
      return ["Ubuntu 20.04 LTS (aarch 64)"];
    }

    if (flavor == "HPE x86 25G") {
      return ['Ubuntu 20.04 LTS (x86_64)', 'Fedora 33 (x86_64)'];
    }

    console.log("Flavor not found error");
  }

  function get_interface_count(flavor) {
    // TODO Talk to liblaas to get amount of interfaces depending on flavor
    return 4;
  }

  function get_interface_name(flavor) {
    // TODO Talk to liblaas to get name of interface depending on flavor
    return "ENS";
  }

  function resume_session(template_json) {
    // TODO: Receive JSON from liblaas, recreate cards on screen, user can keep creating template from where it was left off
  }

  // Session Class
  class Design_Workflow {
    constructor(PodTemplate) {
      // Takes a PodTemplate object
      this.pod = PodTemplate;
      this.step = 0;
      this.sections = ["select_lab", "add_hosts", "add_networks", "configure_connections", "pod_summary"];
      this.selected_interface = "";
    }

    go_prev() {
      this.step--;
      let section = this.sections[this.step];


      if (this.step == 3) {
        document.getElementById('workflow-next').removeAttribute('disabled');
      }

      if (this.step == 0) {
        document.getElementById('workflow-prev').setAttribute('disabled' , '');
      }

      document.getElementById(section).removeAttribute('hidden');
      document.getElementById(section).scrollIntoView({behavior: 'smooth'});

    }


    go_next() {
      this.step++;
      let section = this.sections[this.step];

      if (this.step == 4) {
        document.getElementById('workflow-next').setAttribute('disabled' , '');
      } 

      if (this.step == 1) {
        document.getElementById('workflow-prev').removeAttribute('disabled');
      }

      document.getElementById(section).removeAttribute('hidden');
      document.getElementById(section).scrollIntoView({behavior: 'smooth'});

    }


    initialize_elements() {
      document.getElementById('workflow-next').removeAttribute('disabled');
      document.getElementById('workflow-prev').setAttribute('disabled' , '');
      document.getElementById('select_lab').removeAttribute('hidden');
      document.getElementById('add_hosts').setAttribute('hidden', '');
      document.getElementById('add_networks').setAttribute('hidden', '');
      document.getElementById('configure_connections').setAttribute('hidden', '');
      document.getElementById('pod_summary').setAttribute('hidden', '');
      document.getElementById('pod-name-input').value = '';
      document.getElementById('pod-desc-input').value = '';

      // Add public network by default
      work.pod.add_network('public');
      const network_input = document.getElementById('network-input');
      const network_plus_card = document.getElementById('network-plus-card');
      const new_card = document.createElement('div');
      new_card.classList.add("col-lg-3", "col-sm-12", "my-3");
      new_card.innerHTML = `
      <div class="card">
        <div class="text-center">
          <h3 class="p-5 m-5">public</h3>
        </div>
        <div class="card-footer">
        </div>
      </div>`;
      network_plus_card.parentNode.insertBefore(new_card, network_plus_card);


    }


    display_labs() {

      const lab_list = get_labs();
      const card_deck = document.getElementById('lab_cards');
      for (let i in lab_list) {
        const new_col = document.createElement('div');
        new_col.classList.add('card','col-lg-3', 'col-sm-12');
        new_col.id = lab_list[i].name;
        let status;
        if (lab_list[i].status == 0) {
          status = "Up";
        } else if (lab_list[i].status == 100) {
          status = "Down for Maintenance";
        } else if (lab_list[i].status == 200) {
          status = "Down";
        } else {
          status = "Unknown";
        }

        new_col.innerHTML = `
        <div class="card-header">
            <h3 class="mt-2">` + lab_list[i].name + `</h3>
        </div>
        <ul class="list-group list-group-flush h-100">
          <li class="list-group-item">Name: ` + lab_list[i].name + `</li>
          <li class="list-group-item">Description: ` + lab_list[i].description + `</li>
          <li class="list-group-item">Location: ` + lab_list[i].location + `</li>
          <li class="list-group-item">Status: `+ status + `</li>
        </ul>
        <div class="card-footer">
            <button class="btn btn-success w-100" href="#" onclick="work.select_lab('` + lab_list[i].name  + `')">Select</a>
        </div>
        `

        card_deck.appendChild(new_col);
      }
    }

    select_lab(lab_name) {
      // Check if any elements have been selected
      if (this.pod.lab_name == "") {

        document.getElementById(lab_name).classList.add("selected_node");
        work.go_next();
        this.pod.lab_name = lab_name;
      } else {
        // a lab is already selected, clear already selected resources
        if(confirm('Unselecting a lab will reset all selected resources, are you sure?')) {
            work.delete_template();
            return false;
        }
      }
    return true;
    }

    delete_template() {
      // TODO: Remove template from LibLaas
      location.reload();
    }

    add_host_button() {

      // Prerequisite step check
      if (this.pod.lab_name == "") {
        alert("Please Select a lab before adding hosts.");
        work.go_prev();
        return
      }

      // Declare variables
      const flavor_input = document.getElementById('flavor-input');
      const hostname_input = document.getElementById('hostname-input');
      const image_input = document.getElementById('image-input');
      const error_message = document.getElementById('add-host-error-msg');
      let flavors = get_flavors(this.pod.lab_name);

      // Reset form fields
      flavor_input.innerHTML = "";
      flavor_input.classList.remove('invalid_field');
      hostname_input.value = "";
      hostname_input.classList.remove('invalid_field');
      image_input.innerHTML = "";
      image_input.setAttribute('disabled', "");
      error_message.innerText = "";

      const default_selection = document.createElement('option');
      default_selection.value = "Select Flavor";
      default_selection.innerText = "Select Flavor";
      default_selection.setAttribute("selected", '');
      default_selection.setAttribute("disabled", '');
      flavor_input.appendChild(default_selection);

      for (let i in flavors) {
        const new_flavor = document.createElement('option');
        new_flavor.value = flavors[i];
        new_flavor.innerText = flavors[i];
        flavor_input.appendChild(new_flavor);
      }

      // Listen for flavor selection changes
      flavor_input.addEventListener('change', (event) => {
        image_input.innerHTML = "";
        flavor_input.classList.remove('invalid_field');
        image_input.removeAttribute('disabled');

        let images = get_images(flavor_input.value);
        for (let i in images) {
          const new_image = document.createElement('option');
          new_image.value = images[i];
          new_image.innerText = images[i];
          image_input.appendChild(new_image);
        }
      })


      // Listen for hostname focus to remove red border and error message
      hostname_input.addEventListener('focusin', (event) => {
          hostname_input.classList.remove('invalid_field');
          error_message.innerText = "";
      })

      // Launch modal
      $("#host-modal").modal('toggle');
    }

    add_host() {
      // Declare variables
      const flavor_input = document.getElementById('flavor-input');
      const hostname_input = document.getElementById('hostname-input');
      const image_input = document.getElementById('image-input');
      const error_message = document.getElementById('add-host-error-msg');
      const plus_card = document.getElementById('host-plus-card');


      // Input validation
      if (flavor_input.value == 'Select Flavor' ) {
        flavor_input.classList.add('invalid_field');
        error_message.innerText = 'Please select a flavor';
        return;
      }

      if (image_input.value == '') {
        error_message.innerText = 'Please select an image';
        return
      }

      if (hostname_input.value == '') {
        error_message.innerText = 'Please enter a valid hostname';
        hostname_input.classList.add('invalid_field');
        return
      }

      if (hostname_input.value.length > 63) {
        error_message.innerText = 'Device names cannot exceed 63 characters';
        hostname_input.classList.add('invalid_field');
        return
      }

      if (!(hostname_input.value.match(/^[0-9a-z-]+$/i))) {
        error_message.innerText = 'Device names must only contain alphanumeric characters and dashes';
        hostname_input.classList.add('invalid_field');
        return
      }

      if ((hostname_input.value.charAt(0).match(/^[0-9-]+$/)) || (hostname_input.value.charAt(hostname_input.value.length - 1) == '-')) {
        error_message.innerText = 'Device names must start with a letter and end with a letter or digit.';
        hostname_input.classList.add('invalid_field');
        return
      }

      for (let i in this.pod.host_list) {
        if (hostname_input.value == this.pod.host_list[i].hostname) {
          error_message.innerText = 'Devices must have unique names. Please try again.';
          hostname_input.classList.add('invalid_field');
          return;
        }
      }

      $('#host-modal').modal('hide')

      // Create host object
      const new_host = new Host(hostname_input.value, flavor_input.value, image_input.value);

      // Add default interfaces and connections
      for (let i = 0; i < get_interface_count(flavor_input.value); i++) {
        let interface_name = get_interface_name(flavor_input.value) + i;
        const new_interface = new HostInterface(interface_name);
        new_host.add_interface(new_interface);
      }

      // Add host object to template host list
      this.pod.add_host(new_host);

      // Create Host card
      const new_card = document.createElement("div");
      new_card.classList.add("col-lg-3", "col-sm-12", "my-3");
      new_card.innerHTML = `
        <div class="card">
          <div class="card-header">
            <h3 class="mt-2">` + new_host.flavor + `</h3>
          </div>
          <ul class="list-group list-group-flush h-100 mb-4">
            <li class="list-group-item">Hostname: ` + new_host.hostname + `</li>
            <li class="list-group-item">Image: ` + new_host.image + `</li>
          </ul>
          <div class="card-footer">
            <button class="btn btn-danger w-100" id="delete-host-` + new_host.hostname + `" onclick="work.delete_host_button(id)">Delete</button>
          </div>
        </div>
      `;
      plus_card.parentNode.insertBefore(new_card, plus_card);

      if (this.pod.host_list.length == 8) {
        plus_card.hidden = true;
      }

      this.new_connection_card(new_host.hostname);
      this.update_host_summary();
    }

    delete_host_button(button_id) {
      // Uses button id string to find the hostname to delete from the pod template.
      // All host delete buttons are in the form "delete-host-hostname"

      // Delete host from template
      this.pod.remove_host(button_id.substring(12));

      // Delete host card
      document.getElementById(button_id).parentElement.parentElement.parentElement.remove();

      // Show plus card
      if (this.pod.host_list.length == 7) {
        document.getElementById('host-plus-card').hidden = false;
      }

      // Delete connections card
      document.getElementById('connection-' + button_id.substring(12)).remove();


      // Update host summary
      this.update_host_summary();
    }

    delete_network_button(button_id) {
      // Uses button id string to find the network to delete from the pod template.
      // All network delete buttons are in the form "delete-network-networkname"

      // All connections must be cleared if a network is added after a connection already exists
      for (let i in this.pod.host_list) {
        for (let j in this.pod.host_list[i].interfaces) {
          if (this.pod.host_list[i].interfaces[j].connections.length > 0) {
            if(!confirm('Removing a network will remove ALL connections, are you sure?')) {
            return;
            } else {
              break;
            }
          }
        }
      }

      // Delete all connections
      for (let i in this.pod.host_list) {
        for (let j in this.pod.host_list[i].interfaces) {
          this.pod.host_list[i].interfaces[j].connections = [];
        }
      }

      // Delete network from template
      this.pod.remove_network(button_id.substring(15));

      // Delete network card
      document.getElementById(button_id).parentElement.parentElement.parentElement.remove();

      // Show plus card
      if (this.pod.network_list.length == 7) {
        document.getElementById('network-plus-card').hidden = false;
      }

    }

    add_network_button() {
      // Prerequisite step check
      if (this.pod.lab_name == "") {
        alert("Please Select a lab before adding networks.");
        for (let i = 0; i < 2; i++) {
          work.go_prev();
        }
        return
      }

      // All connections must be cleared if a network is added after a connection already exists
      for (let i in this.pod.host_list) {
        for (let j in this.pod.host_list[i].interfaces) {
          if (this.pod.host_list[i].interfaces[j].connections.length > 0) {
            if(!confirm('Adding a network will remove ALL connections, are you sure?')) {
            return;
            } else {
              break;
            }
          }
        }
      }

      // Delete all connections
      for (let i in this.pod.host_list) {
        for (let j in this.pod.host_list[i].interfaces) {
          this.pod.host_list[i].interfaces[j].connections = [];
        }
      }

      const network_input = document.getElementById('network-input');

      // Reset form fields
      network_input.value = ''
      network_input.classList.remove('invalid_field');
      document.getElementById('add-network-error-msg').innerText = '';

      // Remove red border on focus
      network_input.addEventListener('focusin', (event) => {
          network_input.classList.remove('invalid_field');

      })

      // Show modal
      $("#network-modal").modal('toggle');
    }

    add_network() {
      // Declare variables
      const network_input = document.getElementById('network-input');
      const error_message = document.getElementById('add-network-error-msg')
      const network_plus_card = document.getElementById('network-plus-card');

      // Input validation
      if (network_input.value == '' ) {
        network_input.classList.add('invalid_field');
        error_message.innerText = 'Please enter a valid network name';
        return;
      }


      if (network_input.value.length > 63) {
        error_message.innerText = 'Network names cannot exceed 63 characters';
        network_input.classList.add('invalid_field');
        return
      }

      if (!(network_input.value.match(/^[0-9a-z-]+$/i))) {
        error_message.innerText = 'Network names must only contain alphanumeric characters and dashes';
        network_input.classList.add('invalid_field');
        return
      }

      if ((network_input.value.charAt(0).match(/^[0-9-]+$/)) || (network_input.value.charAt(network_input.value.length - 1) == '-')) {
        error_message.innerText = 'Network names must start with a letter and end with a letter or digit.';
        network_input.classList.add('invalid_field');
        return
      }

      for (let i in this.pod.network_list) {
        if (network_input.value == this.pod.network_list[i]) {
          network_input.classList.add('invalid_field');
          error_message.innerText = 'Networks must have unique names';
          return;
        }
      }

      // Dismiss modal 
      $('#network-modal').modal('hide');

      // Add network to PodTemplate
      this.pod.add_network(network_input.value);

      // Create network card
      const new_card = document.createElement('div');
      new_card.classList.add("col-lg-3", "col-sm-12", "my-3");
      new_card.innerHTML = `<div class="card">
            <div class="text-center">
              <h3 class="p-5 m-5">` + document.getElementById('network-input').value + `</h3>
            </div>
            <div class="card-footer">
                <button class="btn btn-danger w-100" id="delete-network-` + network_input.value + `" onclick="work.delete_network_button(id)">Delete</button>
            </div>
          </div>`;
      network_plus_card.parentNode.insertBefore(new_card, network_plus_card);

      if (this.pod.network_list.length == 8) {
        network_plus_card.hidden = true;
      }
    }

    initialize_connections(hostname) {
      const interface_buttons_tr = document.getElementById('connections_interface_list');
      interface_buttons_tr.innerHTML = '';
      const table = document.getElementById('connections_widget');
      table.setAttribute('hidden', '');
      table.innerHTML = `
      <tr>
        <th>Network</th>
        <th colspan='2'>Vlan</th>
      </tr>
      `;
      const tbody = document.createElement('tbody');

      let host;
      for (let i in this.pod.host_list) {
        if (hostname == this.pod.host_list[i].hostname) {
          host = this.pod.host_list[i];
          break;
        }
      }

      // Create interface buttons
      for (let i in host.interfaces) {
        const td_interface = document.createElement('td');
        const btn_interface = document.createElement('button');
        btn_interface.classList.add("btn", "w-100",  "h-100", "interface-btn", 'btn-secondary');
        btn_interface.id = "select-interface-" + i + "_" + hostname;
        btn_interface.setAttribute("onclick", "work.select_td_interface(id)");
        btn_interface.innerText = host.interfaces[i].name;
        td_interface.appendChild(btn_interface);
        interface_buttons_tr.appendChild(td_interface);
      }

      for (let i in this.pod.network_list) {

        const new_row = document.createElement('tr');

        // Network td
        const td_network = document.createElement('td');
        if (i < this.pod.network_list.length) {
          td_network.innerText = this.pod.network_list[i];
        }
        new_row.appendChild(td_network);

        // tagged td
        const td_tagged= document.createElement('td');
        if (i < this.pod.network_list.length) {
          const btn_tagged = document.createElement('button');
          btn_tagged.classList.add("btn", "w-100", "h-100", "vlan-radio", "tagged");
          btn_tagged.id = "tagged_" + this.selected_interface + "_" + this.pod.network_list[i] + "_" + hostname;
          btn_tagged.setAttribute("onclick" ,"work.vlan_radio(id)");
          btn_tagged.innerText = "tagged";

          td_tagged.appendChild(btn_tagged);
        }
        new_row.appendChild(td_tagged);

        // untagged td
        const td_untagged = document.createElement('td');
        if (i < this.pod.network_list.length) {
          const btn_untagged = document.createElement('button');
          btn_untagged.classList.add("btn", "w-100", "h-100", "vlan-radio", "untagged");
          btn_untagged.id = "untagged_" + this.selected_interface + "_" + this.pod.network_list[i] + "_" + hostname;
          btn_untagged.setAttribute("onclick" ,"work.vlan_radio(id)");
          btn_untagged.innerText = "untagged";

          td_untagged.appendChild(btn_untagged);
        }
        new_row.appendChild(td_untagged);

        tbody.appendChild(new_row);
      }

      table.appendChild(tbody);

      // Don't add connections if already there
      for (let i in host.interfaces) {
        if (host.interfaces[i].connections.length != 0) {
          return;
        }
      }

      // pod template initialize connections
      for (let i in host.interfaces) {
        for (let j in this.pod.network_list) {
          host.interfaces[i].add_connection(new Connection(this.pod.network_list[j], null))
        }
      }
    }

    vlan_radio(id) {
      const button = document.getElementById(id);
      let params = id.split("_");
      let option = params[0];
      let interface_name = params[1];
      let network = params[2];
      let hostname = params[3];

      // Find host and interface objects from pod template
      let host;
      for (let i in this.pod.host_list) {
        if (hostname == this.pod.host_list[i].hostname) {
          host = this.pod.host_list[i];
          break;
        }
      }
      let selected_interface;
      for (let i in host.interfaces) {
        if (interface_name == host.interfaces[i].name) {
          selected_interface = host.interfaces[i];
          break;
        }
      }

      // Highlight selection
      button.classList.add('btn-success');


      const untagged_buttons = document.querySelectorAll('button.untagged:not(.btn-success)');
      // Re-selecting a selected button will remove the connection
      if (option == 'tagged') {
        for (let i in selected_interface.connections) {
          if (selected_interface.connections[i].network == network && selected_interface.connections[i].tagged == true) {
            button.classList.remove('btn-success')
            selected_interface.connections[i].tagged = null
            return
          }
        }
      } else {
        for (let i in selected_interface.connections) {
          if (selected_interface.connections[i].network == network && selected_interface.connections[i].tagged == false) {
            button.classList.remove('btn-success')
            selected_interface.connections[i].tagged = null
            for (let i in untagged_buttons) {
              untagged_buttons.item(i).removeAttribute('disabled');
            }
            return
          }
        }
      }

      // Unselect other button
      if (option == 'tagged') {
        document.getElementById('untagged_' + interface_name + "_" + network + "_" + hostname).classList.remove('btn-success');
        for (let i in selected_interface.connections) {
          if (selected_interface.connections[i].network == network) {
            selected_interface.connections[i].tagged = true;
          }
        }
      } else {
        document.getElementById('tagged_' + interface_name + "_" + network + "_" + hostname).classList.remove('btn-success');
        for (let i in selected_interface.connections) {
          if (selected_interface.connections[i].network == network) {
            selected_interface.connections[i].tagged = false;
          }
        }
      }

      // Disable all untagged buttons if one is already selected
      if (option == 'untagged') {
        for (let i in untagged_buttons) {
          untagged_buttons.item(i).setAttribute('disabled', '');
        }
      } else {
        // Re-enable buttons if there is no longer an untagged connection
        for (let i in selected_interface.connections) {
          if (selected_interface.connections[i].tagged == false) return;
        }
        for (let i in untagged_buttons) {
          untagged_buttons.item(i).removeAttribute('disabled');
        }
      }
    }

    new_connection_card(hostname) {
      const card_deck = document.getElementById('connection_cards');

      const new_card = document.createElement('div');
      new_card.classList.add("col-lg-3", "col-sm-12", "my-3");
      new_card.id = 'connection-' + hostname;
      new_card.innerHTML = `<div class="card">
            <div class="text-center">
              <h3 class="p-5 m-5">` + hostname + `</h3>
            </div>
            <div class="card-footer">
                <button class="btn btn-info w-100" id="configure-connection-` + hostname + `" onclick="work.configure_connection_button(id)">Configure</button>
            </div>
            </div>`;

      card_deck.appendChild(new_card);
    }

    configure_connection_button(id) {
      // Prerequisite step check
      if (this.pod.network_list.length == 0) {
      alert("Please add a network before configuring connections.");
      work.go_prev();
      return;
      }

      work.initialize_connections(id.substring(21)); //passes hostname as a parameter
      $("#connection-modal").modal('toggle');

    }


    select_td_interface(id) {
      // Unhighlight previously selected interface
      const prev =  document.querySelector(".interface-btn.btn-info");
      if (prev) {
        prev.classList.remove('btn-info');
      }

      // Highlight new interface and grey out all others
      document.getElementById(id).classList.add('btn-info');
      document.getElementById(id).classList.remove('btn-secondary');
      this.selected_interface = document.getElementById(id).innerText;
      const not_selected = document.querySelectorAll('.interface-btn:not(.btn-info)');
      for (let i in not_selected) {
        not_selected.item(i).classList.add('btn-secondary');
      }

      // Enable radios and change id to match selected interface
      document.getElementById('connections_widget').removeAttribute('hidden');
      const radios = document.querySelectorAll(".vlan-radio");
      for (let i in radios) {
        radios.item(i).classList.remove('btn-success');
        let params = radios.item(i).id.split("_");
              let option = params[0];
              let network = params[2];
              let hostname = params[3];
        radios.item(i).id = option + "_" + this.selected_interface + "_" + network + "_" + hostname;

        // Find host and interface objects from pod template
        let host;
        for (let k in this.pod.host_list) {
          if (hostname == this.pod.host_list[k].hostname) {
            host = this.pod.host_list[k];
            break;
          }
        }
        let selected_interface;
        for (let k in host.interfaces) {
          if (this.selected_interface == host.interfaces[k].name) {
            selected_interface = host.interfaces[k];
            break;
          }
        }
        radios.item(i).removeAttribute('disabled');
        for (let j in selected_interface.connections) {
          if (selected_interface.connections[j].tagged != null) {
            if (selected_interface.connections[j].tagged && option == 'tagged' && selected_interface.connections[j].network == network) {
              radios.item(i).classList.add('btn-success');
            } else if (!selected_interface.connections[j].tagged && option == 'untagged' && selected_interface.connections[j].network == network) {
              radios.item(i).classList.add('btn-success');
            }
          } 
        }
      }

      // Property disable / re-enable untagged buttons
      const untagged_buttons = document.querySelectorAll('button.untagged:not(.btn-success)');
      if (untagged_buttons.length != this.pod.network_list.length) {
        for (let index in untagged_buttons) {
        untagged_buttons.item(index).setAttribute('disabled', '');
        }
      }

    }

    update_host_summary() {
      const host_summary = document.getElementById('host_summary');
      host_summary.innerHTML = '';
      for(let i in this.pod.host_list) {
        const new_li = document.createElement('li');
        const host = this.pod.host_list[i];
        new_li.classList.add('list-group-item');
        new_li.innerText = host.hostname + ': ' + host.flavor + ' (' + host.image + ')';
        host_summary.appendChild(new_li);
      }
    }

    submit() {

      // Prerequisite step check
      if (this.pod.lab_name == "") {
        alert("Please Select a lab.");
        for (let i = 0; i < 4; i++) {
          work.go_prev();
        }
        return;
      }

      if (this.pod.host_list.length == 0) {
        alert("Please add a host.");
        for (let i = 0; i < 3; i++) {
          work.go_prev();
        }
        return;
      }

      if (this.pod.network_list.length == 0) {
        alert("Please add a network.");
        for (let i = 0; i < 2; i++) {
          work.go_prev();
        }
        return;
      }

      // TODO: Validate for connection minimums
      if(false) {
        alert("Please configure connections.");
        work.go_prev();
        return;
      }

      const error_message = document.getElementById('submit-error-msg');
      const pod_name_input = document.getElementById('pod-name-input');
      const pod_desc_input = document.getElementById('pod-desc-input');

      // Input validation
      if (pod_name_input.value == "") {
        error_message.innerText = "Please enter a pod name";
        pod_name_input.classList.add('invalid_field');

        document.getElementById('pod-name-input').addEventListener('focusin', (event) => {
        pod_name_input.classList.remove('invalid_field');
        error_message.innerText = "";
        })
        return;
      }

      if (pod_name_input.value.length > 53) {
        error_message.innerText = "Pod name cannot exceed 53 characters";
        pod_name_input.classList.add('invalid_field');

        document.getElementById('pod-name-input').addEventListener('focusin', (event) => {
        pod_name_input.classList.remove('invalid_field');
        error_message.innerText = "";
        })
        return;
      }

      if (!(pod_name_input.value.match(/^[a-z0-9~@#$^*()_+=[\]{}|,.?': -]+$/i))) {
        error_message.innerText = "Pod name contains invalid characters";
        pod_name_input.classList.add('invalid_field');

        document.getElementById('pod-name-input').addEventListener('focusin', (event) => {
        pod_name_input.classList.remove('invalid_field');
        error_message.innerText = "";
        })
        return;
      }

      if (pod_desc_input.value == "") {
        error_message.innerText = "Please enter a pod description";
        pod_desc_input.classList.add('invalid_field');

        document.getElementById('pod-desc-input').addEventListener('focusin', (event) => {
        pod_desc_input.classList.remove('invalid_field');
        error_message.innerText = "";
        })
        return;
      }

      if (pod_desc_input.value.length > 255) {
        error_message.innerText = "Pod description cannot exceed 255 characters";
        pod_desc_input.classList.add('invalid_field');

        document.getElementById('pod-desc-input').addEventListener('focusin', (event) => {
        pod_desc_input.classList.remove('invalid_field');
        error_message.innerText = "";
        })
        return;
      }

      if (!(pod_desc_input.value.match(/^[a-z0-9~@#$^*()_+=[\]{}|,.?': -]+$/i))) {
        error_message.innerText = "Pod description contains invalid characters";
        pod_desc_input.classList.add('invalid_field');

        document.getElementById('pod-desc-input').addEventListener('focusin', (event) => {
          pod_desc_input.classList.remove('invalid_field');
          error_message.innerText = "";
        })
        return;
      }

      this.pod.pod_name = pod_name_input.value;
      this.pod.pod_desc = pod_desc_input.value;

      console.log(this.pod.toString());
      alert('Success');
    }
  }
