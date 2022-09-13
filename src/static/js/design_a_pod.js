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
      return ["Gigabyte Arm", "HPE x86 25G", "HPE x86 10G", "HPE gen 10"];
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

    if (flavor == "HPE x86 10G") {
      return ['Ubuntu 20.04 LTS (x86_64)', 'Fedora 33 (x86_64)'];
    }

    if (flavor == "HPE gen 10") {
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
      this.adding_network = false;
      this.has_connection = false;
      this.sections = ["select_lab", "add_hosts", "add_networks", "configure_connections", "pod_details", "pod_summary"];
      this.selected_flavor = "";
      this.selected_interface = "";
      this.selected_image= "";
    }

    go_prev() {
      this.step--;
      let section = this.sections[this.step];

      if (this.step == 4) {
        document.getElementById('workflow-next').removeAttribute('disabled');
      }

      if (this.step == 0) {
        document.getElementById('workflow-prev').setAttribute('disabled' , '');
      }

      document.getElementById(section).scrollIntoView({behavior: 'smooth'});
    }


    go_next() {
      this.step++;
      let section = this.sections[this.step];

      if (this.step == 5) {
        document.getElementById('workflow-next').setAttribute('disabled' , '');
      } 

      if (this.step == 1) {
        document.getElementById('workflow-prev').removeAttribute('disabled');
      }

      document.getElementById(section).scrollIntoView({behavior: 'smooth'});
    }


    initialize_elements() {
      document.getElementById('workflow-next').removeAttribute('disabled');
      document.getElementById('workflow-prev').setAttribute('disabled' , '');
      document.getElementById('select_lab').scrollIntoView({behavior: 'auto'});
      document.getElementById('pod-name-input').value = '';
      document.getElementById('pod-desc-input').value = '';
      document.getElementById('public_switch').checked = false;

      // Add public network by default
      work.pod.add_network('public');
      const network_plus_card = document.getElementById('network-plus-card');
      const new_card = document.createElement('div');
      new_card.classList.add("col-xl-3","col-md-6","col-12", "my-3");
      new_card.innerHTML = `
      <div class="card">
        <div class="text-center">
          <h3 class="py-5 my-5">public</h3>
        </div>
      </div>`;
      network_plus_card.parentNode.insertBefore(new_card, network_plus_card);

      // Listen for hostname focus to remove red border and error message
      const hostname_input = document.getElementById('hostname-input');
      const error_message = document.getElementById('add-host-error-msg');
      hostname_input.addEventListener('focusin', (event) => {
          hostname_input.classList.remove('invalid_field');
          error_message.innerText = "";
      })

      // Pod details validators
      const pod_name_input = document.getElementById('pod-name-input');
      const pod_desc_input = document.getElementById('pod-desc-input');
      const public_switch = document.getElementById('public_switch');
      const details_error_message = document.getElementById('pod_details_error');
      pod_name_input.addEventListener('focusout', name_e => {
        if (pod_name_input.value.length > 53) {
          details_error_message.innerText = 'Pod name cannot exceed 53 characters.';
          pod_name_input.classList.add('invalid_field');
          this.pod.pod_name = '';
          this.update_pod_summary('pod_details');
          return;
        } else if (!(pod_name_input.value.match(/^[a-z0-9~@#$^*()_+=[\]{}|,.?': -!]+$/i))) {
          details_error_message.innerText = 'Pod name contains invalid characters.';
          pod_name_input.classList.add('invalid_field');
          this.pod.pod_name = '';
          this.update_pod_summary('pod_details');
          return;
        }

        pod_name_input.classList.remove('invalid_field');
        details_error_message.innerText = '';
        this.pod.pod_name = pod_name_input.value;
        this.update_pod_summary('pod_details');
      })

      pod_desc_input.addEventListener('focusout', desc_e => {
        if (pod_desc_input.value.length > 255) {
          details_error_message.innerText = 'Pod description cannot exceed 255 characters.';
          pod_desc_input.classList.add('invalid_field');
          this.pod.pod_desc = '';
          this.update_pod_summary('pod_details');
          return;
        } else if (!(pod_desc_input.value.match(/^[a-z0-9~@#$^*()_+=[\]{}|,.?': -!]+$/i))) {
          details_error_message.innerText = 'Pod description contains invalid characters.';
          pod_desc_input.classList.add('invalid_field');
          this.pod.pod_desc = '';
          this.update_pod_summary('pod_details');
          return;
        }

        pod_desc_input.classList.remove('invalid_field');
        details_error_message.innerText = '';
        this.pod.pod_desc = pod_desc_input.value;
        this.update_pod_summary('pod_details');
      })

      public_switch.addEventListener('focusout', public_e => {
        this.pod.is_public = public_switch.checked;
        this.update_pod_summary('pod_details');
      })
    }

    display_labs() {
      const lab_list = get_labs();
      const card_deck = document.getElementById('lab_cards');
      for (let i in lab_list) {
        const new_col = document.createElement('div');
        new_col.classList.add('card','col-xl-3',"col-md-6",'col-11');
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
            <button class="btn btn-success w-100 stretched-link" href="#" onclick="work.select_lab('` + lab_list[i].name + `')">Select</a>
        </div>
        `
        card_deck.appendChild(new_col);
      }
    }

    select_lab(lab_name) {
      // Check if any elements have been selected
      if (this.pod.lab_name == "") {
        document.getElementById(lab_name).classList.add("selected_node");
        this.pod.lab_name = lab_name;
        this.display_flavors();
      } else {
        // a lab is already selected, clear already selected resources
        if(confirm('Unselecting a lab will reset all selected resources, are you sure?')) {
            work.delete_template();
            return false;
        }
      }
    }

    delete_template() {
      // TODO: Remove template from LibLaas
      location.reload();
    }

    display_flavors() {
      const flavor_cards = document.getElementById('flavor-cards');
      const flavors = get_flavors(this.pod.lab_name);

      for (let i = 0; i < flavors.length; i++) {
      const col = document.createElement('div');
      col.classList.add('col-12', 'col-md-6', 'col-xl-3', 'my-3');
      col.innerHTML=  `
        <div class="card">
          <div class="card-header">
              <p class="h5 font-weight-bold mt-2">` + flavors[i] + `</p>
          </div>
          <div class="card-body">
              <p id="testing123" class="grid-item-description">Flavor Description Goes Here</p>
          </div>
          <div class="card-footer">
              <button id="select-flavor-` + i + `" type="button" class="btn btn-success grid-item-select-btn w-100 stretched-link" 
              onclick="work.select_flavor(this.id)">Select</button>
          </div>
        </div>
      `
      flavor_cards.appendChild(col);
      }
    }

    display_images() {
      const image_cards = document.getElementById('image-cards');
      const images = get_images(this.selected_flavor);
      for (let i = 0; i < images.length; i++) {
        const col = document.createElement('div');
        col.classList.add('col-12', 'col-md-6', 'col-xl-3', 'my-3');
        col.innerHTML = `
        <div id=select-image-` + i +` class="btn border w-100" onclick="work.select_image(this.id)">` + images[i] +`</div>
        `
        image_cards.appendChild(col);
      }
    }

    select_flavor(param) {
      // param: select-flavor-#
      const flavors = get_flavors(this.pod.lab_name);
      const index = param.substring(14);
      const card = document.querySelectorAll('#flavor-cards .card').item(index);
      const flavor = flavors[index];

      // Radio-like functionality
      if (this.selected_flavor != '') {
       document.querySelector('#flavor-cards .selected_node').classList.remove('selected_node');
       document.getElementById('image-cards').innerHTML = '';
       this.selected_image = '';
      }

      // Reselecting to unselect
      if (flavor == this.selected_flavor) {
        this.selected_flavor = '';
        this.selected_image = '';
        return;
      }

      card.classList.add('selected_node');
      this.selected_flavor = flavor;
      this.display_images();
    }

    select_image(param) {
      // param: select-image-#
      const images = get_images(this.selected_flavor);
      const index = param.substring(13);
      const card = document.querySelectorAll('#image-cards .btn').item(index);
      const image = images[index];

      // Radio-like functionality
      if (this.selected_image != '') {
        document.querySelector('#image-cards .selected_node').classList.add('border');
        document.querySelector('#image-cards .selected_node').classList.remove('selected_node');
      }

      // Reselecting to unselect
      if (image == this.selected_image) {
        this.selected_image = '';
        return;
      }

      card.classList.remove('border');
      card.classList.add('selected_node');
      this.selected_image = image;
    }
    add_host_button() {

      // Prerequisite step check
      if (this.pod.lab_name == "") {
        alert("Please Select a lab before adding hosts.");
        work.go_prev();
        return
      }

      // Declare variables
      const hostname_input = document.getElementById('hostname-input');
      const error_message = document.getElementById('add-host-error-msg');
      let flavors = get_flavors(this.pod.lab_name);

      // Reset form fields
      hostname_input.value = "";
      hostname_input.classList.remove('invalid_field');
      error_message.innerText = "";

      // Launch modal
      if (this.selected_flavor != '') {
        this.selected_flavor = '';
        this.selected_image = '';
        document.querySelector('#flavor-cards .selected_node').classList.remove('selected_node');
        document.getElementById('image-cards').innerHTML = '';
      }
      $("#host-modal").modal('toggle');
    }

    add_host() {
      // Declare variables
      const hostname_input = document.getElementById('hostname-input');
      const error_message = document.getElementById('add-host-error-msg');
      const plus_card = document.getElementById('host-plus-card');


      // Input validation
      if (this.selected_flavor == '') {
        error_message.innerText = 'Please select a flavor';
        return
      }

      if (this.selected_image == '') {
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
      const new_host = new Host(hostname_input.value, this.selected_flavor, this.selected_image);

      // Add default interfaces and connections
      for (let i = 0; i < get_interface_count(this.selected_flavor); i++) {
        let interface_name = get_interface_name(this.selected_flavor) + i;
        const new_interface = new HostInterface(interface_name);
        new_host.add_interface(new_interface);  
      }

      // Add host object to template host list
      this.pod.add_host(new_host);

      // Create Host card
      const new_card = document.createElement("div");
      new_card.classList.add("col-xl-3", "col-md-6","col-12", "my-3");
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
      this.update_pod_summary('hosts');
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
      this.update_pod_summary('hosts');
    }

    delete_network_button(button_id) {
      // Uses button id string to find the network to delete from the pod template.
      // All network delete buttons are in the form "delete-network-networkname"

      // All connections must be cleared if a network is added after a connection already exists
      if (this.has_connection) {
        if(!confirm('Removing a network will remove ALL connections, are you sure?')) {
          return;
          }
          this.has_connection = false;
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

      if (this.adding_network) {
        document.getElementById('new_network_card').classList.add('invalid_field');
        alert('Please finish adding the existing network.');
        return;
      }

      // All connections must be cleared if a network is added after a connection already exists
      if (this.has_connection) {
        if(!confirm('Adding a network will remove ALL connections, are you sure?')) {
          return;
          }
          this.has_connection = false;
      }

      // Delete all connections
      for (let i in this.pod.host_list) {
        for (let j in this.pod.host_list[i].interfaces) {
          this.pod.host_list[i].interfaces[j].connections = [];
        }
      }

      // New empty card
      const network_plus_card = document.getElementById('network-plus-card');
      const new_card = document.createElement('div');
      new_card.classList.add("col-xl-3", "col-md-6","col-12");
      new_card.innerHTML = 
        `<div class="card pb-0" id="new_network_card">
          <div class="card-body pb-0">
            <div class="row justify-content-center my-5">
              <input type="text" class="form-control col-12 mb-2" id="network_input" placeholder="Enter Network Name">
              <span class="text-danger mt-n2" id="adding_network_error"></span>
            </div>
            <div class="row">
              <button class="btn btn-danger col-6" onclick="work.delete_new_network()">Delete</button>
              <button class="btn btn-success col-6" id="adding_network_confirm" onclick="work.confirm_new_network()" disabled>Confirm</button>
            </div>
          </div>
        </div>`;
      network_plus_card.parentNode.insertBefore(new_card, network_plus_card);

      // Network input event listeners
      const network_input = document.getElementById('network_input');
      const error_message = document.getElementById('adding_network_error');
      const confirm_button = document.getElementById('adding_network_confirm');
      network_input.addEventListener('focusout', network_e => {
        if (network_input.value == '') {
          network_input.classList.add('invalid_field');
          confirm_button.setAttribute('disabled', '');
          return;
        }

        if (network_input.value.length > 63) {
          error_message.innerText = 'Network names cannot exceed 63 characters';
          network_input.classList.add('invalid_field');
          confirm_button.setAttribute('disabled', '');
          return
        }

        if (!(network_input.value.match(/^[0-9a-z-]+$/i))) {
          error_message.innerText = 'Network names must only contain alphanumeric characters and dashes';
          network_input.classList.add('invalid_field');
          confirm_button.setAttribute('disabled', '');
          return
        }

        if ((network_input.value.charAt(0).match(/^[0-9-]+$/)) || (network_input.value.charAt(network_input.value.length - 1) == '-')) {
          error_message.innerText = 'Network names must start with a letter and end with a letter or digit.';
          network_input.classList.add('invalid_field');
          confirm_button.setAttribute('disabled', '');
          return
        }

        for (let i in this.pod.network_list) {
          if (network_input.value == this.pod.network_list[i]) {
            network_input.classList.add('invalid_field');
            error_message.innerText = 'Networks must have unique names';
            confirm_button.setAttribute('disabled', '');
            return;
          }
        }

      });

      network_input.addEventListener('focusin', network_e => {
        network_input.classList.remove('invalid_field');
        document.getElementById('new_network_card').classList.remove('invalid_field');
        error_message.innerText = '';
        confirm_button.removeAttribute('disabled');
      });

      this.adding_network = true;
      if (this.pod.network_list.length == 8 || (this.pod.network_list.length == 7 && this.adding_network)) {
        network_plus_card.hidden = true;
      }

    }

    confirm_new_network() {
      const network_name = document.getElementById('network_input').value;
      const network_plus_card = document.getElementById('network-plus-card');

      this.pod.add_network(network_name);
      this.delete_new_network();

      const new_card = document.createElement('div');
      new_card.classList.add("col-xl-3", "col-md-6","col-12", "my-3");
      new_card.innerHTML = `<div class="card">
            <div class="text-center">
              <h3 class="py-5 my-5">` + network_name + `</h3>
            </div>
            <div class="">
                <button class="btn btn-danger w-100 mt-n3" id="delete-network-` + network_name + `" onclick="work.delete_network_button(id)">Delete</button>
            </div>
          </div>`;

      if (this.pod.network_list.length == 8) {
        network_plus_card.hidden = true;
      }
      network_plus_card.parentNode.insertBefore(new_card, network_plus_card);
    }

    delete_new_network() {
      // Remove the new network card
      document.getElementById('new_network_card').parentElement.remove();
      document.getElementById('network-plus-card').hidden = false;
      this.adding_network = false;
    }

    initialize_connections(hostname) {
      this.has_connection = true;
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
            for (let i = 0; i < untagged_buttons.length; i++) {
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
        for (let i = 0; i < untagged_buttons.length; i++) {
          untagged_buttons.item(i).setAttribute('disabled', '');
        }
      } else {
        // Re-enable buttons if there is no longer an untagged connection
        for (let i in selected_interface.connections) {
          if (selected_interface.connections[i].tagged == false) return;
        }
        for (let i = 0; i < untagged_buttons.length; i++) {
          untagged_buttons.item(i).removeAttribute('disabled');
        }
      }
    }

    new_connection_card(hostname) {
      const card_deck = document.getElementById('connection_cards');

      const new_card = document.createElement('div');
      new_card.classList.add("col-xl-3", "col-md-6","col-11", "my-3");
      new_card.id = 'connection-' + hostname;
      new_card.innerHTML = `<div class="card">
            <div class="text-center">
              <h3 class="py-5 my-5">` + hostname + `</h3>
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

      if (this.adding_network) {
        alert('Please finish adding a network before configuring connections.');
        document.getElementById('new_network_card').classList.add('invalid_field');
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
        for (let i = 0; i < untagged_buttons.length; i++) {
          untagged_buttons.item(i).setAttribute('disabled', '');
        }
      }

    }

    update_pod_summary(section) {
      // Takes a section (string) and updates the appropriate element's innertext

      if (section == 'pod_details') {
        const list = document.getElementById('pod_summary_pod_details');
        list.innerHTML = '';
        const name_li = document.createElement('li');
        name_li.innerText = 'Pod name: ' + this.pod.pod_name;
        list.appendChild(name_li);

        const desc_li = document.createElement('li')
        desc_li.innerText = 'Description: ' + this.pod.pod_desc;
        list.appendChild(desc_li);

        const public_li = document.createElement('li');
        public_li.innerText = 'Public: ' + this.pod.is_public;
        list.appendChild(public_li);
      } else if (section == 'hosts') {
        const list = document.getElementById('pod_summary_hosts');
        list.innerHTML = '';
        const hosts = this.pod.host_list;
        for (let i = 0; i < this.pod.host_list.length; i++) {
          const new_li = document.createElement('li');
          new_li.innerText = hosts[i].hostname + ': ' + hosts[i].flavor + ' (' + hosts[i].image + ')';
          list.appendChild(new_li);
        }
      } else {
        console.log(section + ' is not a valid section.');
      }


    }

    has_minimum_connections() {
      for (let i = 0; i < this.pod.host_list.length; i++) {
        var flag = false;
        for (let j = 0; j < this.pod.host_list[i].interfaces.length; j++) {
          for (let k = 0; k < this.pod.host_list[i].interfaces[j].connections.length; k++) {
            if (this.pod.host_list[i].interfaces[j].connections[k].tagged != null) {
              flag = true;
              break;
            }
          }
        }
        if (!flag) {
          return [false, this.pod.host_list[i].hostname];
        }
      }
    }

    submit() {

      // Prerequisite step check
      if (this.pod.lab_name == "") {
        alert("Please Select a lab.");
        for (let i = 0; i < 5; i++) {
          work.go_prev();
        }
        return;
      }

      if (this.pod.host_list.length == 0) {
        alert("Please add a host.");
        for (let i = 0; i < 4; i++) {
          work.go_prev();
        }
        return;
      }

      if (this.pod.network_list.length == 0) {
        alert("Please add a network.");
        for (let i = 0; i < 3; i++) {
          work.go_prev();
        }
        return;
      }

      const result = this.has_minimum_connections();
      if(result && !result[0]) {
        alert('Please add at least one tagged or untagged connection for ' + result[1]);
        for (let count = 0; count < 2; count++) {
          this.go_prev();
        }
        return;
      }

      if (this.pod.pod_name == '') {
        alert('Please enter a valid pod name.')
        this.go_prev();
        return;
      }

      if (this.pod.pod_desc== '') {
        alert('Please enter a valid pod description.')
        this.go_prev();
        return;
      }

      console.log(this.pod.toString());
      console.log(this.pod.export_template());
      alert('Success');
    }
  }
