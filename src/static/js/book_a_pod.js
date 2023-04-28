// Session Class
class Booking_Workflow {
    constructor() {
        this.owner_id = null; // String
        this.username = null;
        this.booking_id = null;
        this.selected_template = null; // PodTemplate object
        this.step = 0;
        this.sections = ["select_template",
        "cloud_init", "booking_details", "add_collabs", "booking_summary"]
        this.collaborators = []; // List of tuples
        this.global_ci = ""; // String of Yaml
        this.booking_project =  ''; // String
        this.booking_purpose = ''; // String
        this.booking_length = 1; // int
        this.default_templates =  []; // List of templates
        this.user_templates = []; // List of templates
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

    async get_templates() {
        let available_templates = await talk_to_liblaas("GET", 'template/list/' + this.owner_id, {});
        this.default_templates = [];
        this.user_templates = [];
        console.log(available_templates);
        for (let i = 0; i < available_templates.length; i++) {
            if (available_templates[i].owner == Number(this.owner_id)) {
                this.user_templates.push(available_templates[i]);
            } else {
                this.default_templates.push(available_templates[i]);
            }
        }
    }

    display_templates_list() {
        const default_list_ul = document.getElementById('default_templates_list');
        const my_pod_list_ul = document.getElementById('my_pods_list');
        const default_templates_list = this.default_templates;
        const my_pods_list = this.user_templates;

        for (let i in default_templates_list) {
            const btn = document.createElement('btn');
            btn.classList.add('btn', 'w-100', 'text-left');
            const list_li = document.createElement('li');
            list_li.classList.add('list-group-item', 'list-group-item-action');
            list_li.innerText = default_templates_list[i].name + ' (' + default_templates_list[i].description + ')';
            list_li.id = "default_template_li_" + i;
            list_li.setAttribute('onclick', 'work.select_template(id)');
            btn.appendChild(list_li);
            default_list_ul.appendChild(btn);
        }

        for (let i in my_pods_list) {
            const list_li = document.createElement('li');
            list_li.classList.add('list-group-item', 'list-group-item-action');
            list_li.innerText = my_pods_list[i].name + ' (' + my_pods_list[i].description + ')';
            list_li.id = "my_pod_li_" + i;
            list_li.setAttribute('onclick', 'work.select_template(id)');
            my_pod_list_ul.appendChild(list_li);
        }
    }

    async initialize_elements() {
        // Scroll sections
        document.getElementById('workflow-next').removeAttribute('disabled');
        document.getElementById('workflow-prev').setAttribute('disabled' , '');
        document.getElementById('select_template').scrollIntoView({behavior: 'auto'});
        const input_project = document.getElementById('input_project');
        const input_purpose = document.getElementById('input_purpose');
        const input_length = document.getElementById('input_length');
        const input_ci = document.getElementById('ci-textarea');
        input_ci.value = "";
        input_project.value = '';
        input_purpose.value = '';
        input_length.value = 1;

        // SearchableSelectMultipleWidget
        /* Customizing the form must be done here instead of in the form's original template in order to
        avoid breaking instances of this form on other parts of the dashboard.*/
        document.getElementsByTagName('label')[0].setAttribute('hidden', '');
        document.getElementById('addable_limit').setAttribute('hidden', '');
        document.getElementById('added_number').setAttribute('hidden', '');
        const user_field = document.getElementById('user_field');
        user_field.classList.add('border-top-0');
        document.querySelector('.form-group').classList.add('mb-0');

        const added_list = document.getElementById('added_list');
        added_list.remove();
        document.getElementById('search_select_outer').appendChild(added_list);


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
            this.step = 2;
            document.getElementById('workflow-prev').removeAttribute('disabled');
            document.getElementById('workflow-next').removeAttribute('disabled');
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
            this.step = 2;
            document.getElementById('workflow-prev').removeAttribute('disabled');
            document.getElementById('workflow-next').removeAttribute('disabled');
        });

        input_length.addEventListener('focusout', length_e => {
            this.booking_length = input_length.value;
            this.booking_summary_update_text('booking_details');
            this.step = 2;
            document.getElementById('workflow-prev').removeAttribute('disabled');
            document.getElementById('workflow-next').removeAttribute('disabled');
        });

        input_ci.addEventListener('focusin', ci_e => {
            this.global_ci = input_ci.value;
            this.step = 1;
            document.getElementById('workflow-prev').removeAttribute('disabled');
            document.getElementById('workflow-next').removeAttribute('disabled');
        });

        input_ci.addEventListener('focusout', ci_e2 => {
            this.global_ci = input_ci.value;
        });
        await this.get_templates();
        this.display_templates_list();
    }

    add_collaborator(username, string) {
        // Adds collab to collaborators list and updates summary
        // called from workflow_classes.js
        this.step = 3;
        document.getElementById('workflow-prev').removeAttribute('disabled');
        document.getElementById('workflow-next').removeAttribute('disabled');

        for (let i in this.collaborators) {
            if (work.collaborators[i].username == username) {
                return;
            }
          }

        const collab = {
            username: username,
            full_string: string
        }

        this.collaborators.push(collab);
        this.booking_summary_update_text('add_collabs');
    }

    remove_collaborator(username) {
        // Removes collab from collaborators list and updates summary
        this.step = 3;
        document.getElementById('workflow-prev').removeAttribute('disabled');
        document.getElementById('workflow-next').removeAttribute('disabled');

        let removeIndex = -1;

        for (let i in this.collaborators) {
            if (work.collaborators[i].username == username) {
              removeIndex = i;
              break;
            }
          }

        if (removeIndex == -1) {
            console.log(username + " not found.")
            return;
        }

        const temp = [];
        for (let i in this.collaborators) {
            if (i != removeIndex) {
                temp.push(this.collaborators[i]);
            }
        }

        this.collaborators = temp;
        this.booking_summary_update_text('add_collabs');
    }


    select_template(id) {
        this.step = 0;
        document.getElementById('workflow-next').removeAttribute('disabled');

        // Finds the template object by index number
        let index;

        if (id.substring(0, 7) == 'default') {
            index = id.substring(20)
            this.selected_template = this.default_templates[index];
        } else {
            index = id.substring(10);
            this.selected_template = this.user_templates[index];
        }

        // Update card text
        document.querySelector('#template_card h3').innerText = this.selected_template.name;
        const host_ul = document.querySelector('#template_card ul');
        host_ul.innerHTML = '<li class="list-group-item">Description: ' + this.selected_template.description + '</li>';

        if (this.selected_template.hosts.length == 1) {
            const host = this.selected_template.hosts[0];
            const hostname_li = document.createElement('li');
            hostname_li.classList.add('list-group-item');
            hostname_li.innerText = 'Hostname: ' + host[0];

            const flavor_li = document.createElement('li');
            flavor_li.classList.add('list-group-item');
            flavor_li.innerText = 'Flavor: ' + host[2];

            const image_li = document.createElement('li');
            image_li.classList.add('list-group-item');
            image_li.innerText = 'Image: ' + host[1];

            host_ul.appendChild(hostname_li);
            host_ul.appendChild(image_li);

        } else {
            for (let i in this.selected_template.hosts) {
                const new_li = document.createElement('li');
                const host = this.selected_template.hosts[i];
                new_li.classList.add('list-group-item');
                new_li.innerText = host[2] + ': ' + host[0] + ' (' + host[1] + ')';
                host_ul.appendChild(new_li);
            }
        }

        // UI Updates
        document.getElementById('template_card').removeAttribute('hidden');
        document.getElementById('template_list').setAttribute('hidden', '');

        this.booking_summary_update_text('select_template');
    }

    select_template_change() {
        this.step = 0;
        document.getElementById('workflow-next').removeAttribute('disabled');

        this.selected_template = null;
        document.getElementById('template_card').setAttribute('hidden', '');
        document.getElementById('template_list').removeAttribute('hidden');
        this.booking_summary_update_text('select_template');
    }

    booking_details_update_days() {
        document.getElementById("booking_details_day_counter").innerText = "Days: " + 
        document.getElementById('input_length').value;
    }

    booking_summary_update_text(section) {
        // Takes a section (string) and updates the appropriate element's innertext

        switch(section) {
            case 'add_collabs':
                const collabs_ul = document.getElementById('booking_summary_collaborators');
                collabs_ul.innerHTML = '';
                for (let i in this.collaborators) {
                    const collabs_li = document.createElement('li');
                    collabs_li.innerText = this.collaborators[i].full_string;
                    collabs_ul.appendChild(collabs_li);
                }
                break;
            case 'select_template':
                const hosts_ul = document.getElementById('booking_summary_hosts');
                hosts_ul.innerHTML = '';
                if (!this.selected_template) break;
                for (let i in this.selected_template.hosts) {
                    const hosts_li = document.createElement('li');
                    hosts_li.innerText = this.selected_template.hosts[i];
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
        this.step = 4;
        document.getElementById('workflow-prev').removeAttribute('disabled');
        document.getElementById('workflow-next').setAttribute('disabled', '');

        if(confirm('Are you sure you want to cancel this booking?')) {
            window.location.href = "../../";
        } else {
            return;
        }
    }

    async submit_booking() {
        this.step = 4;
        document.getElementById('workflow-prev').removeAttribute('disabled');
        document.getElementById('workflow-next').setAttribute('disabled', '');

        // Prequisite steps
        if (this.selected_template == null) {
            alert('Please select a host or template.');
            for (let i = 0; i < 4; i++) {
                this.go_prev();
            }
            return;
        }

        if (!this.booking_project) {
            alert('Please enter a valid project name.');
            this.go_prev();
            this.go_prev();
            document.getElementById('input_project').classList.add('invalid_field');
            return;
        }

        if (!this.booking_purpose) {
            alert('Please enter a valid booking purpose.');
            this.go_prev();
            this.go_prev();
            document.getElementById('input_purpose').classList.add('invalid_field');
            return;
        }

        if (!this.booking_length) {
            alert('Please enter a booking length.');
            this.go_prev();
            this.go_prev();
            return;
        }

        // todo - fix this
        // if (!this.is_valid_yaml(this.global_ci)) {
        //     alert('Please enter valid YAML for the global Cloud Init override.')
        //     for (let i = 0; i < 2; i++) {
        //         this.go_prev();
        //     }
        //     return;
        // }

        if(confirm('Are you sure you want to create this booking?')) {
            this.booking_id = await this.create_booking_blob();
            if (this.booking_id != null) {
                this.commit_booking();
                alert("The booking has been successfully created.")
                window.location.href = "../../";
            }
        } else {
            return;
        }
    }

    async get_ssh_keys() {

        let userlist = [];
        userlist.push({
            username: this.username,
            full_string: null
        });

        for (let user in this.collaborators) {
            userlist.push(this.collaborators[user]);
        }
        return new Promise((resolve, reject) => {
            $.ajax(
              {
              crossDomain: true,
              method: "POST",
              contentType: "application/json; charset=utf-8",
              dataType : 'json',
              data: JSON.stringify(
                {
                  "destination": "dashboard",
                  "collaborators": userlist
                }
              ),
              timeout: 30000,
              success: (response) => {
                resolve(response);
              },
              error: (response) => {
                alert("Oops, something went wrong!");
                reject(response);
              }
            }
            )
          });
    }

    async commit_booking() {
        return talk_to_liblaas("POST", "booking/" + this.booking_id + "/create", {})
    }

    async create_booking_blob() {

        let bookingblob = {
            _id: null,
            owner: Number(this.owner_id),
            template_id: this.selected_template._id,
            credentials: [/* Array of access data objects */],
            cifile: this.global_ci // YAML String
        };

        let key_list = await this.get_ssh_keys(); // contains keys for the booking creator followed by the collaborators
        // Build user credentials
        if (key_list[0].key == null) {
            alert("You have no SSH keys uploaded. Please add an SSH key before continuing.");
            return;
        }

        // Build credentials
        for (let i = 0; i < key_list.length; i++) {
            if (key_list[i].key == null) {
                alert(this.collaborators[i - 1].username + " has no SSH keys uploaded. All collaborators must have uploaded SSH keys to create the booking.");
                return;
            }

            let key = {
                key: key_list[i].key,
                key_type: null
            }

            if (key.key.includes("ssh-rsa")) {
                key.key_type = "Rsa";
            } else if (key.key.includes("ssh-ed25519")) {
                key.key_type = "Ed25519";
            } else {
                key.key_type = "INVALID";
            }

            if (key.key_type == "INVALID") {
                if (i == 0) {
                    alert("You have an invalid SSH key uploaded. Supported key types are 'ed25519' and 'rsa'.");
                } else {
                    alert(this.collaborators[i - 1].username + " has an invalid SSH key uploaded. Supported key types are 'ed25519' and 'rsa'.");
                }
                return;
            }
    
            let access_data = {
                 // tuesday: we need a WorkflowAccessData struct in liblaas, and then an impl which is to_AccessData
                user_id: key_list[i].user_id,
                username: key_list[i].user,
                keys: [key],
            }

            bookingblob.credentials.push(access_data);
        }

        // todo send json to liblaas instead of logging
        return talk_to_liblaas("POST", "booking/", bookingblob);
    }

    is_valid_yaml(string) {
        try {
            jsyaml.load(string);
            console.log("returning true");
            return true;
        } catch (error) {
            console.log("returning false");
            return false;
        }
    }
}