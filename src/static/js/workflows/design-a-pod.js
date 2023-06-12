/*
design-a-pod.js

Functions as the "controller" part of MVC
*/

/** Concrete controller class that handles button inputs from the user.
 * Holds the in-progress TemplateBlob.
 * Click methods are prefaced with 'onclick'.
 * Step initialization methods are prefaced with 'step'.
 */
class DesignWorkflow extends Workflow {
    constructor(savedTemplateBlob) {
        super(["select_lab", "add_hosts", "add_networks", "configure_connections", "pod_details", "pod_summary"])

        // if(savedTemplateBlob) {
        //     this.resume_workflow();
        // }

        // This is here to make reordering steps easier in the future.
        // Simply modify this object and the steps list.
        this.steps = {
            SELECT_LAB: 0,
            ADD_HOSTS: 1,
            ADD_NETWORKS: 2,
            CONFIGURE_CONNECTIONS: 3,
            POD_DETAILS: 4,
            POD_SUMMARY: 5
        }
        this.templateBlob = new TemplateBlob();
        this.labFlavors;
        this.labImages;

        this.startWorkflow();

    }

    resumeWorkflow() {
        // todo
    }

    /** Initializes the select_lab step */
    startWorkflow() {
        const labs = LibLaaSAPI.getLabs();
        GUI.display_labs(labs);
    }

    /** Takes an HTML element */
    onclickSelectLab(lab_card) {
        console.log(lab_card)
        this.step = this.steps.SELECT_LAB;

        if (this.templateBlob.lab_name == null) { // Lab has not been selected yet
            this.templateBlob.lab_name = lab_card.id;
            lab_card.classList.add("selected_node");
            this.setLabDetails(this.templateBlob.lab_name);
        } else { // Lab has been selected
            if(confirm('Unselecting a lab will reset all selected resources, are you sure?')) {
                location.reload();
            }
        }
    }

    /** Calls the API to fetch flavors and images for a lab */
    setLabDetails(lab_name) {
        this.labFlavors = LibLaaSAPI.getLabFlavors(lab_name);
        this.labImages = LibLaaSAPI.getLabImages(lab_name);
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
}