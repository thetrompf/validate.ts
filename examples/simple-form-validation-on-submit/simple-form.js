/* eslint-env browser */
/* global define */
/* eslint-disable import/no-amd */

define(['require', '/dist/amd/validate.js'], (require) => {

    /* eslint-disable import/no-dynamic-require */
    require(['validate', 'validation/dom', 'validation/utils', 'validation/validators'], (_validate, validateDom, utils, validators) => {
        const { validate, ValidationError } = _validate;
        const { getFormValidationObject } = validateDom;
        const { requiredValidator } = validators;

        const form = document.querySelector('form');
        const submitButton = document.querySelector('button');
        if (!form || !submitButton) {
            throw new Error('Couldn\'t find form or submit button');
        }

        const formValidationObject = getFormValidationObject(form, {
            feedbackSelector: '.form-control-feedback',
            fieldSelector: '.form-group',
            editorSelector: '[name]',
            errorClass: 'has-danger',
        });

        submitButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();

            formValidationObject.clearErrors();

            validate(
                formValidationObject.values,
                {
                    'name': {
                        validators: [
                            requiredValidator,
                            (value) => {
                                if (utils.isEmpty(value)) {
                                    return Promise.resolve(null);
                                }
                                if (value.length <= 5) {
                                    return Promise.reject(new ValidationError('Name must contain 5 chars or more'));
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
                                    return Promise.reject(new ValidationError('Username must contain 7 chars or more'));
                                }
                                return Promise.resolve(null);
                            },
                            (value) => {
                                if (utils.isEmpty(value)) {
                                    return Promise.resolve(null);
                                }
                                if (value.indexOf('@') === -1 || value.indexOf('.') === -1) {
                                    // poor man's email validator.
                                    return Promise.reject(new ValidationError('Username must be a valid email address'));
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
                                    return Promise.reject(new ValidationError(`Password is ${8 - value.length + 1} char(s) too short.`));
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
                            requiredValidator,
                            (value, dependencies) => {
                                if (utils.isEmpty(value)) {
                                    return Promise.resolve(null);
                                }
                                if (value !== dependencies.get('password')) {
                                    return Promise.reject(new ValidationError('Must match the other password field'));
                                }
                                return Promise.resolve(null);
                            },
                        ],
                    },
                }
            ).catch(formValidationObject.setStaticErrors);
        });
    });
});
