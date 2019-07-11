const body = document.getElementsByTagName('body')[0];
// Reponse is an object used by update_page(response: object)
const response = {
    redirect: false,
    meta: {
        workflow_count: 0,
        active: 0,
        steps: [{
            title: 'title',
            valid: '299',
            message: 'testMessage',
            enabled: false
        }]
    },
    content: 'exampleContent'
};
// Arguments used for MultipleSelectFilterWidget
const graph_neighbors = {
    host_1: ['lab_1'],
    host_2: ['lab_1'],
    lab_1: ['host_1', 'host_2']
};
const filter_items = {
    host_1: {
        name: 'host 1',
        class: 'host',
        description: 'first host',
        id: 'host_1',
        form: {
            type: 'text',
            name: 'textInput'
        },
        selectable: true,
        multiple: false,
        selected: false
    },
    host_2: {
        name: 'host 2',
        class: 'host',
        description: 'second host',
        id: 'host_2',
        form: {
            type: 'text',
            name: 'textInput'
        },
        selectable: true,
        multiple: false,
        selected: false
    },
    lab_1: {
        name: 'lab 1',
        class: 'lab',
        description: 'first lab',
        id: 'lab_1',
        form: {
            type: 'text',
            name: 'textInput'
        },
        selectable: true,
        multiple: false,
        selected: false
    },
    lab_2: {
        name: 'lab 2',
        class: 'lab',
        description: 'second lab',
        id: 'lab_2',
        form: {
            type: 'text',
            name: 'textInput'
        },
        selectable: true,
        multiple: false,
        selected: false
    }
};

// Override the functions for testing
const oldPost = $.post;
const oldAjax = $.ajax;
$.post = function(url, data, cb, type) {
    cb(response);
    return $.Deferred().resolve();
}
$.ajax = function(object) {
    return $.Deferred().resolve();
}

suite('Dashboard', function() {
    suite('Global Functions', function() {
        // Create all elements needed for the global functions
        let formContainer = document.createElement('div');
        formContainer.id = 'formContainer';
        let cancelButton = document.createElement('button');
        cancelButton.id = 'cancel_btn';
        let backButton = document.createElement('button');
        backButton.id = 'gob';
        let forwardButton = document.createElement('button');
        forwardButton.id = 'gof';
        let viewMessage = document.createElement('p');
        viewMessage.id = 'view_message';
        let paginationControl = document.createElement('li');
        paginationControl.classList.add('page-control');
        let topPagination = document.createElement('ul');
        topPagination.id = 'topPagination';
        topPagination.appendChild(paginationControl);

        // Update the elements on the page
        body.appendChild(formContainer);
        body.appendChild(backButton);
        body.appendChild(forwardButton);
        body.appendChild(viewMessage);
        body.appendChild(cancelButton);
        body.appendChild(topPagination);
        update_page(response);

        // Testing all of these because they are all required to run
        // when running update_page(), and removing parts of it will break
        // document.body is different outside and inside the test() callback.
        test('update_page', function() {
            assert.equal(formContainer.innerHTML, 'exampleContent');
        });
        test('draw_breadcrumbs', function() {
            assert.isAbove(topPagination.childElementCount, 1);
        })
        test('create_step', function() {
            assert.equal(topPagination.firstChild.innerText, 'title');
        });
        test('update_exit_button', function() {
            assert.equal(cancelButton.innerText, 'Return to Parent');
        });
        test('update_side_buttons', function() {
            assert(forwardButton.disabled);
            assert(backButton.disabled);
        });
        test('update_description', function() {
            let viewTitle = document.createElement('span');
            viewTitle.id = 'view_title';
            let viewDesc = document.createElement('span');
            viewDesc.id = 'view_desc';

            body.appendChild(viewTitle);
            body.appendChild(viewDesc);
            update_description('title', 'description');

            assert.equal(viewTitle.innerText, 'title');
            assert.equal(viewDesc.innerText, 'description');
        });
        test('update_message', function() {
            update_message('message', 999);
            assert.equal(viewMessage.innerText, 'message');
            assert(viewMessage.classList.contains('step_message'));
            assert(viewMessage.classList.contains('message_999'));
        });
        test('submitStepForm', function() {
            // Empty the container so that the function changes it
            formContainer.innerHTML = '';
            submitStepForm();
            assert.equal(formContainer.innerHTML, 'exampleContent');
        });
        test('run_form_callbacks', function() {
            form_submission_callbacks.push(function() {
                let testObject = document.createElement('span');
                testObject.id = 'testObject';
                body.appendChild(testObject);
            });
            run_form_callbacks();
            assert.isNotNull(document.getElementById('testObject'));
        });
    });

    suite('MultipleSelectFilterWidget', function() {
        let widget = new MultipleSelectFilterWidget(graph_neighbors, filter_items, {});
        let initialData = {
            host: {
                host_1: {
                    selected: true
                }
            },
            lab: {
                lab_1: {
                    selected: true
                }
            }
        };
        // Create elements that represent these choices
        let lab1 = document.createElement('div');
        lab1.id = 'lab_1';
        let lab2 = document.createElement('div');
        lab2.id = 'lab_2';
        let host1 = document.createElement('div');
        host1.id = 'host_1';
        let host2 = document.createElement('div');
        host2.id = 'host_2';

        // Append elements to the page
        body.append(lab1);
        body.append(lab2);
        body.append(host1);
        body.append(host2);

        test('make_selection', function() {
            widget.make_selection(initialData);
            assert.isTrue(lab1.classList.contains('selected_node'));
            assert.isTrue(host1.classList.contains('selected_node'));
            // Deselect for the next test
            widget.processClick('lab_1');
            widget.processClick('host_1');
        });

        test('multiple selected items', function() {
            widget.processClick('lab_1');
            widget.processClick('host_1');
            assert.isTrue(lab1.classList.contains('selected_node'));
            assert.isTrue(host1.classList.contains('selected_node'));

            // Make sure clicking multiple hosts/labs doesn't work
            widget.processClick('host_2');
            widget.processClick('lab_2');
            assert.isFalse(host2.classList.contains('selected_node'));
            assert.isFalse(lab2.classList.contains('selected_node'));

            // Unselect host1 then try host2 again
            widget.processClick('host_1');
            widget.processClick('host_2');
            assert.isFalse(host1.classList.contains('selected_node'));
            assert.isTrue(host2.classList.contains('selected_node'));
        });
    });

    suite('NetworkStep', function() {
        let hosts = [
            {
                id: 'host1',
                interfaces: [
                    {
                        name: 'interface1',
                        description: 'description1'
                    }
                ],
                value: {
                    description: 'example host1',
                    name: 'host1'
                }
            }
        ];
        let graphContainer = document.createElement('div');
        let overviewContainer = document.createElement('div');
        let toolbarContainer = document.createElement('div');
        let networkList = document.createElement('div');
        networkList.id = 'network_list';

        body.appendChild(graphContainer);
        body.appendChild(overviewContainer);
        body.appendChild(toolbarContainer);
        body.appendChild(networkList);

        let networkStep = new NetworkStep(true, '', hosts, [], [], graphContainer, overviewContainer, toolbarContainer);
        test('public network creation', function() {
            // Network list's first child should be the 'public' network div,
            // Public div has two children: the colored circle and the label
            // It does not have a delete button.
            assert.equal(networkList.childNodes[0].childNodes.length, 2);
            assert.equal(networkList.childNodes[0].childNodes[1].innerText, 'public');
        });

        networkStep.newNetworkWindow();
        let netInput = document.querySelector('input[name="net_name"]');
        netInput.value = 'public'
        networkStep.parseNetworkWindow();
        let windowErrors = document.getElementById('current_window_errors');

        test('duplicate network name', function() {
            assert.equal(windowErrors.innerText, 'All network names must be unique');
        });

        netInput.value = 'testNetwork';
        networkStep.parseNetworkWindow();

        test('new network creation', function() {
            assert.equal(networkList.childNodes[1].childNodes[1].innerText, 'testNetwork');
        });
    });

    suite('SearchableSelectMultipleWidget', function() {
        let formatVars = {
            placeholder: 'Example placeholder',
            results_scrollable: true,
            selectable_limit: -1,
            show_from_noentry: false,
            show_x_results: 5
        };
        let fieldDataset = {
            '1': {
                expanded_name: 'Test User',
                id: 1,
                small_name: 'small Test',
                string: 'email@test.com'
            }
        };
        let widget = new SearchableSelectMultipleWidget(formatVars, fieldDataset, []);
        test('trie population', function() {
            assert.property(widget.expanded_name_trie, 'T');
            assert.property(widget.small_name_trie, 's');
            assert.property(widget.string_trie, 'e');
        });

        test('dropdown population with search', function() {
            let input = document.createElement('input');
            let dropdown = document.createElement('div');
            let scrollRestrictor = document.createElement('div');
            scrollRestrictor.id = 'scroll_restrictor';
            dropdown.id = 'drop_results';
            input.type = 'text';
            input.value = 'Test ';
            body.appendChild(scrollRestrictor);
            body.appendChild(dropdown);
            widget.search('Test ');
            assert.equal(dropdown.childNodes[0].title, 'Test User (small Test, email@test.com)');
            // Search some random text that shouldn't resolve to any user
            widget.search('Empty');
            assert.equal(dropdown.childElementCount, 0);
        });
    });
});