suite('MultipleSelectFilterWidget', function () {
    let widget;
    let initialData;
    let lab1;
    let lab2;
    let host1;
    let host2;
    let graph_neighbors;
    let filter_items;
    let dropdown;

    setup(function () {
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
        dropdown = document.createElement('div');
        dropdown.id = 'dropdown_wrapper';

        // Append elements to the page
        body.append(lab1);
        body.append(lab2);
        body.append(host1);
        body.append(host2);
        body.append(dropdown);
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

    test('make_selection', function () {
        widget.make_selection(initialData);
        assert.isTrue(lab1.classList.contains('selected_node'));
        assert.isTrue(host1.classList.contains('selected_node'));
    });

    test('make_multiple_selection', function () {
        let node = widget.filter_items['host_1'];
        let selectionData = {
            values: {
                '1': 'prepopulate'
            }
        };
        widget.make_multiple_selection(node, selectionData);
        assert.equal(dropdown.childNodes[0].childNodes[0].innerText, 'host 1');
    });

    test('markAndSweep', function () {
        widget.markAndSweep(widget.filter_items['host_1']);
        assert.isFalse(widget.filter_items['host_2'].selectable);
    });

    test('process', function () {
        widget.filter_items['host_1'].selected = true;
        assert.isFalse(host1.classList.contains('selected_node'));
        widget.process(widget.filter_items['host_2']);
        assert.isTrue(host1.classList.contains('selected_node'));
    });

    test('select', function () {
        widget.select(widget.filter_items['host_1']);
        assert.isTrue(host1.classList.contains('selected_node'));
    });

    test('clear', function () {
        host1.classList.add('selected_node');
        widget.filter_items['host_1'].selected = true;
        widget.clear(widget.filter_items['host_1']);
        assert.isFalse(host1.classList.contains('selected_node'));
        assert.isFalse(widget.filter_items['host_1'].selected);
    });

    test('disable_node', function () {
        widget.disable_node(widget.filter_items['host_1']);
        assert.isFalse(widget.filter_items['host_1'].selectable);
        assert.isTrue(host1.classList.contains('not-allowed'));
    });

    test('processClick', function () {
        widget.processClick('host_1');
        assert.isTrue(host1.classList.contains('selected_node'));
        widget.filter_items['host_2'].selectable = false;
        widget.processClick('host_2');
        assert.isFalse(host2.classList.contains('selected_node'));
    });

    test('processClickSingle', function () {
        assert.isFalse(widget.filter_items['host_1'].selected);
        widget.processClickSingle(widget.filter_items['host_1']);
        assert.isTrue(widget.filter_items['host_1'].selected);
    });

    test('processClickMultiple', function () {
        widget.processClickMultiple(widget.filter_items['host_2']);
        assert.lengthOf(dropdown.childNodes, 1);
        assert.equal(dropdown.childNodes[0].childNodes[0].innerText, 'host 2');
    });

    test('restrictchars', function () {
        let testInput = document.createElement('input');
        testInput.type = 'text';
        testInput.pattern = '\W*';
        testInput.value = 'abcdefg!@#$';
        widget.restrictchars(testInput);
        assert.equal(testInput.value, 'abcdefg');
    });

    test('checkunique', function () {
        let input1 = document.createElement('input');
        input1.value = 'duplicate';
        let input2 = document.createElement('input');
        input2.value = 'duplicate';
        widget.inputs = [input1, input2];
        widget.checkunique(input1);
        assert.isFalse(input1.checkValidity());
    });

    test('make_remove_button', function () {
        // use host1 div since it doesn't really matter which one we use
        let elem = widget.make_remove_button(host1, widget.filter_items['host_1']);
        assert.equal(elem.innerText, 'Remove');
        assert.isFunction(elem.onclick);
    });

    test('make_input', function () {
        let input = widget.make_input(host1, widget.filter_items['host_1'], 'starting');
        assert.equal(input.value, 'starting');
        assert.equal(input.name, 'host_1textInput');
    });

    test('add_item_prepopulate', function () {
        let item = widget.add_item_prepopulate(widget.filter_items['host_1'], 'info');
        assert.equal(item.childNodes[0].innerText, 'host 1');
        // childNodes[1] is the input box, which has a prepopulated value
        assert.equal(item.childNodes[1].value, 'info');
    });

    test('remove_dropdown', function () {
        let div = document.createElement('div');
        div.id = 'toBeRemoved';
        body.append(div);
        widget.result['host'] = {
            host_1: {
                values: {
                    toBeRemoved: undefined
                }
            }
        };
        widget.remove_dropdown(div.id, 'host_1');
        assert.isNull(document.getElementById('toBeRemoved'));
    });

    test('updateResult', function () {
        widget.filter_items['host_1'].selected = true;
        widget.updateResult(widget.filter_items['host_1']);
        assert.propertyVal(widget.result.host.host_1, 'selected', true);
    });

    test('updateObjectResult', function () {
        widget.updateObjectResult(widget.filter_items['host_1'], host1.id, 'childValue');
        assert.equal(widget.result.host.host_1.values.host_1, 'childValue');
    });

    test('finish', function () {
        widget.result.host.host_1 = {
            values: {
                childKey: 'childValue'
            }
        };
        let filterField = document.createElement('input');
        filterField.id = 'filter_field';
        body.append(filterField);
        widget.finish();
        let parsedInfo = JSON.parse(filterField.value);
        assert.equal(parsedInfo.host.host_1.values.childKey, 'childValue');
    });
});