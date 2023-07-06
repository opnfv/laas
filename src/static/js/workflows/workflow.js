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
    LABS: "todo", // Not implemented
    FLAVORS: "flavor/",
    IMAGES: "images/",
    TEMPLATES: "template/list/[username]",
    SAVE_DESIGN_WORKFLOW: "todo", // Post MVP
    SAVE_BOOKING_WORKFLOW: "todo", // Post MVP
    MAKE_TEMPLATE: "/template/create", // todo - figure out how to pass blob
    DELETE_TEMPLATE: "todo", // Post MVP
    MAKE_BOOKING: "/booking/create",
}

/** Functions as a namespace for static methods that post to the dashboard, then send an HttpRequest to LibLaas, then receive the response */
class LibLaaSAPI {

    /** POSTs to dashboard, which then auths and logs the requests, makes the request to LibLaaS, and passes the result back to here.
    Treat this as a private function. Only use the async functions when outside of this class */
    static makeRequest(method, endpoint, workflow_data) {
        console.log("Making request: %s, %s, %s", method, endpoint, workflow_data.toString())
        const token = document.getElementsByName('csrfmiddlewaretoken')[0].value
        return new Promise((resolve, reject) => {// -> HttpResponse
            $.ajax(
              {
              crossDomain: true, // might need to change this back to true
              method: "POST",
              contentType: "application/json; charset=utf-8",
              dataType : 'json',
              headers: {
                'X-CSRFToken': token
            },
              data: JSON.stringify(
                {
                    "method": method,
                    "endpoint": endpoint,
                    "workflow_data": workflow_data
                }
              ),
              timeout: 10000,
              success: (response) => {
                resolve(response);
              },
              error: (response) => {
                reject(response);
              }
            }
            )
          })
    }

    static async getLabs() { // -> List<LabBlob>
        // return this.makeRequest(HTTP.GET, endpoint.LABS, {});
        let jsonObject = JSON.parse('{"name": "UNH_IOL","description": "University of New Hampshire InterOperability Lab","location": "NH","status": 0}');
        return [new LabBlob(jsonObject)];
    }

    static async getLabFlavors(lab_name) { // -> List<FlavorBlob>
        // return this.makeRequest(HTTP.GET, endpoint.FLAVORS, {"lab_name": lab_name});
        const data = await this.handleResponse(this.makeRequest(HTTP.GET, endpoint.FLAVORS, {"lab_name": lab_name}));
        let flavors = [];
        if (data) {
            for (const d of data) {
                flavors.push(new FlavorBlob(d))
            }
        } else {
            apiError("flavors")
        }
        return flavors;
        // let jsonObject = JSON.parse('{"flavor_id": "aaa-bbb-ccc", "name": "HPE Gen 9", "description": "placeholder", "interfaces": ["ens1", "ens2", "ens3"]}')
        // return [new FlavorBlob(jsonObject)];
    }

    static async getImagesForFlavor(flavor_id) {
        let full_endpoint = endpoint.FLAVORS + flavor_id + '/[username]/' + endpoint.IMAGES;
        const data =  await this.handleResponse(this.makeRequest(HTTP.GET, full_endpoint, {}));
        let images = []

        if (data) {
            for (const d of data) {
                images.push(new ImageBlob(d));
            }
        } else {
            apiError("images")
        }

        return images;
    }

    /** Doesn't need to be passed a username because django will pull this from the request */
    static async getTemplatesForUser() { // -> List<TemplateBlob>
        const data = await this.handleResponse(this.makeRequest(HTTP.GET, endpoint.TEMPLATES, {}))
        let templates = []

        if (data)
        for (const d of data) {
            templates.push(new TemplateBlob(d))
        } else {
            apiError("templates")
        }
        return templates;
        // let jsonObject = JSON.parse('{"id":12345,"owner":"jchoquette","lab_name":"UNH_IOL","pod_name":"Single Host","pod_desc":"Default Template","pub":true,"host_list":[{"cifile":[],"hostname":"node","flavor":"1ca6169c-a857-43c6-80b7-09b608c0daec","image":"3fc3833e-7b8b-4748-ab44-eacec8d14f8b"}],"networks":[{"bondgroups":[{"connections":[{"iface":{"hostname":"node","name":"eno49"},"tagged":true}]}],"name":"public"}]}');
        // return [new TemplateBlob(jsonObject)];
    }

    static async saveDesignWorkflow(templateBlob) { // -> bool
        return await this.handleResponse(this.makeRequest(HTTP.PUT, endpoint.SAVE_DESIGN_WORKFLOW))
    }

    static async saveBookingWorkflow(bookingBlob) { // -> bool
        return await this.handleResponse(this.makeRequest(HTTP.PUT, endpoint.SAVE_BOOKING_WORKFLOW, {"blob": bookingBlob}));
    }

    static async makeTemplate(templateBlob) { // -> UUID or null
        return await this.handleResponse(this.makeRequest(HTTP.POST, endpoint.MAKE_TEMPLATE, {"blob": templateBlob}));
    }

    static async deleteTemplate(templateBlob) { // -> UUID or null
        return await this.handleResponse(this.makeRequest(HTTP.DELETE, endpoint.DELETE_TEMPLATE, {"blob": templateBlob}));
    }

    static async makeBooking(bookingBlob, bookingMetaData) {
        let liblaasResponse = await this.handleResponse(this.makeRequest(HTTP.POST, endpoint.MAKE_BOOKING, {"blob": bookingBlob}));
        if (liblaasResponse) {
            return await this.handleResponse(this.createDashboardBooking("abcdefg", bookingMetaData, bookingBlob.allowed_users));
        }
        console.log("No LL response... Returning null")
        return null
    }

    /** Wraps a call in a try / catch, processes the result, and returns the response or null if it failed */
    static async handleResponse(promise) {
        try {
            let x = await promise;
            return x;
        } catch(e) {
            console.log(e)
            return null;
        }
    }

    /** Uses PUT instead of POST to tell the dashboard that we want to create a dashboard booking instead of a liblaas request */
    static createDashboardBooking(aggregateId, bookingMetaData, collaborators) {
        const token = document.getElementsByName('csrfmiddlewaretoken')[0].value
        return new Promise((resolve, reject) => { // -> HttpResponse
            $.ajax(
              {
              crossDomain: false,
              method: "PUT",
              contentType: "application/json; charset=utf-8",
              dataType : 'json',
              headers: {
                'X-CSRFToken': token
            },
              data: JSON.stringify(
                {
                    "bookingMetaData": {
                        "aggregateId": aggregateId,
                        "purpose": bookingMetaData.purpose,
                        "project": bookingMetaData.project,
                        "length": bookingMetaData.length,
                        "collaborators": collaborators
                    }
                }
              ),
              timeout: 10000,
              success: (response) => {
                resolve(response);
              },
              error: (response) => {
                reject(response);
              }
            }
            )
          })
    }
}


/** Controller class that handles button inputs to navigate through the workflow and generate HTML dynamically 
 * Treat this as an abstract class and extend it in the appropriate workflow module.
*/
class Workflow {
    constructor(sections_list) {
        this.sections = []; // List of strings
        this.step = 0; // Current step of the workflow
        this.sections = sections_list;
    }

    /** Advances the workflow by one step and scrolls to that section 
     * Disables the previous button if the step becomes 0 after executing
     * Enables the next button if the step is less than sections.length after executing
    */
    goPrev() {

        if (workflow.step <= 0) {
            return;
        }

        this.step--;

        document.getElementById(this.sections[this.step]).scrollIntoView({behavior: 'smooth'});

        if (this.step == 0) {
            document.getElementById('prev').setAttribute('disabled', '');
        } else if (this.step == this.sections.length - 2) {
            document.getElementById('next').removeAttribute('disabled');
        }
    }

    goNext() {
        if (this.step >= this.sections.length - 1 ) {
            return;
        }

        this.step++;
        document.getElementById(this.sections[this.step]).scrollIntoView({behavior: 'smooth'});

        if (this.step == this.sections.length - 1) {
            document.getElementById('next').setAttribute('disabled', '');
        } else if (this.step == 1) {
            document.getElementById('prev').removeAttribute('disabled');
        }
    }

    goTo(step_number) {
        while (step_number > this.step) {
            this.goNext();
        }

        while (step_number < this.step) {
            this.goPrev();
        }
    }

}

function apiError(info) {
    alert("Unable to fetch " + info +". Please try again later or contact support.")
  }
