/* global define, document */
define(['require', 'validate'], (require, _validate) => {
    const { validate, ValidationError } = _validate;
    const form = document.querySelector('form');
    const submitButton = document.querySelector('button');
    if (!form || !submitButton) {
        throw new Error('Couldn\'t find form or submit button');
    }

    const formFieldMap = {
        name: document.getElementById('name'),
        username: document.getElementById('username'),
    };

    const formGroupMap = {
        name: document.querySelector('.form-group.name'),
        username: document.querySelector('.form-group.username'),
    };

    const formFeedbackMap = {
        name: document.querySelector('.form-control-feedback.name'),
        username: document.querySelector('.form-control-feedback.username'),
    };

    const clearError = (field) => {
        formGroupMap[field].classList = `form-group ${field}`;
        formFeedbackMap[field].innerHTML = '';
    };

    const clearErrors = () => {
        clearError('name');
        clearError('username');
    };

    const addErrorsToField = (field, errors) => {
        formGroupMap[field].classList = `form-group has-danger ${field}`;
        if (errors.length > 1) {
            formFeedbackMap[field].innerHTML = '<ul><li>' + errors.map(e => e.message).join('</li><li>') + '</li></ul>';
        } else if (errors.length === 1) {
            formFeedbackMap[field].innerHTML = errors[0].message;
        }
    };

    const addErrors = (errors) => {
        for (const fieldErrors of Array.from(errors.errors)) {
            addErrorsToField(fieldErrors[0], fieldErrors[1]);
        }
    };

    submitButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        clearErrors();

        validate(
            {
                name: formFieldMap.name.value,
                username: formFieldMap.username.value,
            }, {
                name: {
                    validators: [
                        (value) => {
                            if (value.length <= 5) {
                                return Promise.reject(new ValidationError('Name must contain 5 chars or more'));
                            }
                            return Promise.resolve(null);
                        },
                    ],
                },
                username: {
                    validators: [
                        (value) => {
                            if (value.length < 7) {
                                return Promise.reject(new ValidationError('Username must contain 7 chars or more'));
                            }
                            return Promise.resolve(null);
                        },
                        (value) => {
                            if (value.indexOf('@') === -1 || value.indexOf('.') === -1) {
                                // poor man's email validator.
                                return Promise.reject(new ValidationError('Username must be a valid email address'));
                            }
                            return Promise.resolve(null);
                        },
                    ],
                },
            }
        ).catch((e) => {
            addErrors(e);
        });
    });
});
