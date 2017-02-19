import {
    Field,
    FieldAsync,
} from 'validation/__mocks__/live-fields';

import {
    liveValidate,
} from 'validation/live-validate';

import {
    ValidationAggregateError,
    ValidationError,
} from 'validation/errors';

test('live validators are called when field emits change', async () => {
    expect.assertions(1);
    const field1 = new Field('value1');

    liveValidate({
        field1: field1,
    }, {
            field1: {
                validators: [
                    async (value, dependencies): Promise<void> => {
                        expect(value).toEqual('value2');
                    },
                ],
            },
        }, errors => { });

    field1.setValue('value2');
    return field1.triggerChange();
});

test('validators won\'t be called after subscriptions are cancelled', async () => {
    const field1 = new Field('value1');

    let validatorCalled = 0;

    const abortSubscriptions = liveValidate({
        field1: field1
    }, {
            field1: {
                validators: [
                    async (value, dependencies): Promise<void> => {
                        validatorCalled++;
                    },
                ]
            }
        }, errors => { });

    await field1.triggerChange();
    expect(validatorCalled).toBe(1);
    abortSubscriptions();
    await field1.triggerChange();
    expect(validatorCalled).toBe(1);
});

test('promised values are resolved when passed to validators', async () => {
    expect.assertions(1);
    const field1 = new FieldAsync('async-value1');

    liveValidate({
        field1: field1
    }, {
            field1: {
                validators: [
                    async (value) => {
                        expect(value).toEqual('async-value1');
                    }
                ]
            }
        }, errors => { });

    return field1.triggerChange();
});

test('dependant nodes validators are run when node trigger change', async () => {
    expect.assertions(1);
    const field1 = new Field('value1');
    const field2 = new Field('valie2');

    liveValidate({
        field1: field1,
        field2: field2,
    }, {
            field2: {
                dependencies: ['field1'],
                validators: [
                    async (value, dependencies) => {
                        expect(dependencies.get('field1')).toBe('new-value1');
                    }
                ]
            }
        }, errors => { });

    field1.setValue('new-value1');
    return field1.triggerChange();
});

test('when dependant nodes fail errors are propagated to error handler', async () => {
    expect.assertions(4);
    const field1 = new Field('value1');
    const field2 = new Field('value2');

    liveValidate({
        field1: field1,
        field2: field2,
    }, {
            field2: {
                dependencies: ['field1'],
                validators: [
                    async (value, dependencies) => {
                        if (dependencies.get('field1') !== 'value1') {
                            throw new ValidationError('invalid value');
                        }
                    }
                ]
            }
        },
        errors => {
            expect(errors.length).toBe(1);
            const field2Errors = errors.errors.get('field2') as ValidationError[];
            expect(field2Errors).not.toBeUndefined();
            expect(field2Errors.length).toBe(1);
            expect(field2Errors[0].message).toBe('invalid value');
        }
    );

    field1.setValue('new-wrong-value1');
    return field1.triggerChange();
});

test('when a node validation fails, dependant nodes validators are not called', async () => {
    expect.assertions(6);

    const field1 = new Field('value1');
    const field2 = new Field('value2');

    const field1Validator = jest.fn();
    const field2Validator = jest.fn();

    field1Validator.mockReturnValue(Promise.resolve());
    field2Validator.mockReturnValue(Promise.resolve());

    liveValidate({
        field1: field1,
        field2: field2
    }, {
            field1: {
                validators: [
                    field1Validator,
                    async (value, dependencies) => {
                        if (value !== 'new-valid-value1') {
                            throw new ValidationError('invalid value');
                        }
                    },
                ]
            },
            field2: {
                dependencies: ['field1'],
                validators: [
                    field2Validator,
                ]
            }
        }, errors => {
            expect(errors.length).toBe(1);
            const field1Errors = errors.errors.get('field1') as ValidationError[];
            const field2Errors = errors.errors.get('field2') as ValidationError[];
            expect(field2Errors).toBeUndefined();
            expect(field1Errors.length).toBe(1);
            expect(field1Errors[0].message).toBe('invalid value');
        });

    field1.setValue('new-invalid-value1');
    await field1.triggerChange();

    expect(field1Validator).toBeCalled();
    expect(field2Validator).not.toBeCalled();
});
