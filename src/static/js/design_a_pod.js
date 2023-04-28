  //todo - allow networks to be marked as public or private
  // LibLaas bridges
  function get_labs() {
    // Todo - get labs from liblaas
    const lab = {'name': 'UNH_IOL', 'description': 'University of New Hampshire InterOperability Lab',
    'location': 'University of New Hampshire InterOperability Lab', 'status': 0 };

    let lab_list = [];
    lab_list.push(lab);
    return lab_list;
  }


  // Gets flavors from liblaas and saves to the workflow object
  async function get_flavors(lab) {
    let response = talk_to_liblaas("GET", "flavor", {});
    return response;
  }

  async function get_templates(lab, user_id) {
    let response = talk_to_liblaas("GET", 'template/blob/list/' + user_id, {});
    return response
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
      this.sections = ["select_lab", "add_hosts", "add_networks", "configure_connections", "pod_details", "pod_summary"];
      this.selected_template = null;
      this.selected_node = null; // index of selected node. This index is used to reference the in mem host config and the template.hostlist[]
      this.selected_interface = "";
      this.lab_flavors = [];
      this.templates = [];
      this.in_mem_host_configs = null; // Used for add host modal
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

      // Update hostname for imhc for selected node
      hostname_input.addEventListener('focusout', (event)=> {
        this.in_mem_host_configs[this.selected_node].hostname = hostname_input.value;
      })

      // Update CI for imhc
      const cloud_init_input = document.getElementById("ci-textarea");
      cloud_init_input.addEventListener('focusout', (event)=> {
        this.in_mem_host_configs[this.selected_node].cifile = cloud_init_input.value;
      })

      // Pod details validators
      const pod_name_input = document.getElementById('pod-name-input');
      const pod_desc_input = document.getElementById('pod-desc-input');
      const public_switch = document.getElementById('public_switch');
      const details_error_message = document.getElementById('pod_details_error');
      pod_name_input.addEventListener('focusout', name_e => {
        this.step = 4;
        document.getElementById('workflow-prev').removeAttribute('disabled');
        document.getElementById('workflow-next').removeAttribute('disabled');

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
        this.save();
      })

      pod_desc_input.addEventListener('focusout', desc_e => {
        this.step = 4;
        document.getElementById('workflow-prev').removeAttribute('disabled');
        document.getElementById('workflow-next').removeAttribute('disabled');

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
        this.save();
      })

      public_switch.addEventListener('focusout', public_e => {
        this.step = 4;
        document.getElementById('workflow-prev').removeAttribute('disabled');
        document.getElementById('workflow-next').removeAttribute('disabled');

        this.pod.is_public = public_switch.checked;
        this.update_pod_summary('pod_details');
        this.save();
      })
    }

    display_labs() {
      const lab_list = get_labs();
      const card_deck = document.getElementById('lab_cards');
      for (let i in lab_list) {
        const new_col = document.createElement('div');
        new_col.classList.add('col-xl-3','col-md-6','col-11');
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
        <div class="card">
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
              <btn class="btn btn-success w-100 stretched-link" href="#" onclick="work.select_lab('` + lab_list[i].name + `')">Select</btn>
          </div>
        </div>
        `
        card_deck.appendChild(new_col);
      }
    }

    async select_lab(lab_name) {
      this.step = 0;
      document.getElementById('workflow-prev').setAttribute('disabled' , '');

      // Check if any elements have been selected
      if (this.pod.lab_name == "") {
        document.querySelector('#' + lab_name + ' .card').classList.add("selected_node");
        this.pod.lab_name = lab_name;
        const liblaas_flavors = await get_flavors(this.pod.lab_name);
        for (let i in liblaas_flavors) {
          this.lab_flavors.push(new Flavor(liblaas_flavors[i]["id"], liblaas_flavors[i]["name"], liblaas_flavors[i]["description"], liblaas_flavors[i]["interface_names"]));
          this.lab_flavors[i].set_images();
        }
        this.templates = await get_templates(this.pod.lab_name, this.pod.owner);
        this.display_templates();
      } else {
        // a lab is already selected, clear already selected resources
        if(confirm('Unselecting a lab will reset all selected resources, are you sure?')) {
            work.delete_template();
            return false;
        }
      }
      this.save();
    }

    delete_template() {
      // TODO: Remove template from LibLaas
      location.reload();
    }

    display_templates() {
      const flavor_cards = document.getElementById('flavor-cards');

      for (let i = 0; i < this.templates.length; i++) {
      const col = document.createElement('div');
      col.classList.add('col-12', 'col-md-6', 'col-xl-3', 'my-3');
      col.innerHTML=  `
        <div class="card">
          <div class="card-header">
              <p class="h5 font-weight-bold mt-2">` + this.templates[i].name + `</p>
          </div>
          <div class="card-body">
              <p id="testing123" class="grid-item-description">` + this.templates[i].description +`</p>
          </div>
          <div class="card-footer">
              <button id="select-template-` + i + `" type="button" class="btn btn-success grid-item-select-btn w-100 stretched-link" 
              onclick="work.select_flavor(this.id)">Select</button>
          </div>
        </div>
      `
      flavor_cards.appendChild(col);
      }
    }

    display_images() {
      if (this.selected_node == null) {
        console.log("No node selected!");
        return;
      }
      const flavor = this.lab_flavor_from_uuid(this.selected_template.host_list[this.selected_node].flavor);
      const image_cards = document.getElementById('image-cards');
      image_cards.innerHTML = "";
      const images = flavor.images;
      for (let i = 0; i < images.length; i++) {
        const col = document.createElement('div');
        col.classList.add('col-12', 'col-md-6', 'col-xl-3', 'my-3');
        col.innerHTML = `
        <div id=select-image-` + i +` class="btn border w-100" onclick="work.select_image(this.id)">` + images[i][1] +`</div>
        `
        image_cards.appendChild(col);
      }
    }

    // flavor has been replaced with template
    // todo - rename flavor to template when necessary
    select_flavor(template_card_id) {
      const index = template_card_id.substring(16); // grabs 'i' from the element id
      const card = document.querySelectorAll('#flavor-cards .card').item(index); // The card element currently selected by the user
      const template = this.templates[index]; // Template object currently selected by the user
      const tablist = document.getElementById("add-host-tablist"); // Section of html to be set to hidden or visible on template selection
      const host_config_section = document.getElementById("host-config-section");
      // todo - add warning that changes selected template will clear in_mem_host_config

      // Radio-like functionality
      if (this.selected_template != null) {
       document.querySelector('#flavor-cards .selected_node').classList.remove('selected_node');
       document.getElementById('image-cards').innerHTML = '';
       tablist.innerHTML = "";
       host_config_section.setAttribute("hidden", "true");
       this.selected_node = null;
      }

      // Reselecting to unselect
      if (template == this.selected_template) {
        tablist.setAttribute("hidden", "true");
        tablist.innerHTML = "";
        this.selected_template = null;
        return;
      }

      tablist.removeAttribute("hidden");
      card.classList.add('selected_node');
      this.selected_template = template;

      // Create in memory host configuration state for tabbing in between nodes
      this.in_mem_host_configs = []; // List of Host Objects, default instance variables from template.
      for (let i = 0; i < template.host_list.length; i++) {
        // Create deep copies of the hosts
        let original_host = template.host_list[i];
        let copy_host = JSON.parse(JSON.stringify(original_host));
        this.in_mem_host_configs.push(copy_host);
        this.in_mem_host_configs[i].cifile = this.in_mem_host_configs[i].cifile[0]; // change it from an array of strings to just a string
        this.in_mem_host_configs[i].original_hostname = this.in_mem_host_configs[i].hostname;
      }

      this.display_node_list();
      this.select_node("select-node-0"); // pre-select the first node
      document.getElementById("select-node-0").classList.add("active");
    }

    /**
     * Shows tabs for the currently selected template
     * Each tab will show the host configuration options for that node and its associated flavor
     */
    display_node_list() {
      const template = this.selected_template;

      if (template == null) {
        console.log("No template selected");
        return;
      }
      
      const tablist = document.getElementById('add-host-tablist'); // ul
      for (let i = 0; i < template.host_list.length; i++) {
        const li_interface = document.createElement('li');
        li_interface.classList.add('nav-item');
        const btn_interface = document.createElement('a');
        btn_interface.classList.add('nav-link', 'interface-btn');
        btn_interface.id = "select-node-" + i;
        btn_interface.setAttribute("onclick", "work.select_node(id)");
        btn_interface.setAttribute('href', "#");
        btn_interface.setAttribute('role', 'tab');
        btn_interface.setAttribute('data-toggle', 'tab'); 
        btn_interface.innerText = this.lab_flavor_from_uuid(template.host_list[i].flavor).name;
        li_interface.appendChild(btn_interface);
        tablist.appendChild(li_interface);
      }
    }

    select_node(node_id) {
      const node_number = node_id.substring(12); // grabs 'i' from the element id
      if (this.selected_node == node_number) { // reselect
        return;
      }
      this.selected_node = Number(node_number);
      this.display_node_configs();
    }

    display_node_configs() {
      if (this.selected_node == null) {
        console.log("No node selected!");
        return;
      }

      // Remove error highlighting
      let errors = document.querySelectorAll(".invalid_field");
      for (let i = 0; i < errors.length; i++) {
        errors[i].classList.remove("invalid_field");
      }
      const error_message = document.getElementById('add-host-error-msg');
      error_message.innerText = "";

      // Host config elements
      const hostname_input = document.getElementById("hostname-input");
      const cloud_init_input = document.getElementById("ci-textarea");

      // Apply in mem configs to text inputs
      const config = this.in_mem_host_configs[this.selected_node];
      hostname_input.value = config.hostname;
      cloud_init_input.value = config.cifile; // ci file is a list but it only contains one item at the template level

      this.display_images();
      // Find image in list and add selected_node class
      const image_cards = document.getElementById("image-cards");
      for (let i = 0; i < image_cards.children.length; i++) {
        let image_name = image_cards.children[i].innerText;
        if (image_name.includes(config.image)) {
          image_cards.children[i].children[0].classList.add("selected_node");
        } else {
        }
      }

      const host_config_section = document.getElementById("host-config-section");
      host_config_section.removeAttribute("hidden");

    }

    /*
    selecting this needs to apply it to the imhc for the currently selected node
    it then needs to apply UI changes
    */
    select_image(param) {
      // param: select-image-#
      const flavor = this.lab_flavor_from_uuid(this.selected_template.host_list[this.selected_node].flavor); // the flavor for the selected node
      const images = flavor.images; // the images available on the flavor for the selected node
      const index = param.substring(13); // the index of the image in the image list as abstracted from the element id.
      const card = document.querySelectorAll('#image-cards .btn').item(index); // The image card
      const image = images[index][1]; // The image object is an array [uuid, img_name] for some reason. This needs to be refactored
      const config = this.in_mem_host_configs[this.selected_node];

      // We know which imhc we are working on
      // given this, we need to determine if the selected image matches the currently stored image
      // if it does, set it to null and remove the selected node field
      // if it does not, set it to that image and iterate through all image cards and remove ther selected node field from it

      // Radio-like functionality


      // Reselecting to unselect
      if (config.image == image) {
        config.image = null;
        card.classList.remove("selected_node");
        card.classList.add("border");
        return;
      }

      // Nothing is selected
      if (config.image == null) {
        card.classList.add("selected_node");
        card.classList.remove('border');
        config.image = image;
        return;
      }

      // A different image is selected
      document.querySelector('#image-cards .selected_node').classList.add('border');
      document.querySelector('#image-cards .selected_node').classList.remove('selected_node');
      card.classList.remove('border');
      card.classList.add('selected_node');
      config.image = image;
    }

    add_host_button() {
      this.step = 1;
      document.getElementById('workflow-prev').removeAttribute('disabled');
      document.getElementById('workflow-next').removeAttribute('disabled');

      // Prerequisite step check
      if (this.pod.lab_name == "") {
        alert("Please Select a lab before adding hosts.");
        work.go_prev();
        return
      }

      if (this.adding_network) {
        alert('Please finish adding a network.');
        document.getElementById('new_network_card').classList.add('invalid_field');
        work.go_next();
        return;
      }

      const add_host_tablist = document.getElementById("add-host-tablist");
      const host_config_section = document.getElementById("host-config-section");
      const hostname_input = document.getElementById('hostname-input');
      const error_message = document.getElementById('add-host-error-msg');
      const cloud_init_input = document.getElementById('ci-textarea');
      const selected_template = document.querySelector('#flavor-cards .selected_node');

      // Reset form fields
      this.in_mem_host_configs = [];
      this.selected_template = null;
      this.selected_node = null;
      add_host_tablist.setAttribute("hidden", "true");
      add_host_tablist.innerHTML = "";
      host_config_section.setAttribute("hidden", "true");
      hostname_input.value = "";
      hostname_input.classList.remove('invalid_field');
      error_message.innerText = "";
      cloud_init_input.value = "";
      if (selected_template) {
        selected_template.classList.remove('selected_node');
      }
      document.getElementById('image-cards').innerHTML = '';

      // Launch modal

      $("#host-modal").modal('toggle');
    }

    validate_hostname(hostname) {
    // Returns a list of [result, message]
    // Validates everything except duplicate names

    let result = true;
    let message = "success";

    if (hostname == '') {
      result = false;
      message = 'Please enter a valid hostname';
      
    } else if (hostname.length > 25) {
      result = false;
      message = 'Hostnames cannot exceed 25 characters';

    } else if (!(hostname.match(/^[0-9a-z-]+$/i))) {
      result = false;
      message = 'Hostnames must only contain alphanumeric characters and dashes';

    } else if ((hostname.charAt(0).match(/^[0-9-]+$/)) || (hostname.charAt(hostname.length - 1) == '-')) {
      result = false;
      message = 'Hostnames must start with a letter and end with a letter or digit.';
    }

    return [result, message];

    }

    add_hosts() { // todo - breakdown this god class into more cohesive functions
      const hostname_input = document.getElementById('hostname-input');
      const error_message = document.getElementById('add-host-error-msg');
      const plus_card = document.getElementById('host-plus-card');
      const cloud_init_input = document.getElementById('ci-textarea'); // todo - validate
      const network_plus_card = document.getElementById('network-plus-card');

      // Form validation

      if (this.selected_template == null) {
        error_message.innerText = 'Please select a template';
        return
      }

      const host_configs = this.in_mem_host_configs; // list of host configs

      if (host_configs.length + this.pod.host_list.length > 8) {
        error_message.innerText = 'You may not add more than 8 hosts to a pod.';
        return;
      }

      let new_network_count = 0;
      // Check if adding the new networks would increase the number of total networks above 8.
      for (let i = 0; i < this.selected_template.networks.length; i++) {
        let is_existing_net = false;
        for (let j = 0; j < this.pod.network_list.length; j++) {
          if (this.pod.network_list[j] == this.selected_template.networks[i].name) {
            is_existing_net = true;
          }
        }

        if (!is_existing_net) {
          new_network_count++;
        }
      }

      if (new_network_count + this.pod.network_list.length > 8) {
        error_message.innerText = 'You may not add more than 8 networks to a pod.';
        return;
      }

      // Validate host configs
      for (let i = 0; i < host_configs.length; i++) {
        let result = this.validate_hostname(host_configs[i].hostname); // simple hostname validation
        if (result) { // simple hostname validation passed
          for (let j = i + 1; j < host_configs.length; j++) { // Check for duplicate hostname within config
            if (host_configs[i].hostname == host_configs[j].hostname) {
              result = [false, "Hosts must have unique names. Please try again."];
              break;
            }
          }

          // Check for duplicate hostnames within added hosts
          for (let j = 0; j < this.pod.host_list.length; j++) {
            if (host_configs[i].hostname == this.pod.host_list[j].hostname) {
              result = [false, "A host with this name has already been added."];
              break;
            }
          }
        }

        let valid_image = true; // used to determine if hostname section should be highlighted red

        // Check that host config image is selected
        if (result[0]) {
          if (host_configs[i].image == null) {
            valid_image = false;
            result = [false, "Please select an image."]
          }
        }


        if (!result[0]) {
          // Invalid hostname or unselected image - need to display this node, highlight hostname field red, display error message, and return;
          this.select_node("select-node-" + i);
          // Need to manually update tab classes
          let old_selected_tab = document.querySelector("a.nav-link.interface-btn.active");
          old_selected_tab.classList.remove("active");
          let new_selected_tab = document.getElementById("select-node-" + i);
          new_selected_tab.classList.add("active");
          
          if (valid_image) { // if its a valid image, then the hostname must be the problem
            hostname_input.classList.add('invalid_field');
          }
          error_message.innerText = result[1];
          return;
        }
      }

      $('#host-modal').modal('hide')

      for (let i = 0; i < this.selected_template.networks.length; i++) { // template networks
        const new_network = this.selected_template.networks[i].name;

        if (this.pod.network_list.indexOf(new_network) === -1) { //network is not in new pod's network list
          this.pod.network_list.push(new_network);
    
          // todo - make a display networks function that does this
          const new_card = document.createElement('div');
          new_card.classList.add("col-xl-3", "col-md-6","col-12", "my-3");
          new_card.innerHTML = `
              <div class="card">
                <div class="text-center">
                  <h3 class="py-5 my-4">` + new_network + `</h3>
                </div>
                <div class="row mb-3 mx-3">
                    <button class="btn btn-danger w-100" id="delete-network-` + new_network + `" onclick="work.delete_network_button(id)">Delete</button>
                </div>
              </div>`;
    

          network_plus_card.parentNode.insertBefore(new_card, network_plus_card);
          
          // Need to go through every interface of every host and add this network to the connections map with a value of null
          for (let host_index = 0; host_index < this.pod.host_list.length; host_index++) {
            const existing_host = this.pod.host_list[host_index];
            for (let iface_index = 0; iface_index < existing_host.interfaces.length; iface_index++) {
              existing_host.interfaces[iface_index].connections.set(new_network, null);
            }
          }
        }
      }

      if (this.pod.network_list.length >= 8) {
        network_plus_card.setAttribute('hidden', true);
      }

      // For each host_config, add host, add network (if not present), configure connections
      for (let i = 0; i < host_configs.length; i++) {
        const new_host = new Host(host_configs[i].hostname, host_configs[i].flavor, host_configs[i].image, host_configs[i].cifile);
        new_host.original_hostname = host_configs[i].original_hostname; // needed for preconfigured networks
        this.pod.add_host(new_host);

        // Create Host card
        const new_card = document.createElement("div");
        new_card.classList.add("col-xl-3", "col-md-6","col-12", "my-3");
        new_card.innerHTML = `
          <div class="card">
            <div class="card-header">
              <h3 class="mt-2">` + this.lab_flavor_from_uuid(new_host.flavor).name + `</h3>
            </div>
            <ul class="list-group list-group-flush h-100">
              <li class="list-group-item">Hostname: ` + new_host.hostname + `</li>
              <li class="list-group-item">Image: ` + new_host.image + `</li>
            </ul>
            <div class="card-footer border-top-0">
              <button class="btn btn-danger w-100" id="delete-host-` + new_host.hostname + `" onclick="work.delete_host_button(id)">Delete</button>
            </div>
          </div>
        `;
        plus_card.parentNode.insertBefore(new_card, plus_card);

        if (this.pod.host_list.length == 8) { // also an issue
          plus_card.hidden = true;
        }
        this.new_connection_card(new_host.hostname);

        // Add default interfaces and connections
        const curr_flavor = this.lab_flavor_from_uuid(new_host.flavor);
        for (let iface_index = 0; iface_index < curr_flavor.interfaces.length; iface_index++) { // for each interface in the host
          const new_interface = new HostInterface(curr_flavor.interfaces[iface_index]);
          new_host.add_interface(new_interface);
          new_interface.connections = new Map(); // changing connections to a map from a list of objects

          // initializes connections to null
          for (let network_index = 0; network_index < this.pod.network_list.length; network_index++) { // for each network in the network list
            new_interface.connections.set(this.pod.network_list[network_index], null);
          }
        }

        // Add connections from template to new host - possible source of bugs
        this.apply_preconfigured_networks(this.selected_template, new_host);
        // this.configure_connection_submit(new_host.hostname);
      }

      this.update_pod_summary('hosts');
      this.display_connections();
      this.save();
      return; 
    }

    /**
     * Applies networks from the provided template to the provided host
     */
    apply_preconfigured_networks(template, host) {
        const networks = template.networks;
        for (let i = 0; i < networks.length; i++) {
          const connections = networks[i].bondgroup.connections;
          for (let j = 0; j < connections.length; j++) {
            const ifaces = connections[j].ifaces;
            for (let k = 0; k < ifaces.length; k++) {
              if (ifaces[k].hostname === host.original_hostname) { // found a match - HUGE BUG: CHANGING HOSTNAME CAUSES IT TO NOT FIND THE CORRECT HOST
                for (let l = 0; l < host.interfaces.length; l++) {
                    if (host.interfaces[l].name === ifaces[k].name) {
                      host.interfaces[l].connections.set(networks[i].name, connections[j].tagged);
                    }
                }
              }
              // 
            }
          }
        }
    }

    delete_host_button(button_id) {
      // Set step
      this.step = 1;
      document.getElementById('workflow-prev').removeAttribute('disabled');
      document.getElementById('workflow-next').removeAttribute('disabled');

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
      this.save();
    }

    delete_network_button(button_id) {
      // Set step
      this.step = 2
      document.getElementById('workflow-prev').removeAttribute('disabled');
      document.getElementById('workflow-next').removeAttribute('disabled');

      // Uses button id string to find the network to delete from the pod template.
      // All network delete buttons are in the form "delete-network-networkname"

      // All connections must be cleared if a network is added after a connection already exists

      // Delete network from template
      const network_name = button_id.substring(15);
      this.pod.remove_network(network_name);

      // For each interface in each host, remove the network from the connections map
      for (let host_index = 0; host_index < this.pod.host_list.length; host_index++) {
        const host = this.pod.host_list[host_index];
        for (let iface_index = 0; iface_index < host.interfaces.length; iface_index++) {
          host.interfaces[iface_index].connections.delete(network_name);
        }
      }

      // Delete network card
      document.getElementById(button_id).parentElement.parentElement.parentElement.remove();

      // Show plus card
      if (this.pod.network_list.length >= 7) {
        document.getElementById('network-plus-card').hidden = false;
      }

      this.display_connections();
      this.save();
    }

    add_network_button() {
      this.step = 2
      document.getElementById('workflow-prev').removeAttribute('disabled');
      document.getElementById('workflow-next').removeAttribute('disabled');

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

      // New empty card
      const network_plus_card = document.getElementById('network-plus-card');
      const new_card = document.createElement('div');
      new_card.classList.add("col-xl-3", "col-md-6","col-12");
      new_card.innerHTML = 
        `<div class="card pb-0" id="new_network_card">
          <div class="card-body pb-0">
            <div class="row justify-content-center my-5 mx-2">
              <input type="text" class="form-control col-12 mb-2 text-center" id="network_input" style="font-size: 1.75rem;" placeholder="Enter Network Name">
              <span class="text-danger mt-n2" id="adding_network_error"></span>
            </div>
            <div class="row mb-3">
              <div class="col-6"><button class="btn btn-danger w-100" onclick="work.delete_new_network()">Delete</button></div>
              <div class="col-6"><button class="btn btn-success w-100" id="adding_network_confirm" onclick="work.confirm_new_network()" disabled>Confirm</button></div>
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
          confirm_button.setAttribute('disabled', '');
          return;
        }

        if (network_input.value.length > 25) {
          error_message.innerText = 'Network names cannot exceed 25 characters';
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

      // Need to go through every interface of every host and add this network to the connections map with a value of null
      for (let host_index = 0; host_index < this.pod.host_list.length; host_index++) {
        const host = this.pod.host_list[host_index];
        for (let iface_index = 0; iface_index < host.interfaces.length; iface_index++) {
          host.interfaces[iface_index].connections.set(network_name, null);
        }
      }

      this.delete_new_network(); // deletes network card and sets "adding_network" to false, which is used for the interactive workflow.

      const new_card = document.createElement('div');
      new_card.classList.add("col-xl-3", "col-md-6","col-12", "my-3");
      new_card.innerHTML = `
          <div class="card">
            <div class="text-center">
              <h3 class="py-5 my-4">` + network_name + `</h3>
            </div>
            <div class="row mb-3 mx-3">
                <button class="btn btn-danger w-100" id="delete-network-` + network_name + `" onclick="work.delete_network_button(id)">Delete</button>
            </div>
          </div>`;

      if (this.pod.network_list.length == 8) {
        network_plus_card.hidden = true;
      }
      network_plus_card.parentNode.insertBefore(new_card, network_plus_card);
      this.display_connections();
      this.save();
    }

    delete_new_network() {
      // Remove the new network card
      document.getElementById('new_network_card').parentElement.remove();
      document.getElementById('network-plus-card').hidden = false;
      this.adding_network = false;
    }

    /**
     * Goes through all interfaces on all hosts in pod.host_list and displays the connection information in the connection cards
     * Easiest implementation is to clear the connection cards and manually re-render them every time a network is added or deleted
     */
    display_connections() {
      
      for (let host_index = 0; host_index < this.pod.host_list.length; host_index++) { // for each host
        const host = this.pod.host_list[host_index];
        const connections_list = document.getElementById("connections-list-" + host.hostname);
        connections_list.innerHTML = "";
        for (let iface_index = 0; iface_index < host.interfaces.length; iface_index++) { // for each interface in host
          const iface = host.interfaces[iface_index];
          const new_li = document.createElement('li');
          new_li.classList.add('list-group-item');
          new_li.innerText = iface.name;
          const new_connections_ul = document.createElement('ul');
          new_li.appendChild(new_connections_ul);
          connections_list.appendChild(new_li);
          for (const [key, value] of iface.connections) { // for each connection on the interface, add to the list
            const new_connection_li = document.createElement('li');
            let tagged_str;
            if (value === true) {
              tagged_str = "Tagged";
            } else if (value === false) {
              tagged_str = "Untagged";
            } else {
              tagged_str = "No Connection";
            }
            new_connection_li.innerText = key + ": " + tagged_str;
            new_connections_ul.appendChild(new_connection_li);
          }
        }
      }
    }

    display_connections_modal_content(hostname) { // changes elements in the configure connections modal
      const tablist = document.getElementById('configure-connections-tablist');
      tablist.innerHTML = '';
      const table = document.getElementById('connections_widget');
      let first_tab = null;
      // Find host object
      let host;
      for (let i in this.pod.host_list) {
        if (hostname == this.pod.host_list[i].hostname) {
          host = this.pod.host_list[i];
          break;
        }
      }

      // Interface tabs
      for (let i in host.interfaces) {
        const li_interface = document.createElement('li');
        li_interface.classList.add('nav-item');
        const btn_interface = document.createElement('a');
        btn_interface.classList.add('nav-link', 'interface-btn');
        btn_interface.id = "select-interface-" + i + "_" + hostname;
        btn_interface.setAttribute("onclick", "work.select_td_interface(id)");
        btn_interface.setAttribute('href', "#");
        btn_interface.setAttribute('role', 'tab');
        btn_interface.setAttribute('data-toggle', 'tab'); 
        btn_interface.innerText = host.interfaces[i].name;
        li_interface.appendChild(btn_interface);
        tablist.appendChild(li_interface);

        if (i == 0) { // grab reference to first tab
          first_tab = btn_interface;
        }
      }

      // Connection radios
      table.setAttribute('hidden', '');
      table.innerHTML = `
      <tr>
        <th>Network</th>
        <th colspan='2'>Vlan</th>
      </tr>
      `;
      const tbody = document.createElement('tbody');
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
          btn_tagged.classList.add("btn", "w-100", "h-100", "vlan-radio", "tagged", "border");
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
          btn_untagged.classList.add("btn", "w-100", "h-100", "vlan-radio", "untagged" ,"border");
          btn_untagged.id = "untagged_" + this.selected_interface + "_" + this.pod.network_list[i] + "_" + hostname;
          btn_untagged.setAttribute("onclick" ,"work.vlan_radio(id)");
          btn_untagged.innerText = "untagged";

          td_untagged.appendChild(btn_untagged);
        }
        new_row.appendChild(td_untagged);

        tbody.appendChild(new_row);
      }

      table.appendChild(tbody);

      if (first_tab) {
        first_tab.classList.add('active'); // pre-select first tab
        this.select_td_interface(first_tab.id);
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

      let connections = selected_interface.connections;

      // Highlight selection
      button.classList.add('btn-success');


      const untagged_buttons = document.querySelectorAll('button.untagged:not(.btn-success)');
      // Re-selecting a selected button will remove the connection
      if (option == 'tagged') {
        for (const [key, value] of connections) {
          if (key == network && value == true) {
            button.classList.remove('btn-success')
            connections.set(network, null);
            return;
          }
        }
      } else {
        for (const [key, value] of connections) {
          if (key == network && value == false) {
            button.classList.remove('btn-success')
            connections.set(network, null);
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

        for (const [key, value] of connections) {
          if (key == network) {
            connections.set(network, true)
          }
        }
      } else {
        document.getElementById('tagged_' + interface_name + "_" + network + "_" + hostname).classList.remove('btn-success');
        for (const [key, value] of connections) {
          if (key == network) {
            connections.set(network, false);
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
        for (const [key, value] of connections) {
          if (value == false) return;
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
      new_card.innerHTML = `
        <div class="card">
          <div class="card-header text-center p-0">
            <h3 class="mt-2">` + hostname + `</h3>
          </div>
          <div class="card-body card-body-scroll p-0">
            <ul class="list-group list-group-flush h-100" id="connections-list-` + hostname + `">
          </div>
          <div class="card-footer">
            <button class="btn btn-info w-100" id="configure-connection-` + hostname + `" onclick="work.configure_connection_button(id)">Configure</button>
          </div>
        </div>`;

      card_deck.appendChild(new_card);
    }

    configure_connection_button(id) {
      this.step = 3;
      document.getElementById('workflow-prev').removeAttribute('disabled');
      document.getElementById('workflow-next').removeAttribute('disabled');

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

      work.display_connections_modal_content(id.substring(21)); //passes hostname as a parameter
      document.getElementById('connection-modal-submit').setAttribute("onclick", "work.configure_connection_submit('" + id.substring(21) + "')");
      $("#connection-modal").modal('toggle');

    }

    configure_connection_submit() {
      this.display_connections();
      this.save();
    }


    select_td_interface(id) {
      this.selected_interface = document.getElementById(id).innerText;

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

        for (const [key, value] of selected_interface.connections) {
          if (value != null) {
            if (value == true && option == "tagged" && key == network) {
              radios.item(i).classList.add('btn-success');
            } else if (value == false && option == "untagged" && key == network) {
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

    clear_connection_cards() {
      const connection_cards = document.querySelectorAll('.card-body-scroll .list-group');
      for (let c in connection_cards) {
        connection_cards.item(c).innerHTML = '';
      }
    }

    delete_all_connections() {
      for (let i in this.pod.host_list) {
        for (let j in this.pod.host_list[i].interfaces) {
          this.pod.host_list[i].interfaces[j].connections = [];
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
          new_li.innerText = hosts[i].hostname + ': ' + this.lab_flavor_from_uuid(hosts[i].flavor).name + ' (' + hosts[i].image + ')';
          list.appendChild(new_li);
        }
      } else {
        console.log(section + ' is not a valid section.');
      }


    }

    has_minimum_connections() {

      for (let i = 0; i < this.pod.host_list.length; i++) { // for each host
        let hasConnection = false;
        for (let j = 0; j < this.pod.host_list[i].interfaces.length; j++) { // for each interface
          const connection = this.pod.host_list[i].interfaces[j].connections;
          for (const [key, val] of connection) {
            if (val != null) {
              hasConnection = true;
              break; // no need to keep checking this interface / host
            }
          }
        }

        if (!hasConnection) {
          return [false, this.pod.host_list[i].hostname];
        }
      }
    }

    async submit() {
      this.step = 5;
      document.getElementById('workflow-prev').removeAttribute('disabled');
      document.getElementById('workflow-next').setAttribute('disabled', '');

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

      this.pod.id = await this.create_template_blob();
      this.commit_template();
      alert('The pod was created successfully!');
      window.onbeforeunload = null;
      window.location.href = "../../";
    }

    save() {
      // Keep as a stub until save / resume feature is ready to be deployed
    }

    // creates a new template blob in liblaas from an lltemplate
    async create_template_blob() {
      return talk_to_liblaas("POST", "template/", this.pod.convert_to_lltemplate())
    }

    async update_template_blob() {
      // todo
    }

    // Tells liblaas to commit the templateblob into a finished template
    async commit_template() {
      return talk_to_liblaas("POST", "template/" + this.pod.id + "/commit", {})
    }

    lab_flavor_from_uuid(uuid_string) {
      for (let i = 0; i < this.lab_flavors.length; i++) {
        if (this.lab_flavors[i].id == uuid_string) return this.lab_flavors[i];
      }

      return null; // This should never get hit
    }
    
  }
