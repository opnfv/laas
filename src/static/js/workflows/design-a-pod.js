/*
design-a-pod.js

Functions as the "controller" part of MVC
*/


const steps = {
  SELECT_LAB: 0,
  ADD_RESOURCES: 1,
  ADD_NETWORKS: 2,
  CONFIGURE_CONNECTIONS: 3,
  POD_DETAILS: 4,
  POD_SUMMARY: 5
}

/** Concrete controller class that handles button inputs from the user.
 * Holds the in-progress TemplateBlob.
 * Click methods are prefaced with 'onclick'.
 * Step initialization methods are prefaced with 'step'.
 */
class DesignWorkflow extends Workflow {
    constructor(savedTemplateBlob) {
        super(["select_lab", "add_resources", "add_networks", "configure_connections", "pod_details", "pod_summary"])

        // if(savedTemplateBlob) {
        //     this.resume_workflow();
        // }

        this.templateBlob = new TemplateBlob({});
        this.labFlavors; // Map<UUID, FlavorBlob>
        this.labImages;  // List<ImageBlob>
        this.userTemplates; // List<TemplateBlob>
        this.resourceBuilder; // ResourceBuilder
        this.connectionBuilder; // ConnectionBuilder

        this.templateBlob.public = false;
    }

    /** Finds the templateBlob object in the userTemplates list based on a given uuid */
    getTemplateById(template_id) {
        for (let template of this.userTemplates) {
          if (template.id == template_id) {
            return template;
          }
        }
        return null;
    }

    resumeWorkflow() {
        todo()
    }

    /** Initializes the select_lab step */
    async startWorkflow() {
        this.setPodDetailEventListeners();
        const labs = await LibLaaSAPI.getLabs();
        GUI.display_labs(labs);
        document.getElementById(this.sections[0]).scrollIntoView({behavior: 'smooth'});
    }

    /** Adds the public network on start */
    addDefaultNetwork() {
      const new_network = new NetworkBlob({});
      new_network.name = "public";
      new_network.public = true;
      this.addNetworkToPod(new_network);
      GUI.refreshNetworkStep(this.templateBlob.networks);
    }

    /** Takes an HTML element */
    async onclickSelectLab(lab_card) {
        this.step = steps.SELECT_LAB;

        if (this.templateBlob.lab_name == null) { // Lab has not been selected yet
            this.templateBlob.lab_name = lab_card.id;
            lab_card.classList.add("selected_node");
            await this.setLabDetails(this.templateBlob.lab_name);
            this.addDefaultNetwork();
        } else { // Lab has been selected
            if(confirm('Unselecting a lab will reset all selected resources, are you sure?')) {
                location.reload();
            }
        }
    }

    /** Calls the API to fetch flavors and images for a lab */
    async setLabDetails(lab_name) {
        const flavorsList = await LibLaaSAPI.getLabFlavors(lab_name);
        this.labFlavors = new Map(); // Map<UUID, FlavorBlob>

        for (const fblob of flavorsList) {
          this.labFlavors.set(fblob.flavor_id, fblob);
        }

        this.labImages = await LibLaaSAPI.getLabImages(lab_name);
        this.userTemplates = await LibLaaSAPI.getTemplatesForUser();
    }

    /** Prepopulates fields and launches the modal */
    onclickAddResource() {
      // Set step
      // Check prerequisites
      // Reset resourceBuilder
      // Generate template cards
      // Show modal

      this.step = steps.ADD_RESOURCES;

      if (this.templateBlob.lab_name == null) {
          alert("Please select a lab before adding resources.");
          this.goTo(steps.SELECT_LAB);
          return;
      }

      if (this.templateBlob.host_list.length >= 8) {
        alert("You may not add more than 8 hosts to a single pod.")
        return;
      }

      this.resourceBuilder = null;
      GUI.refreshAddHostModal(this.userTemplates);
      $("#resource_modal").modal('toggle');

    }

    onclickSelectTemplate(template_id, card) {

      // Do nothing on reselect
      if (this.resourceBuilder && this.resourceBuilder.template_id == template_id) {
        return;
      }
      
      if (this.resourceBuilder) {
        GUI.unhighlightCard(document.querySelector('#template-cards .selected_node'));
      }

      this.resourceBuilder = new ResourceBuilder(this.getTemplateById(template_id));
      GUI.highlightCard(card);
      GUI.refreshConfigSection(this.resourceBuilder, this.labFlavors);
      GUI.refreshInputSection(this.resourceBuilder, this.labImages);
    }

    onclickSelectNode(index) {
      this.resourceBuilder.tab = index;
      GUI.refreshInputSection(this.resourceBuilder, this.labImages);
    }

    onclickSelectImage(image_index, card) {
      const old_selection = document.querySelector("#image-cards .selected_node");
      if (old_selection) {
        GUI.unhighlightCard(old_selection);
      }
      this.resourceBuilder.user_configs[this.resourceBuilder.tab].image = this.labImages[image_index].image_id;
      GUI.highlightCard(card.childNodes[1]);
    }

    /** Takes a string and returns a tuple containing the  result and the error message (bool, string)*/
    isValidHostname(hostname) {
      let result = true;
      let message = "success";

      if (hostname == null || hostname == '') {
        result = false;
        message = 'Please enter a hostname';
        
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

    /** Takes a hostname and a list of existing hosts and checks for duplicates in the existing hostlist*/
    isUniqueHostname(hostname, existing_hosts) {
      // Todo for a new hire? Make this more efficient
      for (const existing_host of existing_hosts) {
        if (hostname == existing_host.hostname) {
          return false;
        }
      }

      return true;
    }

    onclickSubmitHostConfig() {
      // Validate form fields
      // Create host config blobs
      // Apply networking
      // Create cards (refresh hostcard view)
      // Refresh networks view
      // Refresh connections view

      // Validate Configs
      for (const [index, host] of this.resourceBuilder.user_configs.entries()) {
        let result = this.isValidHostname(host.hostname);
        if (!result[0]) {
          this.resourceBuilder.tab = index;
          GUI.refreshConfigSection(this.resourceBuilder, this.labFlavors);
          GUI.refreshInputSection(this.resourceBuilder, this.labImages);
          GUI.showHostConfigErrorMessage(result[1]);
          return;
        }

        let uniqueHost = this.isUniqueHostname(host.hostname, this.templateBlob.host_list);
        if (!uniqueHost) {
          this.resourceBuilder.tab = index;
          GUI.refreshConfigSection(this.resourceBuilder, this.labFlavors);
          GUI.refreshInputSection(this.resourceBuilder, this.labImages);
          GUI.showHostConfigErrorMessage("Hostname '"+ host.hostname + "' already exists in Pod.");
          return;
        }

        if (index < this.resourceBuilder.user_configs.length - 1) {
          let uniqueConfigName = true;
          for (let i = index + 1; i < this.resourceBuilder.user_configs.length; i++) {
              if (host.hostname == this.resourceBuilder.user_configs[i].hostname) {
                uniqueConfigName = false;
                break;
              }
          }
  
          if (!uniqueConfigName) {
            this.resourceBuilder.tab = index;
            GUI.refreshConfigSection(this.resourceBuilder, this.labFlavors);
            GUI.refreshInputSection(this.resourceBuilder, this.labImages);
            GUI.showHostConfigErrorMessage("Hostname '"+ host.hostname + "' is a duplicate hostname.");
            return;
          }
        }

        // todo
        // let result2 = isValidCIFile(host.cifile[0]);
      }


      // Add host configs to TemplateBlob
      for (const [index, host] of this.resourceBuilder.user_configs.entries()) {
        const new_host = new HostConfigBlob(host);
        this.templateBlob.host_list.push(new_host);
      }

      // Create convert map for applying config hostnames to preconfigured networks
      // Map from original to config name
      // Pretty sure this is O(n^2) because of the way JS lists work
      const convertmap = new Map();
      for (let i = 0; i < this.resourceBuilder.original_configs.length; i++) {
        convertmap.set(this.resourceBuilder.original_configs[i].hostname, this.resourceBuilder.user_configs[i].hostname);
      }

      // Preconfigure networks
      for (const network of this.resourceBuilder.networks) {
        // Check if the network exists
        // If it doesn't, create it

        // If it does, point to it

        // Either way, add the connections to the bondgroup


        let copied_network = this.templateBlob.findNetwork(network.name);

        if (!copied_network) {
          copied_network = new NetworkBlob({"name": network.name});
          this.templateBlob.networks.push(copied_network);
        }

        // Need to add connections
        for (const existing_connection of network.bondgroups[0].connections) {
            const new_connection = new ConnectionBlob({});
            new_connection.tagged = existing_connection.tagged;
            new_connection.iface = new IfaceBlob(existing_connection.iface);
            new_connection.iface.hostname = convertmap.get(new_connection.iface.hostname);
            copied_network.bondgroups[0].connections.push(new_connection);
        }
        
      }


        // We are done
        GUI.refreshHostStep(this.templateBlob.host_list, this.labFlavors, this.labImages);
        GUI.refreshNetworkStep(this.templateBlob.networks);
        GUI.refreshConnectionStep(this.templateBlob.host_list, this.templateBlob.networks);
        GUI.refreshPodSummaryHosts(this.templateBlob.host_list, this.labFlavors, this.labImages)
        $('#resource_modal').modal('hide')
    }

    /**
     * Takes a hostname, looks for the matching HostConfigBlob in the TemplateBlob, removes it from the list, and refreshes the appropriate views
     * @param {String} hostname 
     */
    onclickDeleteHost(hostname) {
      this.step = steps.ADD_RESOURCES;
      for (let existing_host of this.templateBlob.host_list) {
        if (hostname == existing_host.hostname) {
          this.removeHostFromTemplateBlob(existing_host);
          GUI.refreshHostStep(this.templateBlob.host_list, this.labFlavors, this.labImages);
          GUI.refreshNetworkStep(this.templateBlob.networks);
          GUI.refreshConnectionStep(this.templateBlob.host_list, this.templateBlob.networks);
          GUI.refreshPodSummaryHosts(this.templateBlob.host_list, this.labFlavors, this.labImages);
          return;
        }
      }

      alert("didnt remove");
    }




    /** onclick handler for the add_network_plus_card */
    onclickAddNetwork() {
      // Set step
      // Prerequisite step checks
      // GUI stuff

      this.step = steps.ADD_NETWORKS;

      if (this.templateBlob.lab_name == null) {
          alert("Please select a lab before adding networks.");
          this.goTo(steps.SELECT_LAB);
          return;
      }

      if (document.querySelector('#new_network_card') != null) {
        alert("Please finish adding the current network before adding a new one.");
        return;
      }

      GUI.display_network_input();
    }

    /** onclick handler for the adding_network_confirm button */
    onclickConfirmNetwork() {
      this.step = steps.ADD_NETWORKS;

      // Add the network
      // call the GUI to make the card (refresh the whole view to make it easier)

      const new_network = new NetworkBlob({});
      new_network.name = document.getElementById('network_input').value;
      new_network.public = document.getElementById('network-public-input').checked;
      const error_message = this.addNetworkToPod(new_network);

      if (error_message == null) {
        GUI.refreshNetworkStep(this.templateBlob.networks);
        GUI.refreshConnectionStep(this.templateBlob.host_list, this.templateBlob.networks);
      } else {
        GUI.display_add_network_error(error_message);
      }
    }

    /** Takes a NetworkBlob and tries to add to the TemplateBlob.
     * Fails if input validation fails.
     * Returns error message or null.
     */
    addNetworkToPod(networkBlob) {
      if (networkBlob.name == '' || networkBlob.name == null) {
        return "Network name cannot be empty.";
      }

      if (networkBlob.name.length > 25) {
        return 'Network names cannot exceed 25 characters';
      }

      if (!(networkBlob.name.match(/^[0-9a-z-]+$/i))) {
        return 'Network names must only contain alphanumeric characters and dashes';
      }

      if ((networkBlob.name.charAt(0).match(/^[0-9-]+$/)) || (networkBlob.name.charAt(networkBlob.name.length - 1) == '-')) {
        return 'Network names must start with a letter and end with a letter or digit.';
      }

      for (let existing_network of this.templateBlob.networks) {
        if (networkBlob.name == existing_network.name) {
          return 'Networks must have unique names';
        }
      }

      this.templateBlob.networks.push(networkBlob);
      return null;
    }

    /** Iterates through the templateBlob looking for the correct network to delete 
     * Takes a network name as a parameter.
    */
    onclickDeleteNetwork(network_name) {
      this.step = steps.ADD_NETWORKS;

      for (let existing_network of this.templateBlob.networks) {
        if (network_name == existing_network.name) {
          this.removeNetworkFromTemplateBlob(existing_network);
          GUI.refreshNetworkStep(this.templateBlob.networks);
          GUI.refreshConnectionStep(this.templateBlob.host_list, this.templateBlob.networks);
          return;
        }
      }

      alert("didnt remove");
    }

    /** Rebuilds the list without the chosen template */
    removeNetworkFromTemplateBlob(network_to_remove) {
      this.templateBlob.networks = this.templateBlob.networks.filter(network => network !== network_to_remove);
    }

    /**
     * Rebuilds the hostlist without the chosen host
     * Also removes all connections from this host's interfaces
     * @param {HostConfigBlob} hostBlob 
     */
    removeHostFromTemplateBlob(hostBlob) {
      this.templateBlob.host_list = this.templateBlob.host_list.filter(host => host !== hostBlob);

      // Needs to go through every network, every bondgroup (realistically only [0]), connection, and interface, and somehow bubble up the deletion

      for (const network of this.templateBlob.networks) {
        for (const bondgroup of network.bondgroups) {
          let to_remove_list = [];
          for (let connection of bondgroup.connections) {
            if (connection.iface.hostname == hostBlob.hostname) {
              to_remove_list.push(connection);
            }
          }
          for (let target of to_remove_list) {
            // This probably has terrible time complexity but it works for now
            bondgroup.connections = bondgroup.connections.filter(conn => conn !== target);
          }
        }
      }
    }

    onclickConfigureConnection(hostname) {
      this.step = steps.CONFIGURE_CONNECTIONS;

      const host = this.templateBlob.findHost(hostname);
      if (!host) {
        alert("host not found error");
      }

      this.connectionBuilder = new ConnectionBuilder(host, this.templateBlob.networks, this.labFlavors);
      GUI.refreshConnectionModal(this.connectionBuilder);
      $("#connection_modal").modal('toggle');
    }

    onclickSelectIfaceTab(tab_index) {
      this.connectionBuilder.tab = tab_index
      // this.connectionBuilder.ifaceConnections().get(iface_name)
      GUI.refreshConnectionModal(this.connectionBuilder);
    }

    onclickSelectVlan(network_name, tagged, iface_name) {
      const x = this.connectionBuilder.ifaceConnections.get(iface_name); // i am out of variable names in my brain
      if (x.get(network_name) === tagged) {
        x.set(network_name, null);
      } else {
        x.set(network_name, tagged);
      }

      GUI.refreshConnectionTable(this.connectionBuilder, iface_name);
    }

    onclickSubmitConnectionConfig() {
      this.applyConnectionConfigs();
      GUI.refreshConnectionStep(this.templateBlob.host_list, this.templateBlob.networks);
    }

    /**
     * Take the configs stored in the connectionBuilder and apply them to the networks in the templateBlob
     */
    applyConnectionConfigs() {
      // This is slow and there really isn't a clean way to do this due to the structure of the networkblob
      // const hostname = this.connectionBuilder.host.hostname;
      // const connections = this.connectionBuilder.ifaceConnections;

      const networkMap = new Map(); // Map<String, NetworkBlob>
      // Invalidate connections on the hostname and build map of network name to networkBlob
      for (const network of this.templateBlob.networks) {
        networkMap.set(network.name, network); // To make accessing this network easier later
        for (const bondgroup of network.bondgroups) {
          bondgroup.connections = bondgroup.connections.filter(function(connection) {
            return connection.iface.hostname != workflow.connectionBuilder.host.hostname;
          })
        }
      }

      for (const [iface_name, configs] of this.connectionBuilder.ifaceConnections) {
        for (const [network_name, tagged] of configs) {
          if (tagged != null) {
            const targetNetwork = networkMap.get(network_name);
            const newIfaceBlob = new IfaceBlob({});
            newIfaceBlob.hostname = this.connectionBuilder.host.hostname;
            newIfaceBlob.name = iface_name;
  
            const newConnectionBlob = new ConnectionBlob({});
            newConnectionBlob.iface = newIfaceBlob;
            newConnectionBlob.tagged = tagged;
  
  
            targetNetwork.bondgroups[0].connections.push(newConnectionBlob)
          }
        }
      }
    }

    /** Sets input validation event listeners and clears the value in case of caching*/
    setPodDetailEventListeners() {
      const pod_name_input = document.getElementById("pod-name-input");
      const pod_desc_input = document.getElementById("pod-desc-input");
      const pod_public_input = document.getElementById("pod-public-input");

      pod_name_input.value = "";
      pod_desc_input.value = "";
      pod_public_input.checked = false;

      pod_name_input.addEventListener('focusout', (event)=> {
        workflow.onFocusOutPodNameInput(pod_name_input);
      });

      pod_name_input.addEventListener('focusin', (event)=> {
        this.step = steps.POD_DETAILS;
        GUI.unhighlightError(pod_name_input);
        GUI.hidePodDetailsError();
      });

      pod_desc_input.addEventListener('focusout', (event)=> {
        workflow.onFocusOutPodDescInput(pod_desc_input);
      });

      pod_desc_input.addEventListener('focusin', (event)=> {
        this.step = steps.POD_DETAILS;
        GUI.unhighlightError(pod_desc_input);
        GUI.hidePodDetailsError();
      });

      pod_public_input.addEventListener('focusout', (event)=> {
        this.step = steps.POD_DETAILS;
        workflow.onFocusOutPodPublicInput(pod_public_input);
      });
    }

    onFocusOutPodNameInput(element) {
      const pod_name = element.value;
      const validator = this.validatePodInput(pod_name, 53, "Pod name");

      if (validator[0]) {
        this.templateBlob.pod_name = pod_name;
        GUI.refreshPodSummaryDetails(this.templateBlob.pod_name, this.templateBlob.pod_desc, this.templateBlob.public)
      } else {
        GUI.highlightError(element);
        GUI.showPodDetailsError(validator[1]);
      }
    }

    onFocusOutPodDescInput(element) {
      const pod_desc = element.value;
      const validator = this.validatePodInput(pod_desc, 255, "Pod description");

      if (validator[0]) {
        this.templateBlob.pod_desc = pod_desc;
        GUI.refreshPodSummaryDetails(this.templateBlob.pod_name, this.templateBlob.pod_desc, this.templateBlob.public)
      } else {
        GUI.highlightError(element);
        GUI.showPodDetailsError(validator[1]);
      }

    }

    onFocusOutPodPublicInput(element) {
      this.templateBlob.public = element.checked;
      GUI.refreshPodSummaryDetails(this.templateBlob.pod_name, this.templateBlob.pod_desc, this.templateBlob.public)
    }

    /** Returns a tuple containing result and message (bool, String) */
    validatePodInput(input, maxCharCount, form_name) {
      let result = true;
      let message = "valid"

      if (input === '') {
        message = form_name + ' cannot be empty.';
        result = false;
      }
      else if (input.length > maxCharCount) {
        message = form_name + ' cannot exceed ' + maxCharCount + ' characters.';
        result = false;
      } else if (!(input.match(/^[a-z0-9~@#$^*()_+=[\]{}|,.?': -!]+$/i))) {
        message = form_name + ' contains invalid characters.';
        result = false;
      }

      return [result, message]
    }

    async onclickDiscardTemplate() {
      this.step = steps.POD_SUMMARY;
      if(confirm('Are you sure you wish to delete this Pod?')) {
        await LibLaaSAPI.deleteTemplate(this.templateBlob);
        location.reload();
      }
    }

    simpleStepValidation() {
      let passed = true;
      let message = "done";
      let step = steps.POD_SUMMARY;

      if (this.templateBlob.lab_name == null) {
        passed = false;
        message = "Please select a lab";
        step = steps.SELECT_LAB;
      } else if (this.templateBlob.host_list.length < 1 || this.templateBlob.host_list.length > 8) {
        passed = false;
        message = "Pods must contain 1 to 8 hosts";
        step = steps.ADD_RESOURCES;
      } else if (this.templateBlob.networks.length < 1) {
        passed = false;
        message = "Pods must contain at least one network.";
        step = steps.ADD_NETWORKS;
      } else if (this.templateBlob.pod_name == null || this.templateBlob.pod_desc == null) {
        passed = false;
        message = "Please add a valid pod name and description.";
        step = steps.POD_DETAILS;
      }
      return [passed, message, step];
    }

    async onclickSubmitTemplate() {
      this.step = steps.POD_SUMMARY;
      const simpleValidation = this.simpleStepValidation();
      if (!simpleValidation[0]) {
        alert(simpleValidation[1])
        this.goTo(simpleValidation[2]);
        return;
      }

      // todo - make sure each host has at least one connection on any network.

      if (confirm("Are you sure you wish to create this pod?")) {
        let success =  await LibLaaSAPI.makeTemplate(this.templateBlob);
        if (success) {
          window.location.href = "../../";
        } else {
          alert("Could not create template.")
        }
      }
    }
}

/** View class that displays cards and generates HTML 
 * Functions as a namespace, does not hold state
*/
class GUI {
    /** Takes a list of LabBlobs and creates a card for each of them on the screen */
    static display_labs(labs) {
        const card_deck = document.getElementById('lab_cards');
        for (let lab of labs) {
          const new_col = document.createElement('div');
          new_col.classList.add('col-xl-3','col-md-6','col-11');
          let status;
          if (lab.status == 0) {
            status = "Up";
          } else if (lab.status == 100) {
            status = "Down for Maintenance";
          } else if (lab.status == 200) {
            status = "Down";
          } else {
            status = "Unknown";
          }
  
          new_col.innerHTML = `
          <div class="card" id= ` + lab.name + `>
            <div class="card-header">
                <h3 class="mt-2">` + lab.name + `</h3>
            </div>
            <ul class="list-group list-group-flush h-100">
              <li class="list-group-item">Name: ` + lab.name + `</li>
              <li class="list-group-item">Description: ` + lab.description + `</li>
              <li class="list-group-item">Location: ` + lab.location + `</li>
              <li class="list-group-item">Status: `+ status + `</li>
            </ul>
            <div class="card-footer">
                <btn class="btn btn-success w-100 stretched-link" href="#" onclick="workflow.onclickSelectLab(this.parentNode.parentNode)">Select</btn>
            </div>
          </div>
          `
          card_deck.appendChild(new_col);
        }
    }

    static highlightCard(card) {
      card.classList.add('selected_node');
    }

    static unhighlightCard(card) {
      card.classList.remove('selected_node');
    }

    /** Resets the host modal inner html 
     * Takes a list of templateBlobs
    */
    static refreshAddHostModal(template_list) {
      document.getElementById('add_resource_modal_body').innerHTML = `
      <h2>Resource</h2>
      <div id="template-cards" class="row align-items-center justify-content-start">
      </div>

      <div id="template-config-section">
        <ul class="nav nav-tabs" role="tablist" id="add_resource_tablist">
          <!-- add a tab per host in template -->
        </ul>
        <!-- tabs -->
        <div id="resource_config_section" hidden="true">
          <h2>Image</h2>
          <div id="image-cards" class="row justify-content-start align-items-center">
          </div>
          <div class="form-group">
            <h2>Hostname</h2>
            <input type="text" class="form-control" id="hostname-input" placeholder="Enter Hostname">
            <h2>Cloud Init</h2>
            <div class="d-flex justify-content-center align-items-center">
              <textarea name="ci-textarea" id="ci-textarea" rows="5" class="w-100"></textarea>
            </div>
          </div>
        </div>
      </div>
      <p id="add-host-error-msg" class="text-danger"></p>
      `

      const template_cards = document.getElementById('template-cards');

      for (let template of template_list) {
        template_cards.appendChild(this.makeTemplateCard(template));
      }
    }


    /** Makes a card to be displayed in the add resource modal for a given templateBlob */
    static makeTemplateCard(templateBlob) {
        const col = document.createElement('div');
        col.classList.add('col-12', 'col-md-6', 'col-xl-3', 'my-3');
        col.innerHTML=  `
          <div class="card" id="card-" ` + templateBlob.id + `>
            <div class="card-header">
                <p class="h5 font-weight-bold mt-2">` + templateBlob.pod_name + `</p>
            </div>
            <div class="card-body">
                <p class="grid-item-description">` + templateBlob.pod_desc +`</p>
            </div>
            <div class="card-footer">
                <button type="button" class="btn btn-success grid-item-select-btn w-100 stretched-link" 
                onclick="workflow.onclickSelectTemplate('` + templateBlob.id + `', this.parentNode.parentNode)">Select</button>
            </div>
          </div>
        `
        return col;
    }

    /** Takes a ResourceBuilder and generates form fields */
    static refreshConfigSection(resourceBuilder, flavors) {
      // Create a tab for head host in the selected template
      const tablist = document.getElementById('add_resource_tablist'); // ul
      tablist.innerHTML = "";
      for (const [index, host] of resourceBuilder.user_configs.entries()) {
        const li_interface = document.createElement('li');
        li_interface.classList.add('nav-item');
        const btn_interface = document.createElement('a');
        btn_interface.classList.add('nav-link', 'interface-btn');
        btn_interface.id = "select-node-" + index;
        btn_interface.setAttribute("onclick", "workflow.onclickSelectNode("+ index + ")");
        btn_interface.setAttribute('href', "#");
        btn_interface.setAttribute('role', 'tab');
        btn_interface.setAttribute('data-toggle', 'tab'); 
        btn_interface.innerText = flavors.get(host.flavor).name;

        if (index == resourceBuilder.tab) {
          btn_interface.classList.add('active');
        }
        li_interface.appendChild(btn_interface);
        tablist.appendChild(li_interface);
      }
    }

    static refreshInputSection(resourceBuilder, image_list) {
            // config stuff
            const image_cards = document.getElementById('image-cards');
            const hostname_input = document.getElementById('hostname-input');
            const ci_textarea = document.getElementById('ci-textarea');
      
            image_cards.innerHTML = "";
            for (let [index, image] of image_list.entries()) {
              const new_image_card = this.makeImageCard(image);
              new_image_card.setAttribute("onclick", "workflow.onclickSelectImage(" + index + ", this)");
              if (resourceBuilder.user_configs[resourceBuilder.tab].image == image.image_id) {
                GUI.highlightCard(new_image_card.childNodes[1]);
              }
              image_cards.appendChild(new_image_card);
            }
      
            // Hostname input
            hostname_input.value = resourceBuilder.user_configs[resourceBuilder.tab].hostname;
            hostname_input.addEventListener('focusout', (event)=> {
              resourceBuilder.user_configs[resourceBuilder.tab].hostname = hostname_input.value;
            });

            hostname_input.addEventListener('focusin', (event)=> {
              this.removeHostConfigErrorMessage();
            });
      
            // CI input
            let ci_value = resourceBuilder.user_configs[resourceBuilder.tab].cifile[0];
            if (!ci_value) {
              ci_value = "";
            }
            ci_textarea.value = ci_value;
            ci_textarea.addEventListener('focusout', (event)=> {
              resourceBuilder.user_configs[resourceBuilder.tab].cifile[0] = ci_textarea.value;
            })
            this.removeHostConfigErrorMessage();
            document.getElementById('resource_config_section').removeAttribute('hidden');
    }

    static showHostConfigErrorMessage(message) {
      document.getElementById("hostname-input").classList.add("invalid_field");
      document.getElementById('add-host-error-msg').innerText = message;
    }

    static removeHostConfigErrorMessage() {
      document.getElementById("hostname-input").classList.remove("invalid_field");
      document.getElementById('add-host-error-msg').innerText = "";
    }

    static makeImageCard(imageBlob) {
      const col = document.createElement('div');
      col.classList.add('col-12', 'col-md-6', 'col-xl-3', 'my-3');
      col.innerHTML = `
      <div class="btn border w-100">` + imageBlob.name +`</div>
      `

      return col;
    }

    static highlightError(element) {
      element.classList.add('invalid_field');
    }

    static unhighlightError(element) {
      element.classList.remove("invalid_field");
    }

    static showPodDetailsError(message) {
      document.getElementById('pod_details_error').innerText = message;
    }

    static hidePodDetailsError() {
      document.getElementById('pod_details_error').innerText = ""
    }

    /**
     * Refreshes the step and creates a card for each host in the hostlist
     * @param {List<HostConfigBlob>} hostlist 
     */
    static refreshHostStep(hostlist, flavors, image_list) {
      const host_cards = document.getElementById('host_cards');
      host_cards.innerHTML = "";
      for (const host of hostlist) {
        host_cards.appendChild(this.makeHostCard(host, flavors, image_list));
      }

      let span_class = ''
      if (hostlist.length == 8) {
        span_class = 'text-primary'
      } else if (hostlist.length > 8) {
        span_class = 'text-danger'
      }
      const plus_card = document.createElement("div");
      plus_card.classList.add("col-xl-3", "col-md-6", "col-12");
      plus_card.id = "add_resource_plus_card";
      plus_card.innerHTML = `
      <div class="card align-items-center border-0">
      <span class="` + span_class + `" id="resource-count">` + hostlist.length + `/ 8</span>
      <button class="btn btn-success add-button p-0" onclick="workflow.onclickAddResource()">+</button>
      </div>
      `

      host_cards.appendChild(plus_card);
    }

    /**
     * Makes a host card element for a given host and returns a reference to the card
     * @param {HostConfigBlob} host 
     */
    static makeHostCard(host, flavors, image_list) {
      const new_card = document.createElement("div");
      new_card.classList.add("col-xl-3", "col-md-6","col-12", "my-3");
      new_card.innerHTML = `
        <div class="card">
          <div class="card-header">
            <h3 class="mt-2">` + flavors.get(host.flavor).name + `</h3>
          </div>
          <ul class="list-group list-group-flush h-100">
            <li class="list-group-item">Hostname: ` + host.hostname + `</li>
            <li class="list-group-item">Image: ` + globalGetImageById(host.image, image_list).name + `</li>
          </ul>
          <div class="card-footer border-top-0">
            <button class="btn btn-danger w-100" id="delete-host-` + host.hostname + `" onclick="workflow.onclickDeleteHost('` + host.hostname +`')">Delete</button>
          </div>
        </div>
      `;

      return new_card;
    }


    /** Shows the input card for adding a new network */
    // Don't forget to redisable
    static display_network_input() {
      // New empty card
      const network_plus_card = document.getElementById('add_network_plus_card');
      const new_card = document.createElement('div');
      new_card.classList.add("col-xl-3", "col-md-6","col-12");
      new_card.innerHTML = 
        `<div class="card pb-0" id="new_network_card">
          <div class="card-body pb-0">
            <div class="justify-content-center my-5 mx-2">
              <input type="text" class="form-control col-12 mb-2 text-center" id="network_input" style="font-size: 1.75rem;" placeholder="Enter Network Name">
              <div class="custom-control custom-switch">
              <input type="checkbox" class="custom-control-input" id="network-public-input">
              <label class="custom-control-label" for="network-public-input">public?</label>
              </div>
              </br>
            <p class="text-danger mt-n2" id="adding_network_error"></p>
            </div>
            <div class="row mb-3">
              <div class="col-6"><button class="btn btn-danger w-100" onclick="GUI.hide_network_input()">Delete</button></div>
              <div class="col-6"><button class="btn btn-success w-100" id="adding_network_confirm" onclick="workflow.onclickConfirmNetwork()">Confirm</button></div>
            </div>
          </div>
        </div>`;
      network_plus_card.parentNode.insertBefore(new_card, network_plus_card);

      document.getElementById('network_input').addEventListener('focusin', e => {
        document.getElementById('adding_network_error').innerText = '';
      })
    }

    static hide_network_input() {
      document.getElementById('new_network_card').parentElement.remove();
      document.getElementById('add_network_plus_card').hidden = false;
    }

    /** Redraws all the cards on the network step.
     * Takes a list of networks to display
    */
    static refreshNetworkStep(network_list) {

      document.getElementById('network_card_deck').innerHTML = `
      <div class="col-xl-3 col-md-6 col-12" id="add_network_plus_card">
      <div class="card align-items-center border-0">
        <button class="btn btn-success add-button p-0" onclick="workflow.onclickAddNetwork()">+</button>
      </div>
      </div>
      `

      const network_plus_card = document.getElementById('add_network_plus_card');
      for (let network of network_list) { // NetworkBlobs
    
          let pub_str = ' (private)';
          if (network.public) {
            pub_str = ' (public)'
          }
          const new_card = document.createElement('div');
          new_card.classList.add("col-xl-3", "col-md-6","col-12", "my-3");
          new_card.innerHTML = `
              <div class="card">
                <div class="text-center">
                  <h3 class="py-5 my-4">` + network.name + pub_str +`</h3>
                </div>
                <div class="row mb-3 mx-3">
                    <button class="btn btn-danger w-100" id="delete_network_` + network.name + `" onclick="workflow.onclickDeleteNetwork('`+ network.name +`')">Delete</button>
                </div>
              </div>`;
          network_plus_card.parentNode.insertBefore(new_card, network_plus_card);
      }
    }

    /** Displays an error message on the add network card */
    static display_add_network_error(error_message) {
      document.getElementById("adding_network_error").innerHTML = error_message;
    }

    static refreshConnectionStep(host_list, network_list) {
      const connection_cards = document.getElementById('connection_cards');
      connection_cards.innerHTML = "";
      
      const element_map = new Map(); // Maps hostname to connectionCard scroll body
      for (const host of host_list) {
        const new_card = this.makeConnectionCard(host.hostname);
        element_map.set(host.hostname, new_card.getElementsByClassName('list-group-flush')[0]);
        connection_cards.appendChild(new_card);
      }

      let index = -1;
      for (const network of network_list) {
        index++;
        for (const [hostname, connectionCard] of element_map) {
          const new_li = document.createElement('li');
          new_li.classList.add('list-group-item');
          new_li.innerHTML = `
          <h5>` + network.name + `</h5>
          <ul class='connection-holder'></ul>
          `
          connectionCard.appendChild(new_li)
        }

        class ConnectionInfo {
          constructor(ifacename, tagged) {
            this.ifacename = ifacename;
            this.tagged = tagged;
          }

          toString() {
            let taggedString = "No Connection";
            if (this.tagged === true) {
              taggedString = "tagged"
            } else if (this.tagged === false) {
              taggedString = "untagged"
            }

            return this.ifacename + ": " + taggedString
          }
        }

        const existing_bondgroup = network.bondgroups[0]
        if (existing_bondgroup) {
          for (const connection of existing_bondgroup.connections) {
            const connectionInfo = new ConnectionInfo(connection.iface.name, connection.tagged);
            const network_ul = element_map.get(connection.iface.hostname).getElementsByClassName('connection-holder')[index];
            const newListing = document.createElement('li')
            newListing.innerText = connectionInfo.toString()
            network_ul.appendChild(newListing);
          }
        }
      
      }

    }


    /** Makes a blank connection card that does not contain interface details */
    static makeConnectionCard(hostname) {
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
            <button class="btn btn-info w-100" id="configure-connection-` + hostname + `" onclick="workflow.onclickConfigureConnection('` + hostname + `')">Configure</button>
          </div>
        </div>`;

      return new_card;
    }

    /** */
    static refreshConnectionModal(connectionBuilder) {
      const selected_interface_name = this.refreshConnectionTabs(connectionBuilder);
      this.refreshConnectionTable(connectionBuilder, selected_interface_name);
    }

    /** Displays a tab in the connections modal for each interface
     * Returns the name of the currently selected interface for use in the connections table
    */
    static refreshConnectionTabs (connectionBuilder) {
      const tablist_ul = document.getElementById('configure-connections-tablist');
      tablist_ul.innerHTML = '';
      let selected_interface_name;
      let index = 0; // Not sure if there is a better way to capture an index while iterating through a map
      for (const [iface_name] of connectionBuilder.ifaceConnections) {
        const li_interface = document.createElement('li');
        li_interface.classList.add('nav-item');
        const btn_interface = document.createElement('a');
        btn_interface.classList.add('nav-link', 'interface-btn');
        btn_interface.setAttribute("onclick", "workflow.onclickSelectIfaceTab(" + index +")");
        btn_interface.setAttribute('href', "#");
        btn_interface.setAttribute('role', 'tab');
        btn_interface.setAttribute('data-toggle', 'tab'); 
        btn_interface.innerText = iface_name;
        li_interface.appendChild(btn_interface);
        tablist_ul.appendChild(li_interface);
        if (index++ == connectionBuilder.tab) {
          selected_interface_name = iface_name;
          btn_interface.classList.add('active');
        }
      }

      return selected_interface_name;
    }

    static refreshConnectionTable(connectionBuilder, selected_iface_name) {
      const connections_table = document.getElementById('connections_widget');
      connections_table.innerHTML =`
      <tr>
        <th>Network</th>
        <th colspan='2'>Vlan</th>
      </tr>
      `;

      const ifaceConfig = connectionBuilder.ifaceConnections.get(selected_iface_name); // Map<network_name, tagged>

      for (const [network, tagged] of ifaceConfig) {
        // connections_table
        const new_row = document.createElement('tr');

        const td_network = document.createElement('td');
        td_network.innerText = network;
        new_row.appendChild(td_network);

        new_row.appendChild(this.makeTagTd(true, network, tagged === true, selected_iface_name));
        new_row.appendChild(this.makeTagTd(false, network, tagged === false, selected_iface_name));
        connections_table.appendChild(new_row);
      }

      // If an untagged is selected, disable all buttons that are not the selected button
      if (document.querySelector(".vlan-radio.untagged.btn-success")) {
        const other_buttons = document.querySelectorAll(".vlan-radio.untagged:not(.btn-success");
        for (const btn of other_buttons) {
          btn.setAttribute("disabled", "true")
        }
      }
    }

    static makeTagTd(tagged, network_name, isSelected, selected_iface_name) {
      let tagged_as_str = "untagged"
      if (tagged) {
        tagged_as_str = "tagged"
      }

      const td = document.createElement('td');
      const btn = document.createElement('button');
      btn.classList.add("btn", "w-100", "h-100", "vlan-radio", "border", tagged_as_str);
      btn.setAttribute("onclick" ,"workflow.onclickSelectVlan('"+ network_name + "'," + tagged + ", '" + selected_iface_name +"')");
      if (isSelected) {
        btn.classList.add('btn-success');
      }
      btn.innerText = tagged_as_str;
      td.appendChild(btn);
      return td;
    }

    static refreshPodSummaryDetails(pod_name, pod_desc, isPublic) {
      const list = document.getElementById('pod_summary_pod_details');
      list.innerHTML = '';
      const name_li = document.createElement('li');
      name_li.innerText = 'Pod name: ' + pod_name;
      list.appendChild(name_li);

      const desc_li = document.createElement('li')
      desc_li.innerText = 'Description: ' + pod_desc;
      list.appendChild(desc_li);

      const public_li = document.createElement('li');
      public_li.innerText = 'Public: ' + isPublic;
      list.appendChild(public_li);
    }

    static refreshPodSummaryHosts(host_list, flavors, image_list) {
      const list = document.getElementById('pod_summary_hosts');
      list.innerHTML = '';

      for (const host of host_list) {
        const new_li = document.createElement('li');
        // new_li.innerText = hosts[i].hostname + ': ' + this.lab_flavor_from_uuid(hosts[i].flavor).name + ' (' + hosts[i].image + ')';
        const details = `${host.hostname}: ${flavors.get(host.flavor).name}, ${globalGetImageById(host.image, image_list).name}`
        new_li.innerText = details;
        list.appendChild(new_li);
      }
    }

    static update_pod_summary() {
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
}

/** Holds in-memory configurations for the add resource step */
class ResourceBuilder {
  constructor(templateBlob) {
    this.template_id = templateBlob.id; // UUID (String)
    this.networks = templateBlob.networks;
    this.original_configs = templateBlob.host_list; // List<HostConfigBlob>
    this.user_configs = []; // List<HostConfigBlob>
    this.tab = 0; // Currently selected tab index where configs will be saved to

    // Create deep copies of the hosts
    for (let host of this.original_configs) {
      const copied_host = new HostConfigBlob(host);
      this.user_configs.push(copied_host);
    }
  }
}

/**
 * Used in the configure connections widget
 */
class ConnectionBuilder {
  constructor(hostBlob, network_list, flavors) {
    this.host = hostBlob;
    this.ifaceConnections = new Map(); // Map<iface_name, Map<network_name, tagged>>
    this.tab = 0; // Currently selected tab index the GUI
    // For each iface in the flavor, initialize the map
    const ifaces = flavors.get(this.host.flavor).interfaces
    for (const ifacename of ifaces) {
      const default_connections = new Map();
      for (const network of network_list) {
        default_connections.set(network.name, null);
      }
      this.ifaceConnections.set(ifacename, default_connections);
    }

    // Go through the given network_list, build ifaceconnections
    for (const network of network_list) {
      // Build existing connections
      for (const bondgroup of network.bondgroups) {
        for (const connection of bondgroup.connections) {
          // Need check every single connection to see if its the host we are looking for
          if (connection.iface.hostname == this.host.hostname) {
            const existing_configs = this.ifaceConnections.get(connection.iface.name);
            existing_configs.set(network.name, connection.tagged);
          }
        }
      }
    }
  }


  updateConnection(iface_name, network_name, tagged) {
    this.ifaceConnections.get(iface_name).set(network_name, tagged);
  }

}

function globalGetImageById(image_id, image_list) {
  // todo - same thing as flavor map
  for (let image of image_list) {
    if (image.image_id == image_id) {
      return image;
    }
  }
}

function todo() {
  alert('todo');
}