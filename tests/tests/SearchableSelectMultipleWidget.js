suite('SearchableSelectMultipleWidget', function () {
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

    setup(function () {
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

    test('disable', function () {
        widget.disable();
        assert.equal(userField.disabled, 'True');
        assert.equal(dropdown.style.display, 'none');
    });

    test('search_field_init', function () {
        assert.isEmpty(addedNumber.innerText);
        assert.isUndefined(selector.value);
        assert.isEmpty(addedList.childNodes);
        widget.initial = [1];
        widget.search_field_init();
        assert.equal(addedNumber.innerText, '1');
        assert.equal(selector.value, '[1]');
        assert.equal(addedList.childNodes.length, 1);
    });

    test('build_all_tries', function () {
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

    test('add_item', function () {
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

    test('add_to_tree', function () {
        widget.add_to_tree('addtotree', 0, widget.string_trie);
        assert.nestedProperty(widget.string_trie, 'a.d.d.t.o.t.r.e.e');
    });

    test('search', function () {
        widget.search('Test ');
        assert.equal(dropdown.childNodes[0].title, 'Test User (small Test, email@test.com)');
        // Search some random text that shouldn't resolve to any user
        widget.search('Empty');
        assert.equal(dropdown.childElementCount, 0);
    });

    test('getSubtree', function () {
        // 'email@test.com': search for 'email', next letter should be '@'
        assert.property(widget.getSubtree('email', widget.string_trie), '@');
    });

    test('serialize', function () {
        // object in string_trie has id 1, check if the array contains 1
        assert.include(widget.serialize(widget.string_trie), 1);
    });

    test('collate', function () {
        let trees = [widget.string_trie, widget.small_name_trie, widget.expanded_name_trie];
        let result = widget.collate(trees);
        assert.lengthOf(result, 2);
    });

    test('generate_element_text', function () {
        let obj = {
            expanded_name: '1',
            small_name: '2',
            string: '3'
        }
        assert.equal(widget.generate_element_text(obj), '1 (2, 3)');
    });

    test('dropdown', function () {
        // use undefined since dropdown doesn't use values, only keys
        widget.dropdown({
            '1': undefined
        });
        assert.lengthOf(dropdown.childNodes, 1);
    });

    test('select_item', function () {
        widget.select_item('1');
        assert.lengthOf(addedList.childNodes, 1);
    });

    test('remove_item', function () {
        widget.select_item('1');
        assert.isNotEmpty(addedList.childNodes);
        widget.remove_item('1');
        assert.isEmpty(addedList.childNodes);
    });

    test('update_selected_list', function () {
        widget.added_items.add('1');
        assert.lengthOf(addedList.childNodes, 0);
        widget.update_selected_list();
        assert.lengthOf(addedList.childNodes, 1);
    });
});