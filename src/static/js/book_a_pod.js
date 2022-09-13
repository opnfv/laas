// TODO: Make Cloud init config yaml friendly
// TODO: Remove modal from add collabs
// TODO: Don't show 'My Pods' on LFEDGE
// TODO: Check all sections in mobile aspect ratio
// TODO: Check browser compatibility (chrome and firefox)

// Session Class
class Booking_Workflow {
    constructor(username) {
        this.username = username; // String
        this.selected_template = null; // PodTemplate object
        this.step = 0;
        this.sections = ["add_collabs", "select_template",
        "cloud_init", "booking_details", "booking_summary"]
        this.collaborators = []; // List of strings
        this.cloud_init_configs = []; // List of strings
        this.booking_project =  ''; // String
        this.booking_purpose = ''; // String
        this.booking_length = 1; // int
    }

    toString() {
        let str = '';
        str += 'Username: ' + this.username;
        str += '\nBooking Project: ' + this.booking_project;
        str += '\nBooking Purpose: ' + this.booking_purpose;
        str += '\nBooking length: ' + this.booking_length;
        str += '\nCollaborators: ' + this.collaborators;
        if (this.selected_template) {
            str += '\n\nSelected Template\n-----------------\n' + this.selected_template.toString() + '\n-----------------';
        } else {
            str += '\nSelected Template: null';
        }
        str += '\n\nCloud Init Configs:'

        if (this.selected_template && this.cloud_init_configs.length == this.selected_template.host_list.length) {
            for (let i in this.cloud_init_configs) {
                str += '\n' + this.selected_template.host_list[i].hostname + ': "' + this.cloud_init_configs[i] + '"'
            }
        }

        return str;
    }

    export() {
        // Exports only the neccessary information to liblaas as a json string
        var result = {};
        for (var x in this) {
            if (x !== "step" && x !== "collab_search_widget" && x !== "sections") {
                result[x] = this[x];
            }
        }
        return result;
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

    display_templates_list() {
        // TODO: Remove modal, just show tabs in scroll section
        const default_list_ul = document.getElementById('default_templates_list');
        const my_pod_list_ul = document.getElementById('my_pods_list');
        const default_templates_list = this.get_default_templates();
        const my_pods_list = this.get_user_templates();

        for (let i in default_templates_list) {
            const list_li = document.createElement('li');
            list_li.classList.add('list-group-item', 'list-group-item-action');
            list_li.innerText = default_templates_list[i].pod_name + ' (' + default_templates_list[i].pod_desc + ')';
            list_li.id = "default_template_li_" + i;
            list_li.setAttribute('onclick', 'work.select_template(id)');
            default_list_ul.appendChild(list_li);
        }

        // TODO: Dont show 'My Pods' in LF EDGE
        for (let i in my_pods_list) {
            const list_li = document.createElement('li');
            list_li.classList.add('list-group-item', 'list-group-item-action');
            list_li.innerText = my_pods_list[i].pod_name + ' (' + my_pods_list[i].pod_desc + ')';
            list_li.id = "my_pod_li_" + i;
            list_li.setAttribute('onclick', 'work.select_template(id)');
            my_pod_list_ul.appendChild(list_li);
        }
    }

    initialize_elements() {
        // Scroll sections
        // TODO: consider removing setAttribute('hidden') to reduce wasted processing
        document.getElementById('workflow-next').removeAttribute('disabled');
        document.getElementById('workflow-prev').setAttribute('disabled' , '');
        document.getElementById('add_collabs').removeAttribute('hidden');
        document.getElementById('select_template').setAttribute('hidden', '');
        document.getElementById('cloud_init').setAttribute('hidden', '');
        document.getElementById('booking_details').setAttribute('hidden', '');
        document.getElementById('booking_summary').setAttribute('hidden', '');
        const input_project = document.getElementById('input_project');
        const input_purpose = document.getElementById('input_purpose');
        const input_length = document.getElementById('input_length');
        input_project.value = '';
        input_purpose.value = '';
        input_length.value = 1;

        // SearchableSelectMultipleWidget
        /* Customizing the form must be done here instead of in the form's original template in order to
        avoid breaking instances of this form on other parts of the dashboard. Possibly modify original template after old workflow is removed.*/
        document.getElementsByTagName('label')[0].setAttribute('hidden', '');
        document.getElementById('addable_limit').setAttribute('hidden', '');
        document.getElementById('added_number').setAttribute('hidden', '');
        const user_field = document.getElementById('user_field');
        user_field.classList.add('border-top-0');

        const added_list = document.getElementById('added_list');
        added_list.remove();
        document.getElementById('search_select_outer').appendChild(added_list);
        document.getElementById('drop_results').setAttribute('onclick', 'work.add_collaborator()');


        // Input event listeners
        input_project.addEventListener('focusout', project_e1 => {
            if (input_project.value != '' && !(input_project.value.match(/^[a-z0-9~@#$^*()_+=[\]{}|,.?': -]+$/i))) {
                input_project.classList.add('invalid_field');
                this.booking_project = '';
                document.getElementById('booking_details_error').innerText = 'Project field contains invalid characters.'
            } else {
                this.booking_project = input_project.value;
            }
            this.booking_summary_update_text('booking_details');
        });

        input_project.addEventListener('focusin', project_e2 => {
            document.getElementById('booking_details_error').innerText = '';
            input_project.classList.remove('invalid_field');
        });

        input_purpose.addEventListener('focusout', purpose_e1 => {
            if (input_purpose.value != '' && !(input_purpose.value.match(/^[a-z0-9~@#$^*()_+=[\]{}|,.?': -]+$/i))) {
                input_purpose.classList.add('invalid_field');
                this.booking_purpose = '';
                document.getElementById('booking_details_error').innerText = 'Purpose field contains invalid characters.'
            } else {
                this.booking_purpose = input_purpose.value;
            }
            this.booking_summary_update_text('booking_details');
        });

        input_purpose.addEventListener('focusin', purpose_e2 => {
            document.getElementById('booking_details_error').innerText = '';
            input_purpose.classList.remove('invalid_field');
        });

        input_length.addEventListener('focusout', length_e => {
            this.booking_length = input_length.value;
            this.booking_summary_update_text('booking_details');
        });

        this.display_templates_list();
    }

    add_collaborator() {
        // Adds collab to collaborators list and updates summary
        const elem = document.getElementById('added_list');
        if (!this.collaborators.includes(elem.lastChild.textContent)) {
            this.collaborators.push(elem.lastChild.textContent);
        }

        this.booking_summary_update_text('add_collabs');

    }

    remove_collaborator(name) {
        // Removes collab from collaborators list and updates summary

        const temp = [];
        let removeIndex = this.collaborators.indexOf(name);
        for (let i in this.collaborators) {
            if (i != removeIndex) {
                temp.push(this.collaborators[i]);
            }
        }

        this.collaborators = temp;
        this.booking_summary_update_text('add_collabs');
    }

    get_default_templates() {
        // TODO poke liblaas for list of default hosts
        // returns podtemplate object
        // for i in templates if username == 'root': list.push(i)?
        const list = []
        const default1 = new PodTemplate();
        default1.username = 'root';
        default1.lab_name = 'UNH_IOL';
        default1.pod_name = 'Gigabyte Arm';
        default1.pod_desc = 'Default template that contains a single Gigabyte Arm host attached to port enP2p1s0f1';
        default1.host_list = [new Host('laas-node', 'Gigabyte Arm', 'Ubuntu')];
        default1.network_list = ['public'];

        const default2 = new PodTemplate();
        default2.username = 'root';
        default2.lab_name = 'UNH_IOL';
        default2.pod_name = 'HPE x86 25G';
        default2.pod_desc = 'Default template that contains a single HPEx86 host attached to port eno49';
        default2.host_list = [new Host('laas-node', 'HPE x86 25G', 'Ubuntu')];
        default2.network_list = ['public'];

        list.push(default1, default2);
        list.push(default1, default2);
        list.push(default1, default2);

        return list;
    }

    get_user_templates() {
        // TODO poke liblaas to get user created templates
        // returns podtemplate object
        // for i in templates if username == this.username: list.push(i)?

        const list = []

        // For demo purposes only -  delete when integrated with liblaas
        const genOb = JSON.parse(`{"username":"jchoquette","lab_name":"UNH_IOL","pod_name":"Justin's Pod",
        "pod_desc":"For demo purposes","host_list":[{"hostname":"custom-node","flavor":"Gigabyte Arm","image":"Ubuntu 20.04 LTS (aarch 64)",
        "interfaces":[{"name":"ENS0","connections":[{"network":"public","tagged":true},
        {"network":"private","tagged":false}]},{"name":"ENS1","connections":
        [{"network":"public","tagged":false},{"network":"private","tagged":true}]},
        {"name":"ENS2","connections":[{"network":"public","tagged":true},
        {"network":"private","tagged":false}]},{"name":"ENS3","connections":
        [{"network":"public","tagged":true},{"network":"private","tagged":true}]}]},
        {"hostname":"custom-node-2","flavor":"Gigabyte Arm","image":"Ubuntu 20.04 LTS (aarch 64)","interfaces":
        [{"name":"ENS0","connections":[{"network":"public","tagged":true},{"network":"private","tagged":true}]},
        {"name":"ENS1","connections":[{"network":"public","tagged":true},{"network":"private","tagged":true}]},
        {"name":"ENS2","connections":[{"network":"public","tagged":true},{"network":"private","tagged":true}]},
        {"name":"ENS3","connections":[{"network":"public","tagged":true},{"network":"private","tagged":true}]}]}],
        "network_list":["public","private"]}`);

        const custom = Object.assign(new PodTemplate, genOb);

        list.push(custom);

        // const demoOb = JSON.parse(``);
        // const demoPod = Object.assign(new PodTemplate, demoOb);
        // list.push(demoPod);

        return list;
    }

    select_template_button() {
        document.getElementById("select_template_modal_submit").setAttribute('disabled', '');
        const previously_selected = document.querySelector('#select_template_modal li.selected_node');
        if (previously_selected) {
            previously_selected.classList.remove('selected_node');
        }

        $("#select_template_modal").modal('toggle');

    }

    select_template(id) {
        // Remove selected border from previously selected
        const previously_selected = document.querySelector('#select_template_modal li.selected_node');
        if (previously_selected) {
            previously_selected.classList.remove('selected_node');
        }

        document.getElementById(id).classList.add('selected_node');
        document.getElementById("select_template_modal_submit").removeAttribute('disabled');
    }

    select_template_submit() {
        // Finds the template object by index number
        let tab;
        let index;
        let id = document.querySelector('#select_template_modal li.selected_node').id;

        if (document.getElementById("default_templates").classList.contains('active')) {
            tab = this.get_default_templates();
            index = id.substring(20)
        } else {
            tab = this.get_user_templates();
            index = id.substring(10);
        }

        this.selected_template = tab[index];


        // Update card text
        document.querySelector('#template_card h3').innerText = this.selected_template.pod_name;
        const host_ul = document.querySelector('#template_card ul');
        host_ul.innerHTML = '<li class="list-group-item">Description: ' + this.selected_template.pod_desc + '</li>';

        if (this.selected_template.host_list.length == 1) {
            const host = this.selected_template.host_list[0];
            const hostname_li = document.createElement('li');
            hostname_li.classList.add('list-group-item');
            hostname_li.innerText = 'Hostname: ' + host.hostname;

            const image_li = document.createElement('li');
            image_li.classList.add('list-group-item');
            image_li.innerText = 'Image: ' + host.image;

            host_ul.appendChild(hostname_li);
            host_ul.appendChild(image_li);

            // Initialize cloud init list indexes
            this.cloud_init_configs[0] = '';
        } else {
            for (let i in this.selected_template.host_list) {
                const new_li = document.createElement('li');
                const host = this.selected_template.host_list[i];
                new_li.classList.add('list-group-item');
                new_li.innerText = host.flavor + ': ' + host.hostname + ' (' + host.image + ')';
                host_ul.appendChild(new_li);

            // Initialize cloud init list indexes
            this.cloud_init_configs[i] = '';
            }
        }

        // UI Updates
        document.getElementById('template_plus_card').setAttribute('hidden', '');
        document.getElementById('template_card').removeAttribute('hidden');

        this.cloud_init_display_cards();

        $("#select_template_modal").modal('toggle');
        this.booking_summary_update_text('select_template');
    }

    select_template_delete() {
        this.selected_template = null;
        document.getElementById('template_card').setAttribute('hidden', '');
        document.getElementById('template_plus_card').removeAttribute('hidden');
        document.getElementById('cloud_init_deck').innerHTML = '';
        this.booking_summary_update_text('select_template');
        this.cloud_init_configs = [];
    }

    cloud_init_display_cards() {
        for (let i in this.selected_template.host_list) {
            const host = this.selected_template.host_list[i];

            const new_col = document.createElement('div');
            new_col.classList.add('col-lg-3', 'col-sm-12', 'my-3');

            const new_card = document.createElement('div');
            new_card.classList.add('card');

            const new_card_header = document.createElement('div');
            new_card_header.classList.add('card-header', 'text-center');
            new_card_header.innerHTML = `
                <h3 class="mt-2">` + host.hostname + `</h3>
            `;

            const new_card_input = document.createElement('textarea');
            new_card_input.setAttribute('rows', '10');
            new_card_input.setAttribute('placeholder', 'Cloud init config...');

            new_card_input.addEventListener('focusout', cloud_e => {
                this.cloud_init_configs[i] = new_card_input.value;
            });

            new_card.appendChild(new_card_header);
            new_card.appendChild(new_card_input);
            new_col.appendChild(new_card);
            document.getElementById("cloud_init_deck").appendChild(new_col);
        }
    }

    booking_details_update_days() {
        document.getElementById("booking_details_day_counter").innerText = "Days: " + 
        document.getElementById('input_length').value;
    }

    booking_summary_update_text(section) {
        // Takes a section (string) and updates the appropriate html elements innertext

        switch(section) {
            case 'add_collabs':
                const collabs_ul = document.getElementById('booking_summary_collaborators');
                collabs_ul.innerHTML = '';
                for (let i in this.collaborators) {
                    const collabs_li = document.createElement('li');
                    collabs_li.innerText = this.collaborators[i];
                    collabs_ul.appendChild(collabs_li);
                }
                break;
            case 'select_template':
                const hosts_ul = document.getElementById('booking_summary_hosts');
                hosts_ul.innerHTML = '';
                if (!this.selected_template) break;
                for (let i in this.selected_template.host_list) {
                    const hosts_li = document.createElement('li');
                    hosts_li.innerText = this.selected_template.host_list[i].hostname;
                    hosts_ul.appendChild(hosts_li);
                }
                break;
            case 'booking_details':
                const details_ul = document.getElementById('booking_summary_booking_details');
                details_ul.innerHTML = '';

                if (this.booking_project) {
                    const project_li = document.createElement('li');
                    project_li.innerText = 'Project: ' + this.booking_project;
                    details_ul.appendChild(project_li);
                }

                if (this.booking_purpose) {
                    const purpose_li = document.createElement('li');
                    purpose_li.innerText = 'Purpose: ' + this.booking_purpose;
                    details_ul.appendChild(purpose_li);
                }

                if (this.booking_length) {
                    const length_li = document.createElement('li');
                    length_li.innerText = 'Length: ' + this.booking_length + ' days';
                    details_ul.appendChild(length_li);
                }
                break;
            default:
                console.log("'" + section + "' is not a valid section");
        }
    }

    cancel_booking() {
        if(confirm('Are you sure you want to cancel this booking?')) {
            window.location.href = "../../";
        } else {
            return;
        }
    }

    submit_booking() {
        // Prequisite steps
        if (this.selected_template == null) {
            alert('Please select a host or template.');
            for (let i = 0; i < 3; i++) {
                this.go_prev();
            }
            return;
        }

        if (!this.booking_project) {
            alert('Please enter a valid project name.');
            this.go_prev();
            document.getElementById('input_project').classList.add('invalid_field');
            return;
        }

        if (!this.booking_purpose) {
            alert('Please enter a valid booking purpose.');
            this.go_prev();
            document.getElementById('input_purpose').classList.add('invalid_field');
            return;
        }

        if (!this.booking_length) {
            alert('Please enter a booking length.');
            this.go_prev();
            return;
        }


        if(confirm('Are you sure you want to create this booking?')) {
            // TODO Send work.export() to liblaas
            console.log(this.toString());
            alert('Success!');
        } else {
            return;
        }
    }
}