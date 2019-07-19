suite('NetworkStep', function () {
    let hosts;
    let graphContainer;
    let overviewContainer;
    let toolbarContainer;
    let networkList;
    let networkStep;

    setup(function () {
        body.innerHTML = '';
        hosts = [{
            id: 'host1',
            interfaces: [{
                name: 'interface1',
                description: 'description1'
            }],
            value: {
                description: 'example host1',
                name: 'host1'
            }
        }];
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

    test('public network creation', function () {
        // Network list's first child should be the 'public' network div,
        // Public div has two children: the colored circle and the label
        // It does not have a delete button.
        assert.equal(networkList.childNodes[0].childNodes.length, 2);
        assert.equal(networkList.childNodes[0].childNodes[1].innerText, 'public');
    });

    test('duplicate network name', function () {
        networkStep.newNetworkWindow();
        let netInput = document.querySelector('input[name="net_name"]');
        netInput.value = 'public'
        document.querySelector('.mxWindowPane div button:first-of-type').click();
        let windowErrors = document.getElementById('current_window_errors');
        assert.equal(windowErrors.innerText, 'All network names must be unique');
    });


    test('new network creation', function () {
        networkStep.newNetworkWindow();
        let netInput = document.querySelector('input[name="net_name"]');
        netInput.value = 'testNetwork';
        document.querySelector('.mxWindowPane div button:first-of-type').click();
        assert.equal(networkList.childNodes[1].childNodes[1].innerText, 'testNetwork');
    });
});