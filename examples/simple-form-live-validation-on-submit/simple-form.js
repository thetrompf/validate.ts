/* global define, document */
define(['require', 'validate'], (require, _validate) => {
    const { liveValidate, ValidationError } = _validate;
    const form = document.querySelector('form');
    const submitButton = document.querySelector('button');
    if (!form || !submitButton) {
        throw new Error('Couldn\'t find form or submit button');
    }

    const changeListeners = {
        name: null,
        username: null,
    };

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

    submitButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        clearErrors();
    });

    liveValidate(
        {
            name: {
                getValue: () => formFieldMap.name.value,
                addListener: (event, ...args) => {
                    changeListeners.name = args[0];
                    args.unshift(event === 'change' ? 'input' : event);
                    return formFieldMap.name.addEventListener.call(formFieldMap.name, ...args);
                },
            },
            username: {
                getValue: () => formFieldMap.username.value,
                addListener: (event, ...args) => {
                    changeListeners.username = args[0];
                    args.unshift(event === 'change' ? 'input' : event);
                    return formFieldMap.username.addEventListener.call(formFieldMap.username, ...args);
                },
            },
        }, {
            name: {
                validators: [
                    (value) => {
                        if (value.length <= 5) {
                            return Promise.reject(new ValidationError(`Name is ${5 - value.length + 1} char(s) too short.`));
                        }
                        return Promise.resolve(null);
                    },
                ],
            },
            username: {
                validators: [
                    (value) => {
                        if (value.length < 7) {
                            return Promise.reject(new ValidationError(`Username is ${7 - value.length + 1} char(s) too short.`));
                        }
                        return Promise.resolve(null);
                    },
                    (value) => {
                        // poor man's email validator.
                        if (!/[a-z0-9_.+-]+@[a-z0-9_.-]+\.[a-z]+/i.test(value)) {
                            return Promise.reject(new ValidationError('Username must be a valid email address.'));
                        }
                        return Promise.resolve(null);
                    },
                ],
            },
        },
        (e) => {
            for (const field in formFieldMap) {
                const errors = e.errors.get(field);
                if (errors) {
                    addErrorsToField(field, errors);
                } else {
                    clearError(field);
                }
            }
        }
    );

    formFieldMap.name.addEventListener('focus', () => {
        if (typeof changeListeners.name === 'function') {
            changeListeners.name();
        }
    }, true);
    formFieldMap.username.addEventListener('focus', () => {
        if (typeof changeListeners.username === 'function') {
            changeListeners.username();
        }
    }, true);

    formFieldMap.name.focus();
});
