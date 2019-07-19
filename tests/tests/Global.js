suite('Global Functions', function () {
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

    setup(function () {
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
        $.post = function (url, data, cb, type) {
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
    test('update_page', function () {
        assert.equal(formContainer.innerHTML, 'exampleContent');
    });
    test('draw_breadcrumbs', function () {
        assert.isAbove(topPagination.childElementCount, 1);
    })
    test('create_step', function () {
        assert.equal(topPagination.firstChild.innerText, 'title');
    });
    test('update_exit_button', function () {
        assert.equal(cancelButton.innerText, 'Return to Parent');
    });
    test('update_side_buttons', function () {
        assert(forwardButton.disabled);
        assert(backButton.disabled);
    });
    test('update_description', function () {
        update_description('title', 'description');

        assert.equal(viewTitle.innerText, 'title');
        assert.equal(viewDesc.innerText, 'description');
    });
    test('update_message', function () {
        update_message('message', 999);
        assert.equal(viewMessage.innerText, 'message');
        assert(viewMessage.classList.contains('step_message'));
        assert(viewMessage.classList.contains('message_999'));
    });
    test('submitStepForm', function () {
        // Empty the container so that the function changes it
        formContainer.innerHTML = '';
        submitStepForm();
        assert.equal(formContainer.innerHTML, 'exampleContent');
    });
    test('run_form_callbacks', function () {
        form_submission_callbacks.push(function () {
            let testObject = document.createElement('span');
            testObject.id = 'testObject';
            body.appendChild(testObject);
        });
        run_form_callbacks();
        assert.isNotNull(document.getElementById('testObject'));
    });
});