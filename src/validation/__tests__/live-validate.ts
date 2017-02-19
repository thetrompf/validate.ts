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
    expect.assertions(2);

    const field1 = new Field('value1');
    const errorHandler = jest.fn();

    liveValidate(
        {
            field1: field1,
        }, {
            field1: {
                validators: [
                    async (value, dependencies): Promise<void> => {
                        expect(value).toEqual('value2');
                    },
                ],
            },
        },
        errorHandler,
    );

    field1.setValue('value2');
    await field1.triggerChange();

    expect(errorHandler).not.toHaveBeenCalled();
});

test('validators won\'t be called after subscriptions are cancelled', async () => {
    const field1 = new Field('value1');
    const errorHandler = jest.fn();

    let validatorCalled = 0;

    const abortSubscriptions = liveValidate(
        {
            field1: field1,
        }, {
            field1: {
                validators: [
                    async (value, dependencies): Promise<void> => {
                        validatorCalled++;
                    },
                ],
            },
        },
        errorHandler,
    );

    await field1.triggerChange();
    expect(validatorCalled).toBe(1);

    abortSubscriptions();

    await field1.triggerChange();
    expect(validatorCalled).toBe(1);

    expect(errorHandler).not.toHaveBeenCalled();
});

test('promised values are resolved when passed to validators', async () => {
    expect.assertions(2);

    const field1 = new FieldAsync('async-value1');
    const errorHandler = jest.fn();

    liveValidate(
        {
            field1: field1
        }, {
            field1: {
                validators: [
                    async (value) => {
                        expect(value).toEqual('async-value1');
                    }
                ],
            },
        },
        errorHandler,
    );

    await field1.triggerChange();

    expect(errorHandler).not.toHaveBeenCalled();
});

test('dependant nodes validators are run when node trigger change', async () => {
    expect.assertions(2);
    const field1 = new Field('value1');
    const field2 = new Field('value2');

    const errorHandler = jest.fn();
    const field2Validator = jest.fn();

    field2Validator.mockReturnValue(Promise.resolve());

    liveValidate(
        {
            field1: field1,
            field2: field2,
        }, {
            field2: {
                dependencies: ['field1'],
                validators: [
                    field2Validator,
                ],
            },
        },
        errorHandler,
    );

    field1.setValue('new-value1');
    await field1.triggerChange();

    expect(field2Validator).toHaveBeenCalledWith('value2', new Map([['field1', 'new-value1']]), {});
    expect(errorHandler).not.toHaveBeenCalled();
});

test('when dependant nodes fail errors are propagated to error handler', async () => {
    expect.assertions(4);
    const field1 = new Field('value1');
    const field2 = new Field('value2');

    liveValidate(
        {
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
                    },
                ],
            },
        },
        errors => {
            expect(errors.length).toBe(1);
            const field2Errors = errors.errors.get('field2') as ValidationError[];
            expect(field2Errors).not.toBeUndefined();
            expect(field2Errors.length).toBe(1);
            expect(field2Errors[0].message).toBe('invalid value');
        },
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

    liveValidate(
        {
            field1: field1,
            field2: field2,
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
                ],
            },
        },
        errors => {
            expect(errors.length).toBe(1);
            const field1Errors = errors.errors.get('field1') as ValidationError[];
            const field2Errors = errors.errors.get('field2') as ValidationError[];
            expect(field2Errors).toBeUndefined();
            expect(field1Errors.length).toBe(1);
            expect(field1Errors[0].message).toBe('invalid value');
        },
    );

    field1.setValue('new-invalid-value1');
    await field1.triggerChange();

    expect(field1Validator).toHaveBeenCalled();
    expect(field2Validator).not.toHaveBeenCalled();
});

test('node with both constraints and dependants, calls dependants validators when own validation passes', async () => {
    const field1 = new Field('value1');
    const field2 = new Field('value2');

    const field1Validator = jest.fn();
    const field2Validator = jest.fn();
    const errorHandler = jest.fn();

    field1Validator.mockReturnValue(Promise.resolve());
    field2Validator.mockReturnValue(Promise.resolve());

    liveValidate(
        {
            field1: field1,
            field2: field2,
        }, {
            field1: {
                validators: [
                    field1Validator,
                ],
            },
            field2: {
                dependencies: ['field1'],
                validators: [
                    field2Validator,
                ],
            },
        },
        errorHandler,
    );

    field1.setValue('new-value1');
    await field1.triggerChange();

    expect(field1Validator).toHaveBeenCalledWith('new-value1', new Map(), {});
    expect(field2Validator).toHaveBeenCalledWith('value2', new Map([['field1', 'new-value1']]), {});
    expect(errorHandler).not.toHaveBeenCalled();
});

test('validators beyond dependency level 2 is called', async () => {
    const a = new Field('A');
    const b = new Field('B');
    const c = new Field('C');
    const d = new Field('D');

    const aValidator = jest.fn();
    const bValidator = jest.fn();
    const cValidator = jest.fn();
    const dValidator = jest.fn();
    const errorHandler = jest.fn();

    aValidator.mockReturnValue(Promise.resolve());
    bValidator.mockReturnValue(Promise.resolve());
    cValidator.mockReturnValue(Promise.resolve());
    dValidator.mockReturnValue(Promise.resolve());

    liveValidate(
        {
            a: a,
            b: b,
            c: c,
            d: d
        }, {
            a: {
                validators: [
                    aValidator,
                ],
            },
            b: {
                dependencies: ['a'],
                validators: [
                    bValidator,
                ],
            },
            c: {
                dependencies: ['b'],
                validators: [
                    cValidator,
                ],
            },
            d: {
                dependencies: ['c'],
                validators: [
                    dValidator,
                ],
            },
        },
        errorHandler,
    );

    a.setValue('A\'');
    await a.triggerChange();

    expect(aValidator).toHaveBeenCalledWith('A\'', new Map(), {});
    expect(bValidator).toHaveBeenCalledWith('B', new Map([['a', 'A\'']]), {});
    expect(cValidator).toHaveBeenCalledWith('C', new Map([['b', 'B']]), {});
    expect(dValidator).toHaveBeenCalledWith('D', new Map([['c', 'C']]), {});

    expect(errorHandler).not.toHaveBeenCalled();
});

test.skip('validators beyond 2nd level of dependency breaks the dependency chain', async () => {
    const a = new Field('A');
    const b = new Field('B');
    const c = new Field('C');
    const d = new Field('D');

    const aValidator = jest.fn();
    const bValidator = jest.fn();
    const cValidator = jest.fn();
    const dValidator = jest.fn();
    const errorHandler = jest.fn();

    aValidator.mockReturnValue(Promise.resolve());
    bValidator.mockReturnValue(Promise.resolve());
    cValidator.mockReturnValue(Promise.reject(new ValidationError('break')));
    dValidator.mockReturnValue(Promise.resolve());

    liveValidate(
        {
            a: a,
            b: b,
            c: c,
            d: d,
        }, {
            a: {
                validators: [
                    aValidator,
                ],
            },
            b: {
                dependencies: ['a'],
                validators: [
                    bValidator,
                ],
            },
            c: {
                dependencies: ['b'],
                validators: [
                    cValidator,
                ],
            },
            d: {
                dependencies: ['c'],
                validators: [
                    dValidator,
                ],
            },
        },
        errorHandler,
    );

    a.setValue('A\'');
    await a.triggerChange();

    expect(aValidator).toHaveBeenCalledWith('A\'', new Map(), {});
    expect(bValidator).toHaveBeenCalledWith('B', new Map([['a', 'A\'']]), {});
    expect(cValidator).toHaveBeenCalledWith('C', new Map([['b', 'B']]), {});
    expect(dValidator).not.toHaveBeenCalled();

    expect(errorHandler).toHaveBeenCalled();
});
