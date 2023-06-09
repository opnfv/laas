/*
design-a-pod.js

Functions as the "controller" part of MVC
*/

class DesignWorkflow extends Workflow {
    constructor() {
        super(["select_lab", "add_hosts", "add_networks", "configure_connections", "pod_details", "pod_summary"])
    }
}