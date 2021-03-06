const body = document.getElementsByTagName('body')[0];

suite('Dashboard', function() {
    suite('Global Functions', function() {
        let formContainer;
        let cancelButton;
        let backButton;
        let forwardButton;
        let viewMessage;
        let paginationControl;
        let topPagination;
        let viewTitle;
        let viewDesc;
        let response;

        setup(function() {
            body.innerHTML = '';
            response = {
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
            // Override the functions for testing
            $.post = function(url, data, cb, type) {
                cb(response);
                return $.Deferred().resolve();
            }
            // Create all elements needed for the global functions
            formContainer = document.createElement('div');
            formContainer.id = 'formContainer';
            cancelButton = document.createElement('button');
            cancelButton.id = 'cancel_btn';
            backButton = document.createElement('button');
            backButton.id = 'gob';
            forwardButton = document.createElement('button');
            forwardButton.id = 'gof';
            viewMessage = document.createElement('p');
            viewMessage.id = 'view_message';
            paginationControl = document.createElement('li');
            paginationControl.classList.add('page-control');
            topPagination = document.createElement('ul');
            topPagination.id = 'topPagination';
            topPagination.appendChild(paginationControl);
            viewTitle = document.createElement('span');
            viewTitle.id = 'view_title';
            viewDesc = document.createElement('span');
            viewDesc.id = 'view_desc';

            // Update the elements on the page
            body.appendChild(formContainer);
            body.appendChild(backButton);
            body.appendChild(forwardButton);
            body.appendChild(viewMessage);
            body.appendChild(cancelButton);
            body.appendChild(topPagination);
            body.appendChild(viewTitle);
            body.appendChild(viewDesc);
            update_page(response);
        });

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
        let widget;
        let initialData;
        let lab1;
        let lab2;
        let host1;
        let host2;
        let graph_neighbors;
        let filter_items;

        setup(function() {
            body.innerHTML = '';
            // Create elements that represent these choices
            lab1 = document.createElement('div');
            lab1.id = 'lab_1';
            lab2 = document.createElement('div');
            lab2.id = 'lab_2';
            host1 = document.createElement('div');
            host1.id = 'host_1';
            host2 = document.createElement('div');
            host2.id = 'host_2';

            // Append elements to the page
            body.append(lab1);
            body.append(lab2);
            body.append(host1);
            body.append(host2);
            initialData = {
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
            graph_neighbors = {
                host_1: ['lab_1'],
                host_2: ['lab_1'],
                lab_1: ['host_1', 'host_2']
            };
            filter_items = {
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
            widget = new MultipleSelectFilterWidget(graph_neighbors, filter_items, {});
        });

        test('make_selection', function() {
            widget.make_selection(initialData);
            assert.isTrue(lab1.classList.contains('selected_node'));
            assert.isTrue(host1.classList.contains('selected_node'));
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
        let hosts;
        let graphContainer;
        let overviewContainer;
        let toolbarContainer;
        let networkList;
        let networkStep;

        setup(function() {
            body.innerHTML = '';
            hosts = [
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
            graphContainer = document.createElement('div');
            overviewContainer = document.createElement('div');
            toolbarContainer = document.createElement('div');
            networkList = document.createElement('div');
            networkList.id = 'network_list';

            body.appendChild(graphContainer);
            body.appendChild(overviewContainer);
            body.appendChild(toolbarContainer);
            body.appendChild(networkList);

            networkStep = new NetworkStep(true, '', hosts, [], [], graphContainer, overviewContainer, toolbarContainer);
        });

        test('public network creation', function() {
            // Network list's first child should be the 'public' network div,
            // Public div has two children: the colored circle and the label
            // It does not have a delete button.
            assert.equal(networkList.childNodes[0].childNodes.length, 2);
            assert.equal(networkList.childNodes[0].childNodes[1].innerText, 'public');
        });

        test('duplicate network name', function() {
            networkStep.newNetworkWindow();
            let netInput = document.querySelector('input[name="net_name"]');
            netInput.value = 'public'
            document.querySelector('.mxWindowPane div button:first-of-type').click();
            let windowErrors = document.getElementById('current_window_errors');
            assert.equal(windowErrors.innerText, 'All network names must be unique');
        });


        test('new network creation', function() {
            networkStep.newNetworkWindow();
            let netInput = document.querySelector('input[name="net_name"]');
            netInput.value = 'testNetwork';
            document.querySelector('.mxWindowPane div button:first-of-type').click();
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
        let widget;
        let input;
        let dropdown;
        let scrollRestrictor;
        let userField;
        let addedNumber;
        let selector;
        let addedList;

        setup(function() {
            body.innerHTML = '';
            input = document.createElement('input');
            dropdown = document.createElement('div');
            scrollRestrictor = document.createElement('div');
            addedList = document.createElement('div');
            addedList.id = 'added_list';
            selector = document.createElement('div');
            selector.id = 'selector';
            addedNumber = document.createElement('div');
            addedNumber.id = 'added_number';
            userField = document.createElement('div');
            userField.id = 'user_field';
            scrollRestrictor.id = 'scroll_restrictor';
            dropdown.id = 'drop_results';
            input.type = 'text';
            input.value = 'Test ';

            body.appendChild(scrollRestrictor);
            body.appendChild(dropdown);
            body.appendChild(input);
            body.appendChild(userField);
            body.appendChild(addedNumber);
            body.appendChild(selector);
            body.appendChild(addedList);

            widget = new SearchableSelectMultipleWidget(formatVars, fieldDataset, []);
        });

        test('disable', function() {
            widget.disable();
            assert.equal(userField.disabled, 'True');
            assert.equal(dropdown.style.display, 'none');
        });

        test('search_field_init', function() {
            assert.isEmpty(addedNumber.innerText);
            assert.isUndefined(selector.value);
            assert.isEmpty(addedList.childNodes);
            widget.initial = [1];
            widget.search_field_init();
            assert.equal(addedNumber.innerText, '1');
            assert.equal(selector.value, '[1]');
            assert.equal(addedList.childNodes.length, 1);
        });

        test('build_all_tries', function() {
            let dict = {
                '1': {
                    expanded_name: 'exnamea',
                    small_name: 'smnamea',
                    string: 'stra',
                    id: 1
                },
                '2': {
                    expanded_name: 'exnameb',
                    small_name: 'smnameb',
                    string: 'strb',
                    id: 2
                }
            };
            widget.build_all_tries(dict);
            // since each subtree has keys of 1 character each, look for a nested
            // property using '.' after each letter for nesting
            assert.nestedProperty(widget.expanded_name_trie, 'e.x.n.a.m.e.a');
            assert.nestedProperty(widget.small_name_trie, 's.m.n.a.m.e.a');
            assert.nestedProperty(widget.string_trie, 's.t.r.a');
            assert.nestedProperty(widget.expanded_name_trie, 'e.x.n.a.m.e.b');
            assert.nestedProperty(widget.small_name_trie, 's.m.n.a.m.e.b');
            assert.nestedProperty(widget.string_trie, 's.t.r.b');
        });

        test('add_item', function() {
            let item = {
                id: 1,
                expanded_name: 'item',
                small_name: 'item',
                string: 'item'
            };
            widget.add_item(item);
            assert.nestedProperty(widget.expanded_name_trie, 'i.t.e.m');
            assert.nestedProperty(widget.small_name_trie, 'i.t.e.m');
            assert.nestedProperty(widget.string_trie, 'i.t.e.m');
        });

        test('add_to_tree', function() {
            widget.add_to_tree('addtotree', 0, widget.string_trie);
            assert.nestedProperty(widget.string_trie, 'a.d.d.t.o.t.r.e.e');
        });

        test('search', function() {
            widget.search('Test ');
            assert.equal(dropdown.childNodes[0].title, 'Test User (small Test, email@test.com)');
            // Search some random text that shouldn't resolve to any user
            widget.search('Empty');
            assert.equal(dropdown.childElementCount, 0);
        });

        test('getSubtree', function() {
            // 'email@test.com': search for 'email', next letter should be '@'
            assert.property(widget.getSubtree('email', widget.string_trie), '@');
        });

        test('serialize', function() {
            // object in string_trie has id 1, check if the array contains 1
            assert.include(widget.serialize(widget.string_trie), 1);
        });

        test('collate', function() {
            let trees = [widget.string_trie, widget.small_name_trie, widget.expanded_name_trie];
            let result = widget.collate(trees);
            assert.lengthOf(result, 2);
        });

        test('generate_element_text', function() {
            let obj = {
                expanded_name: '1',
                small_name: '2',
                string: '3'
            }
            assert.equal(widget.generate_element_text(obj), '1 (2, 3)');
        });

        test('dropdown', function() {
            // use undefined since dropdown doesn't use values, only keys
            widget.dropdown({'1': undefined});
            assert.lengthOf(dropdown.childNodes, 1);
        });

        test('select_item', function() {
            widget.select_item('1');
            assert.lengthOf(addedList.childNodes, 1);
        });

        test('remove_item', function() {
            widget.select_item('1');
            assert.isNotEmpty(addedList.childNodes);
            widget.remove_item('1');
            assert.isEmpty(addedList.childNodes);
        });

        test('update_selected_list', function() {
            widget.added_items.add('1');
            assert.lengthOf(addedList.childNodes, 0);
            widget.update_selected_list();
            assert.lengthOf(addedList.childNodes, 1);
        });
    });
});
