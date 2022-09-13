class SearchableSelectMultipleWidget {
    constructor(format_vars, field_dataset, field_initial) {
        this.format_vars = format_vars;
        this.items = field_dataset;
        this.initial = field_initial;

        this.expanded_name_trie = {"isComplete": false};
        this.small_name_trie = {"isComplete": false};
        this.string_trie = {"isComplete": false};

        this.added_items = new Set();

        for( let e of ["show_from_noentry", "show_x_results", "results_scrollable", "selectable_limit", "placeholder"] )
        {
            this[e] = format_vars[e];
        }

        // this.search_field_init();

        if( this.show_from_noentry )
        {
            this.search("");
        }
    }

    disable() {
        const textfield = document.getElementById("user_field");
        const drop = document.getElementById("drop_results");

        textfield.disabled = "True";
        drop.style.display = "none";

        const btns = document.getElementsByClassName("btn-remove");
        for( const btn of btns )
        {
            btn.classList.add("disabled");
            btn.onclick = "";
        }
    }

    search_field_init() {
        this.build_all_tries(this.items);

        for( const elem of this.initial )
        {
            this.select_item(elem);
        }
        if(this.initial.length == 1)
        {
            this.search(this.items[this.initial[0]]["small_name"]);
            document.getElementById("user_field").value = this.items[this.initial[0]]["small_name"];
        }
    }

    build_all_tries(dict)
    {
        for( const key in dict )
        {
            this.add_item(dict[key]);
        }
    }

    add_item(item)
    {
        const id = item['id'];
        this.add_to_tree(item['expanded_name'], id, this.expanded_name_trie);
        this.add_to_tree(item['small_name'], id, this.small_name_trie);
        this.add_to_tree(item['string'], id, this.string_trie);
    }

    add_to_tree(str, id, trie)
    {
        let inner_trie = trie;
        while( str )
        {
            if( !inner_trie[str.charAt(0)] )
            {
                var new_trie = {};
                inner_trie[str.charAt(0)] = new_trie;
            }
            else
            {
                var new_trie = inner_trie[str.charAt(0)];
            }

            if( str.length == 1 )
            {
                new_trie.isComplete = true;
                if( !new_trie.ids )
                {
                    new_trie.ids = [];
                }
                new_trie.ids.push(id);
            }
            inner_trie = new_trie;
            str = str.substring(1);
        }
    }

    search(input)
    {
        if( input.length == 0 && !this.show_from_noentry){
            this.dropdown([]);
            return;
        }
        else if( input.length == 0 && this.show_from_noentry)
        {
            this.dropdown(this.items); //show all items
        }
        else
        {
            const trees = []
            const tr1 = this.getSubtree(input, this.expanded_name_trie);
            trees.push(tr1);
            const tr2 = this.getSubtree(input, this.small_name_trie);
            trees.push(tr2);
            const tr3 = this.getSubtree(input, this.string_trie);
            trees.push(tr3);
            const results = this.collate(trees);
            this.dropdown(results);
        }
    }

    getSubtree(input, given_trie)
    {
        /*
        recursive function to return the trie accessed at input
        */

        if( input.length == 0 ){
            return given_trie;
        }

        else{
            const substr = input.substring(0, input.length - 1);
            const last_char = input.charAt(input.length-1);
            const subtrie = this.getSubtree(substr, given_trie);

            if( !subtrie ) //substr not in the trie
            {
                return {};
            }

            const indexed_trie = subtrie[last_char];
            return indexed_trie;
        }
    }

    serialize(trie)
    {
        /*
        takes in a trie and returns a list of its item id's
        */
        let itemIDs = [];
        if ( !trie )
        {
            return itemIDs; //empty, base case
        }
        for( const key in trie )
        {
            if(key.length > 1)
            {
                continue;
            }
            itemIDs = itemIDs.concat(this.serialize(trie[key]));
        }
        if ( trie.isComplete )
        {
            itemIDs.push(...trie.ids);
        }

        return itemIDs;
    }

    collate(trees)
    {
        /*
        takes a list of tries
        returns a list of ids of objects that are available
        */
        const results = [];
        for( const tree of trees )
        {
            const available_IDs = this.serialize(tree);

            for( const itemID of available_IDs ) {
                results[itemID] = this.items[itemID];
            }
        }
        return results;
    }

    generate_element_text(obj)
    {
        const content_strings = [obj.expanded_name, obj.small_name, obj.string].filter(x => Boolean(x));
        const result = content_strings.shift();
        if( result == null || content_strings.length < 1) {
            return result;
        } else {
            return result + " (" + content_strings.join(", ") + ")";
        }
    }

    dropdown(ids)
    {
        /*
        takes in a mapping of ids to objects in  items
        and displays them in the dropdown
        */
        const drop = document.getElementById("drop_results");
        while(drop.firstChild)
        {
            drop.removeChild(drop.firstChild);
        }

        for( const id in ids )
        {
            const obj = this.items[id];
            const result_text = this.generate_element_text(obj);
            const result_entry = document.createElement("a");
            result_entry.href = "#";
            result_entry.innerText = result_text;
            result_entry.title = result_text;
            result_entry.classList.add("list-group-item", "list-group-item-action", "overflow-ellipsis", "flex-shrink-0");
            result_entry.onclick = function() { searchable_select_multiple_widget.select_item(obj.id); };
            const tooltip = document.createElement("span");
            const tooltiptext = document.createTextNode(result_text);
            tooltip.appendChild(tooltiptext);
            tooltip.classList.add("d-none");
            result_entry.appendChild(tooltip);
            drop.appendChild(result_entry);
        }

        const scroll_restrictor = document.getElementById("scroll_restrictor");

        if( !drop.firstChild )
        {
            scroll_restrictor.style.visibility = 'hidden';
        }
        else
        {
            scroll_restrictor.style.visibility = 'inherit';
        }
    }

    select_item(item_id)
    {
        if( (this.selectable_limit > -1 && this.added_items.size < this.selectable_limit) || this.selectable_limit < 0 )
        {
            this.added_items.add(item_id);
        }
        this.update_selected_list();
        // clear search bar contents
        document.getElementById("user_field").value = "";
        document.getElementById("user_field").focus();
        this.search("");
    }

    remove_item(item_id)
    {
        this.added_items.delete(item_id);

        this.update_selected_list()
        document.getElementById("user_field").focus();
    }

    update_selected_list()
    {
        document.getElementById("added_number").innerText = this.added_items.size;
        const selector = document.getElementById('selector');
        selector.value = JSON.stringify([...this.added_items]);
        const added_list = document.getElementById('added_list');

        while(selector.firstChild)
        {
            selector.removeChild(selector.firstChild);
        }
        while(added_list.firstChild)
        {
            added_list.removeChild(added_list.firstChild);
        }

        const list_html = document.createElement("div");
        list_html.classList.add("list-group");

        for( const item_id of this.added_items )
        {
            const times = document.createElement("li");
            times.classList.add("fas", "fa-times");

            const deleteButton = document.createElement("a");
            deleteButton.href = "#";
            deleteButton.innerHTML = "<i class='fas fa-times'></i>"
            // Setting .onclick/.addEventListener does not work,
            // which is why I took the setAttribute approach
            // If anyone knows why, please let me know :]
            deleteButton.setAttribute("onclick", `searchable_select_multiple_widget.remove_item(${item_id});`);
            deleteButton.classList.add("btn");
            const deleteColumn = document.createElement("div");
            deleteColumn.classList.add("col-auto");
            deleteColumn.append(deleteButton);

            const item = this.items[item_id];
            const element_entry_text = this.generate_element_text(item);
            const textColumn = document.createElement("div");
            textColumn.classList.add("col", "overflow-ellipsis");
            textColumn.innerText = element_entry_text;
            textColumn.title = element_entry_text;

            const itemRow = document.createElement("div");
            itemRow.classList.add("list-group-item", "d-flex", "p-0", "align-items-center");
            itemRow.append(textColumn, deleteColumn);

            list_html.append(itemRow);
        }
        added_list.innerHTML = list_html.innerHTML;
    }
}

// TODO: Possibly verify valid cloud init config synax?
// TODO: Implement Add Collabs
// TODO: Input validation on search input field?
// TODO: Input validation on cloud init input fields? 

// Session Class
class Booking_Workflow {
    constructor(username) {
        this.username = username; // String
        this.selected_template = null; // PodTemplate object
        this.collab_search_widget = new SearchableSelectMultipleWidget([false, 5, true, -1, "Search for other users"], this.get_user_list(), null)
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

    get_user_list() {
        // TODO get from db
        var items = [
            [
                1, // id
                "jchoquette", // small name
                "Justin Choquette", // expanded name
                "jchoquette@iol.unh.edu" // searchable string
            ],
            [
                2, // id
                "rhodgdon", // small name
                "Raven Hodgdon", // expanded name
                "rhodgdon@iol.unh.edu" // searchable string
            ],
            [
                3, // id
                "sbergeron", // small name
                "Sawyer Bergeron", // expanded name
                "sbergeron@iol.unh.edu" // searchable string
            ]
        ]

        return items;
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
        const default_list_ul = document.getElementById('default_templates_list');
        const my_pod_list_ul = document.getElementById('my_pods_list');
        const default_templates_list = this.get_default_templates();
        const my_pods_list = this.get_user_templates();

        for (let i in default_templates_list) {
            const list_li = document.createElement('li');
            list_li.classList.add('list-group-item', 'list-group-item-action');
            list_li.innerText = default_templates_list[i].pod_name + ' (' + default_templates_list[i].pod_desc + ')';
            list_li.id = "default_template_li_" + i;
            list_li.setAttribute('onclick', 'work.select_template(id)')
            default_list_ul.appendChild(list_li);
        }

        for (let i in my_pods_list) {
            const list_li = document.createElement('li');
            list_li.classList.add('list-group-item', 'list-group-item-action');
            list_li.innerText = my_pods_list[i].pod_name + ' (' + my_pods_list[i].pod_desc + ')';
            list_li.id = "my_pod_li_" + i;
            list_li.setAttribute('onclick', 'work.select_template(id)')
            my_pod_list_ul.appendChild(list_li);
        }
    }

    initialize_elements() {
        // Scroll sections
        document.getElementById('workflow-next').removeAttribute('disabled');
        document.getElementById('workflow-prev').setAttribute('disabled' , '');
        document.getElementById('add_collabs').removeAttribute('hidden');
        document.getElementById('select_template').setAttribute('hidden', '');
        document.getElementById('cloud_init').setAttribute('hidden', '');
        document.getElementById('booking_details').setAttribute('hidden', '');
        document.getElementById('booking_summary').setAttribute('hidden', '');
        document.getElementById('collabs_search').value = "";
        document.getElementById('collabs_search').addEventListener('focusout', (event) => {
            document.getElementById('search_results').classList.add('d-none');
        })
        document.getElementById('collabs_search').addEventListener('focusin', work.update_search_results)
        const input_project = document.getElementById('input_project');
        const input_purpose = document.getElementById('input_purpose');
        const input_length = document.getElementById('input_length');
        input_project.value = '';
        input_purpose.value = '';
        input_length.value = 1;

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
        // TODO: Add collaborator to list and front end
    }

    remove_collaborator() {
        // TODO: Remove collab from front end and list
    }

    update_search_results() {
        // TODO: oninput that will display search results as the user types
        const search_input = document.getElementById('collabs_search');
        
        if (search_input.value == 0) return;

        const results_div = document.getElementById('search_results');
        const results_list = document.querySelector('#search_results ul');
        results_list.innerHTML = '<li>' + search_input.value + '</li>'

        results_div.classList.remove('d-none');
        
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
        const custom = new PodTemplate();
        custom.username = 'jchoquette';
        custom.lab_name = 'UNH_IOL';
        custom.pod_name = 'My Pod';
        custom.pod_desc = 'Custom pod made with the design a pod workflow';
        custom.host_list = [new Host('laas-node', 'Gigabyte Arm', 'Ubuntu'), new Host('laas-node-2', 'HPE x86 25G', 'Fedora'), new Host('laas-node-3', 'HPE x86 25G', 'Fedora'), new Host('laas-node-4', 'HPE x86 25G', 'Fedora'), new Host('laas-node-5', 'HPE x86 25G', 'Fedora'), new Host('laas-node-6', 'HPE x86 25G', 'Fedora'), new Host('laas-node-7', 'HPE x86 25G', 'Fedora'), new Host('laas-node-8', 'HPE x86 25G', 'Fedora')];
        custom.network_list = ['public', 'private'];

        list.push(custom);
        list.push(custom);
        list.push(custom);

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
        // Finds the template object by index number - potentially change this (todo)
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

            const new_card_input = document.createElement('input');
            new_card_input.classList.add('p-5');
            new_card_input.setAttribute('placeholder', 'Cloud init config...');
            
            new_card_input.addEventListener('focusout', cloud_e => {
                this.cloud_init_configs[i] = new_card_input.value;
            });

            new_card.appendChild(new_card_header);
            new_card.appendChild(new_card_input);
            new_col.appendChild(new_card)
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
                    length_li.innerText = 'Length: ' + this.booking_length;
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
                work.go_prev();
            }
            return;
        }

        // if (this.cloud_init_configs.length != this.selected_template.host_list.length) {
        //     alert('Please add cloud init configs for all hosts.');
        //     for (let i = 0; i < 2; i++) {
        //         work.go_prev();
        //     }
        //     return;
        // }

        // Cloud init configs should be allowed to be blank
        // for (let i in this.cloud_init_configs) {
        //     if (!this.cloud_init_configs[i]) {
        //         alert('Please finish adding cloud init configs.');
        //         for (let i = 0; i < 2; i++) {
        //             work.go_prev();
        //         }
        //         return;
        //     }
        // }

        if (!this.booking_project) {
            alert('Please enter a project name.');
            work.go_prev();
            document.getElementById('input_project').classList.add('invalid_field');
            return;
        }

        if (!this.booking_purpose) {
            alert('Please enter a booking purpose.');
            work.go_prev();
            document.getElementById('input_purpose').classList.add('invalid_field');
            return;
        }
        
        if (!this.booking_length) {
            alert('Please enter a booking length.');
            work.go_prev();
            return;
        }


        if(confirm('Are you sure you want to create this booking?')) {
            // TODO Send work.export() to liblaas
            console.log(work.toString());
            alert('Success!');
        } else {
            return;
        }
    }

}