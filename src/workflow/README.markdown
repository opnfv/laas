# Workflow
This app creates "workflows", which are long and complex interactions from the user.
Workflows are composed of multiple steps. At each step the user inputs some information.
The content of one step may impacts following steps.
The user may choose to go back and modify information from previous steps.
The workflow will adapt accordingly for a seemless experience.

## Design a Pod
### src/templates/base/workflow/design_a_pod.html
Django template that contains all contains the main structure of the page. The page entire page is one single 'scroll-container' which contains may sub 'scroll-areas'. Only one 'scroll-area' will be visible at a time and they can be navigated through via the prev/next buttons.
Many elements are not present in this file, as they are dynamically rendered by design_a_pod.js as the user interacts with the page.
The document contains two script tags. The first one, located in the head, is used to grab all of the necessary functions from design_a_pod.js. The second script tag, located below the body, is used to initialize the objects that are needed to start the workflow. Do not rename or modify the 'work' object as it is essential for the 'onclick' attribute of various buttons throughout the workflow.
### src/static/js/design_a_pod.js
A self contained script used to talk to LibLaas, define classes, generate html elements, and navigate the user through the workflow.
#### LibLaas bridges:
Functions used to communicate with LibLaas to obtain information about available labs, flavors, etc. Also sends and receieves PodTemplate data to/from the dashboard.
#### PodTemplate Classes:
Classes needed to construct a PodTemplate object. These include all necessary aspects of a pod such as hosts, interfaces, and connections.
#### The PodTemplate Class:
A class that holds information about the pod that is being designed. This includes lab name, pod name / desc, a list of host objects, and a list of network objects.
#### The Design_Workflow Class:
The session class that manages the entire workflow. All user interactions operate through this class. The class takes a PodTemplate object as a parameter and will modify it as the user builds the pod. This class is also responsible for dynamically adding / removing html elements as needed. Many of these elements are found using document.getElementbyid(), so take care when modifying the ids of elements. There are also calls to the 'work' object. This is an instance of the Design_Workflow class that is created by the script in design_a_pod.html. This is to give the 'onclick' attribute of various buttons proper functionality.


