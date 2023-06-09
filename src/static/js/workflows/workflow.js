/*
Defines a common interface for creating workflows
Functions as the "view" part of MVC, or the "controller" part. Not really sure tbh
*/


const HTTP = {
    GET: "GET",
    POST: "POST",
    DELETE: "DELETE",
    PUT: "PUT"
}

const endpoint = {
    LABS: "todo",
    FLAVORS: "todo",
    IMAGES: "todo",
    TEMPLATES: "/template/...", // todo
    SAVE_DESIGN_WORKFLOW: "todo",
    SAVE_BOOKING_WORKFLOW: "todo",
    MAKE_TEMPLATE: "todo",
    MAKE_BOOKING: "todo",
}

/** Functions as a namespace for static methods that post to the dashboard, then send an HttpRequest to LibLaas, then receive the response */
class LibLaaSAPI {

    /** POSTs to dashboard, which then auths and logs the requests, makes the request to LibLaaS, and passes the result back to here.
    Treat this as a private function. Only use the lower non async functions when outside of this class */
    static async makeRequest(method, endpoint, workflow_data) {
        // await
        // We are going to resolve and error catch in this block

        let response = new Promise((resolve, reject) => { // -> HttpResponse
            $.ajax(
              {
              crossDomain: false, // might need to change this back to true
              method: "POST",
              contentType: "application/json; charset=utf-8",
              dataType : 'json',
              data: JSON.stringify(
                {
                    "method": method,
                    "endpoint": endpoint,
                    "workflow_data": workflow_data
                }
              ),
              timeout: 15000,
              success: (response) => {
                resolve(response);
              },
              error: (response) => {
                alert("Oops, something went wrong!");
                reject(response);
              }
            }
            )
          })

          return await response;
    }

    static getLabs() { // -> List<LabBlob>
        // return this.makeRequest(HTTP.GET, endpoint.LABS, {});
        let jsonString = '{"name": "UNH_IOL","description": "University of New Hampshire InterOperability Lab","location": "University of New Hampshire InterOperability Lab","status": 0}';
        return [new LabBlob(jsonString)];
    }

    static getLabFlavors(lab_name) { // -> List<FlavorBlob>
        return this.makeRequest(HTTP.GET, endpoint.FLAVORS, {"lab_name": lab_name});
    }

    static getLabImages(lab_name) { // -> List<ImageBlob>
        return this.makeRequest(HTTP.GET, endpoint.IMAGES, {"lab_name": lab_name});
    }

    static getTemplatesForUser(username) { // -> List<TemplateBlob>
        return this.makeRequest(HTTP.GET, endpoint.TEMPLATES, {"username" : username});
    }

    static saveDesignWorkflow(templateBlob) { // -> bool
        return this.makeRequest(HTTP.PUT, endpoint.SAVE_DESIGN_WORKFLOW)
    }

    static saveBookingWorkflow(bookingBlob) { // -> bool
        return this.makeRequest(HTTP.PUT, endpoint.SAVE_BOOKING_WORKFLOW, {"blob": bookingBlob});
    }

    static makeTemplate(templateBlob) { // -> UUID or error?
        return this.makeRequest(HTTP.POST, endpoint.MAKE_TEMPLATE, {"blob": templateBlob});
    }

    static makeBooking(bookingBlob) { // -> UUID or error?
        return this.makeRequest(HTTP.POST, endpoint.MAKE_BOOKING, {"blob": bookingBlob});
    }

}

/** Controller class that handles button inputs to navigate through the workflow and generate HTML dynamically */
class Workflow {
    constructor(sections_list) {
        this.sections = []; // List of strings
        this.step = 0; // Current step of the workflow
    }

    /** Advances the workflow by one step and scrolls to that section 
     * Disables the previous button if the step becomes 0 after executing
     * Enables the next button if the step is less than sections.length after executing
    */
    go_prev() {

        if (this.step > 0) {
            this.step--;
        }

        document.getElementById(this.sections[this.step]).scrollIntoView({behavior: 'smooth'});

        if (this.step == 0) {
            document.getElementById('workflow-prev').setAttribute('disabled', '');
        } else if (this.step == this.sections.length - 2) {
            document.getElementById('workflow-next').removeAttribute('disabled');
        }
    }

    go_next() {
        if (this.step < this.sections.length - 2 ) {
            this.step++;
        }

        document.getElementById(this.sections[this.step]).scrollIntoView({behavior: 'smooth'});

        if (this.step == this.sections.length - 1) {
            document.getElementById('workflow-next').setAttribute('disabled', '');
        } else if (this.step == 1) {
            document.getElementById('workflow-prev').removeAttribute('disabled');
        }
    }

    go_to(step_number) {
        while (step_number > this.step) {
            this.go_next();
        }

        while (step_number < this.step) {
            this.go_prev();
        }
    }

}

