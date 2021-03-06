/* eslint-env browser */
/* global define */
/* eslint-disable import/no-amd */

define('simple-form', ['require', '/dist/amd/validate.js'], (require) => {

    /* eslint-disable import/no-dynamic-require */
    require(['validate', 'validation/dom', 'validation/utils', 'validation/validators'], (_validate, validateDom, utils, validators) => {
        const {
            liveValidate,
            ValidationError,
            validate,
        } = _validate;

        const {
            requiredValidator,
        } = validators;

        const {
            getFormValidationObject,
        } = validateDom;

        const form = document.querySelector('form');
        const submitButton = document.querySelector('button[type=submit]');
        const resetButton = document.querySelector('button[type=reset]');
        if (!form || !submitButton || !resetButton) {
            throw new Error('Couldn\'t find form, reset or submit button');
        }

        const formValidationObject = getFormValidationObject(form, {
            editorSelector: '[name]',
            errorClass: 'has-danger',
            feedbackSelector: '.form-control-feedback',
            fieldSelector: '.form-group',
            live: true,
        });

        const constraints = {
            'name': {
                validators: [
                    requiredValidator,
                    (value) => {
                        if (utils.isEmpty(value)) {
                            return Promise.resolve(null);
                        }
                        if (value.length <= 5) {
                            return Promise.reject(new ValidationError(`Name is ${6 - value.length} char(s) too short.`));
                        }
                        return Promise.resolve(null);
                    },
                ],
            },
            'username': {
                validators: [
                    requiredValidator,
                    (value) => {
                        if (utils.isEmpty(value)) {
                            return Promise.resolve(null);
                        }
                        if (value.length < 7) {
                            return Promise.reject(new ValidationError(`Username is ${8 - value.length} char(s) too short.`));
                        }
                        return Promise.resolve(null);
                    },
                    (value) => {
                        if (utils.isEmpty(value)) {
                            return Promise.resolve(null);
                        }
                        // poor man's email validator.
                        if (!/[a-z0-9_.+-]+@[a-z0-9_.-]+\.[a-z]+/i.test(value)) {
                            return Promise.reject(new ValidationError('Username must be a valid email address.'));
                        }
                        return Promise.resolve(null);
                    },
                ],
            },
            'password': {
                validators: [
                    requiredValidator,
                    (value) => {
                        if (utils.isEmpty(value)) {
                            return Promise.resolve(null);
                        }
                        if (value.length < 8) {
                            return Promise.reject(new ValidationError(`Password is ${9 - value.length} char(s) too short.`));
                        }
                        return Promise.resolve(null);
                    },
                    (value) => {
                        if (utils.isEmpty(value)) {
                            return Promise.resolve(null);
                        }
                        if (!/[a-z]/.test(value)) {
                            return Promise.reject(new ValidationError('Password must contain lower case letters'));
                        }
                        return Promise.resolve(null);
                    },
                    (value) => {
                        if (utils.isEmpty(value)) {
                            return Promise.resolve(null);
                        }
                        if (!/[A-Z]/.test(value)) {
                            return Promise.reject(new ValidationError('Password must contain upper case letters'));
                        }
                        return Promise.resolve(null);
                    },
                    (value) => {
                        if (utils.isEmpty(value)) {
                            return Promise.resolve(null);
                        }
                        if (!/[0-9]/.test(value)) {
                            return Promise.reject(new ValidationError('Password must contain numbers'));
                        }
                        return Promise.resolve(null);
                    },
                ],
            },
            'password-repeat': {
                dependencies: ['password'],
                validators: [
                    (value, dependencies) => {
                        const password = dependencies.get('password');
                        if (utils.isEmpty(value) || utils.isEmpty(password)) {
                            return Promise.resolve(null);
                        }
                        if (value !== password) {
                            return Promise.reject(new ValidationError('Must match the other password field'));
                        }
                        return Promise.resolve(null);
                    },
                ],
            },
        };

        let cancelLiveValidationSubscription = null;

        submitButton.addEventListener('click', (event) => {
            event.preventDefault();

            validate(formValidationObject.values, constraints).then(
                () => {
                    console.log('Success!');
                },
                (changes) => {
                    formValidationObject.setStaticErrors(changes);
                    if (cancelLiveValidationSubscription === null) {
                        cancelLiveValidationSubscription = liveValidate(
                            formValidationObject.valueProviders,
                            constraints,
                            formValidationObject.setLiveErrors
                        );
                    }
                }
            );
        });

        resetButton.addEventListener('click', (event) => {
            event.preventDefault();
            if (cancelLiveValidationSubscription !== null) {
                cancelLiveValidationSubscription();
                cancelLiveValidationSubscription = null;
            }
            const formMap = formValidationObject.formMap;
            for (const field of Object.keys(formMap)) {
                formMap[field].editorElement.value = '';
            }
            formValidationObject.clearErrors();
        });

        formValidationObject.formMap.name.editorElement.focus();
    });
});
