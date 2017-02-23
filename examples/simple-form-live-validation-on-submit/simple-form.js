/* eslint-env browser */
/* global define */
/* eslint-disable import/no-amd */

define('simple-form', ['require', '/dist/amd/validate.js'], (require) => {

    /* eslint-disable import/no-dynamic-require */
    require(['validate'], (validate) => {
        const { liveValidate, ValidationError } = validate;
        const form = document.querySelector('form');
        const submitButton = document.querySelector('button');
        if (!form || !submitButton) {
            throw new Error('Couldn\'t find form or submit button');
        }

        const changeListeners = {
            name: null,
            username: null,
            password: null,
            password2: null,
        };

        const formFieldMap = {
            name: document.getElementById('name'),
            username: document.getElementById('username'),
            password: document.getElementById('password'),
            password2: document.getElementById('password-repeat'),
        };

        const formGroupMap = {
            name: document.querySelector('.form-group.name'),
            username: document.querySelector('.form-group.username'),
            password: document.querySelector('.form-group.password'),
            password2: document.querySelector('.form-group.password-repeat'),
        };

        const formFeedbackMap = {
            name: document.querySelector('.form-control-feedback.name'),
            username: document.querySelector('.form-control-feedback.username'),
            password: document.querySelector('.form-control-feedback.password'),
            password2: document.querySelector('.form-control-feedback.password-repeat'),
        };

        const clearError = (field) => {
            formGroupMap[field].classList = `form-group ${field}`;
            formFeedbackMap[field].innerHTML = '';
        };

        const clearErrors = () => {
            clearError('name');
            clearError('username');
            clearError('password');
            clearError('password2');
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
                password: {
                    getValue: () => formFieldMap.password.value,
                    addListener: (event, ...args) => {
                        changeListeners.password = args[0];
                        args.unshift(event === 'change' ? 'input' : event);
                        return formFieldMap.password.addEventListener.call(formFieldMap.password, ...args);
                    },
                },
                password2: {
                    getValue: () => formFieldMap.password2.value,
                    addListener: (event, ...args) => {
                        changeListeners.password2 = args[0];
                        args.unshift(event === 'change' ? 'input' : event);
                        return formFieldMap.password2.addEventListener.call(formFieldMap.password2, ...args);
                    },
                },
            }, {
                name: {
                    validators: [
                        (value) => {
                            if (value.length <= 5) {
                                return Promise.reject(new ValidationError(`Name is ${5 - value.length} char(s) too short.`));
                            }
                            return Promise.resolve(null);
                        },
                    ],
                },
                username: {
                    validators: [
                        (value) => {
                            if (value.length < 7) {
                                return Promise.reject(new ValidationError(`Username is ${7 - value.length} char(s) too short.`));
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
                password: {
                    validators: [
                        (value) => {
                            if (value.length < 8) {
                                return Promise.reject(new ValidationError(`Password is ${8 - value.length} char(s) too short.`));
                            }
                            return Promise.resolve(null);
                        },
                        (value) => {
                            if (!/[a-z]/.test(value)) {
                                return Promise.reject(new ValidationError('Password must contain lower case letters'));
                            }
                            return Promise.resolve(null);
                        },
                        (value) => {
                            if (!/[A-Z]/.test(value)) {
                                return Promise.reject(new ValidationError('Password must contain upper case letters'));
                            }
                            return Promise.resolve(null);
                        },
                        (value) => {
                            if (!/[0-9]/.test(value)) {
                                return Promise.reject(new ValidationError('Password must contain numbers'));
                            }
                            return Promise.resolve(null);
                        },
                    ],
                },
                password2: {
                    dependencies: ['password'],
                    validators: [
                        (value, dependencies) => {
                            if (value !== dependencies.get('password')) {
                                return Promise.reject(new ValidationError('Must match the other password field'));
                            }
                            return Promise.resolve(null);
                        },
                    ],
                },
            },
            (e) => {
                e.forEach((errors, field) => {
                    if (errors.length == 0) {
                        clearError(field);
                    } else {
                        addErrorsToField(field, errors);
                    }
                });
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
        formFieldMap.password.addEventListener('focus', () => {
            if (typeof changeListeners.password === 'function') {
                changeListeners.password();
            }
        }, true);
        formFieldMap.password2.addEventListener('focus', () => {
            if (typeof changeListeners.password2 === 'function') {
                changeListeners.password2();
            }
        }, true);

        formFieldMap.name.focus();
    });
});
