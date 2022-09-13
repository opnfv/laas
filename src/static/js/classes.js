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

  // Search widget for django forms (taken from dashboard.js and slightly modified)
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

        this.search_field_init();

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
        takes in a mapping of ids to objects in items
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
        this.added_items.delete(item_id); // delete from set
        work.remove_collaborator(document.getElementById(`coldel-${item_id}`).innerText); // delete from workflow object

        this.update_selected_list();
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
            textColumn.id = `coldel-${item_id}`; // Needed for book a pod

            const itemRow = document.createElement("div");
            itemRow.classList.add("list-group-item", "d-flex", "p-0", "align-items-center", "my-2", "border");
            itemRow.append(textColumn, deleteColumn);

            list_html.append(itemRow);
        }
        added_list.innerHTML = list_html.innerHTML;
    }
}
