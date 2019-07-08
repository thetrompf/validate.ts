import { Field, FieldAsync } from '../__mocks__/live-fields';
import { ValidationError } from '../errors';
import { liveValidate } from '../live-validate';
import { ILiveValidationChangeMap } from '../types';
import { LiveValidationChangeMap } from '../utils';

test('live validators are called when field emits change', async () => {
    expect.assertions(2);

    const field1 = new Field('value1');
    const changeHandler = jest.fn();

    const values = {
        field1: field1,
    };

    liveValidate(
        values,
        {
            field1: {
                validators: [
                    async (value: any, _dependencies: any): Promise<void> => {
                        expect(value).toEqual('value2');
                    },
                ],
            },
        },
        changeHandler,
    );

    field1.setValue('value2');
    await field1.triggerChange();

    const liveValidationChangeMap = new LiveValidationChangeMap<typeof values>();
    liveValidationChangeMap.markNodeAsChanged('field1');
    expect(changeHandler).toHaveBeenCalledWith(liveValidationChangeMap);
});

test("validators won't be called after subscriptions are cancelled", async () => {
    const field1 = new Field('value1');
    const changeHandler = jest.fn();

    const validator = jest.fn();
    validator.mockReturnValue(Promise.resolve(null));

    const values = {
        field1: field1,
    };

    const abortSubscriptions = liveValidate(
        values,
        {
            field1: {
                validators: [validator],
            },
        },
        changeHandler,
    );

    await field1.triggerChange();
    expect(validator).toHaveBeenCalledTimes(1);

    abortSubscriptions();

    await field1.triggerChange();
    expect(validator).toHaveBeenCalledTimes(1);

    const liveValidationChangeMap = new LiveValidationChangeMap<typeof values>();
    liveValidationChangeMap.markNodeAsChanged('field1');

    expect(changeHandler).toHaveBeenCalledWith(liveValidationChangeMap);
});

test('promised values are resolved when passed to validators', async () => {
    expect.assertions(2);

    const field1 = new FieldAsync('async-value1');
    const changeHandler = jest.fn();

    const values = {
        field1: field1,
    };

    liveValidate(
        values,
        {
            field1: {
                validators: [
                    async (value: any) => {
                        expect(value).toEqual('async-value1');
                    },
                ],
            },
        },
        changeHandler,
    );

    await field1.triggerChange();

    const liveValidationChangeMap = new LiveValidationChangeMap<typeof values>();
    liveValidationChangeMap.markNodeAsChanged('field1');

    expect(changeHandler).toHaveBeenCalledWith(liveValidationChangeMap);
});

test('dependant nodes validators are run when node trigger change', async () => {
    expect.assertions(2);
    const field1 = new Field('value1');
    const field2 = new Field('value2');

    const changeHandler = jest.fn();
    const field2Validator = jest.fn();

    field2Validator.mockReturnValue(Promise.resolve());

    const values = {
        field1: field1,
        field2: field2,
    };

    liveValidate(
        values,
        {
            field2: {
                dependencies: ['field1'],
                validators: [field2Validator],
            },
        },
        changeHandler,
    );

    field1.setValue('new-value1');
    await field1.triggerChange();

    const liveValidationChangeMap = new LiveValidationChangeMap<typeof values>();
    liveValidationChangeMap.markNodeAsChanged('field1');
    liveValidationChangeMap.markNodeAsChanged('field2');

    expect(field2Validator).toHaveBeenCalledWith('value2', new Map([['field1', 'new-value1']]), {});
    expect(changeHandler).toHaveBeenCalledWith(liveValidationChangeMap);
});

test('when dependant nodes fail errors are propagated to error handler', async () => {
    expect.assertions(4);
    const field1 = new Field('value1');
    const field2 = new Field('value2');

    const values = {
        field1: field1,
        field2: field2,
    };

    liveValidate(
        values,
        {
            field2: {
                dependencies: ['field1'],
                validators: [
                    async (value: any, dependencies: any) => {
                        if (dependencies.get('field1') !== 'value1') {
                            throw new ValidationError('invalid value');
                        }
                    },
                ],
            },
        },
        (changes: ILiveValidationChangeMap<typeof values, ValidationError>) => {
            expect(changes.hasErrors).toBe(true);
            const field2Errors = changes.getErrorsForNode('field2') as ValidationError[];
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

    const values = {
        field1: field1,
        field2: field2,
    };

    liveValidate(
        values,
        {
            field1: {
                validators: [
                    field1Validator,
                    async (value: any, dependencies: any) => {
                        if (value !== 'new-valid-value1') {
                            throw new ValidationError('invalid value');
                        }
                    },
                ],
            },
            field2: {
                dependencies: ['field1'],
                validators: [field2Validator],
            },
        },
        (changes: ILiveValidationChangeMap<typeof values, ValidationError>) => {
            expect(changes.hasErrors).toBe(true);
            const field1Errors = changes.getErrorsForNode('field1') as ValidationError[];
            const field2Errors = changes.getErrorsForNode('field2') as ValidationError[];
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
    const changeHandler = jest.fn();

    field1Validator.mockReturnValue(Promise.resolve());
    field2Validator.mockReturnValue(Promise.resolve());

    const values = {
        field1: field1,
        field2: field2,
    };

    liveValidate(
        values,
        {
            field1: {
                validators: [field1Validator],
            },
            field2: {
                dependencies: ['field1'],
                validators: [field2Validator],
            },
        },
        changeHandler,
    );

    field1.setValue('new-value1');
    await field1.triggerChange();

    expect(field1Validator).toHaveBeenCalledWith('new-value1', new Map(), {});
    expect(field2Validator).toHaveBeenCalledWith('value2', new Map([['field1', 'new-value1']]), {});

    const liveValidationChangeMap = new LiveValidationChangeMap<typeof values>();
    liveValidationChangeMap.markNodeAsChanged('field1');
    liveValidationChangeMap.markNodeAsChanged('field2');

    expect(changeHandler).toHaveBeenCalledWith(liveValidationChangeMap);
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
    const changeHandler = jest.fn();

    aValidator.mockReturnValue(Promise.resolve());
    bValidator.mockReturnValue(Promise.resolve());
    cValidator.mockReturnValue(Promise.resolve());
    dValidator.mockReturnValue(Promise.resolve());

    const values = {
        a: a,
        b: b,
        c: c,
        d: d,
    };

    liveValidate(
        values,
        {
            a: {
                validators: [aValidator],
            },
            b: {
                dependencies: ['a'],
                validators: [bValidator],
            },
            c: {
                dependencies: ['b'],
                validators: [cValidator],
            },
            d: {
                dependencies: ['c'],
                validators: [dValidator],
            },
        },
        changeHandler,
    );

    a.setValue("A'");
    await a.triggerChange();

    expect(aValidator).toHaveBeenCalledWith("A'", new Map(), {});
    expect(bValidator).toHaveBeenCalledWith('B', new Map([['a', "A'"]]), {});
    expect(cValidator).toHaveBeenCalledWith('C', new Map([['b', 'B']]), {});
    expect(dValidator).toHaveBeenCalledWith('D', new Map([['c', 'C']]), {});

    const liveValidationChangeMap = new LiveValidationChangeMap<typeof values>();
    liveValidationChangeMap.markNodeAsChanged('a');
    liveValidationChangeMap.markNodeAsChanged('b');
    liveValidationChangeMap.markNodeAsChanged('c');
    liveValidationChangeMap.markNodeAsChanged('d');

    expect(changeHandler).toHaveBeenCalledWith(liveValidationChangeMap);
});

test('validators beyond 2nd level of dependency breaks the dependency chain', async () => {
    const a = new Field('A');
    const b = new Field('B');
    const c = new Field('C');
    const d = new Field('D');

    const aValidator = jest.fn();
    const bValidator = jest.fn();
    const cValidator = jest.fn();
    const dValidator = jest.fn();
    const changeHandler = jest.fn();

    aValidator.mockReturnValue(Promise.resolve());
    bValidator.mockReturnValue(Promise.resolve());
    cValidator.mockReturnValue(Promise.reject(new ValidationError('break')));
    dValidator.mockReturnValue(Promise.resolve());

    const values = {
        a: a,
        b: b,
        c: c,
        d: d,
    };

    liveValidate(
        values,
        {
            a: {
                validators: [aValidator],
            },
            b: {
                dependencies: ['a'],
                validators: [bValidator],
            },
            c: {
                dependencies: ['b'],
                validators: [cValidator],
            },
            d: {
                dependencies: ['c'],
                validators: [dValidator],
            },
        },
        changeHandler,
    );

    a.setValue("A'");
    await a.triggerChange();

    expect(aValidator).toHaveBeenCalledWith("A'", new Map(), {});
    expect(bValidator).toHaveBeenCalledWith('B', new Map([['a', "A'"]]), {});
    expect(cValidator).toHaveBeenCalledWith('C', new Map([['b', 'B']]), {});
    expect(dValidator).not.toHaveBeenCalled();

    const changeMap = new LiveValidationChangeMap<typeof values>();
    changeMap.markNodeAsChanged('a');
    changeMap.markNodeAsChanged('b');
    changeMap.addError('c', new ValidationError('break'));

    expect(changeHandler).toHaveBeenCalledWith(changeMap);
});

test('dependant validators is run even if no validators defined on first level in the graph', async () => {
    const a = new Field('A');
    const b = new Field('B');

    const bValidator = jest.fn();
    const changeHandler = jest.fn();

    bValidator.mockReturnValue(Promise.resolve());

    const values = {
        a: a,
        b: b,
    };

    liveValidate(
        values,
        {
            a: {
                dependencies: [] as any,
            },
            b: {
                dependencies: ['a'],
                validators: [bValidator],
            },
        },
        changeHandler,
    );

    a.setValue("A'");
    await a.triggerChange();

    expect(bValidator).toHaveBeenCalledWith('B', new Map([['a', "A'"]]), {});

    const liveValidationChangeMap = new LiveValidationChangeMap<typeof values>();
    liveValidationChangeMap.markNodeAsChanged('a');
    liveValidationChangeMap.markNodeAsChanged('b');

    expect(changeHandler).toHaveBeenCalledWith(liveValidationChangeMap);
});

test('when a field triggers change, it exists in change map, with empty list of errors', async () => {
    expect.assertions(1);
    const a = new Field('A');
    const values = {
        a: a,
    };

    liveValidate(values, {}, (changes: ILiveValidationChangeMap<typeof values, ValidationError>) => {
        expect(changes.getErrorsForNode('a')).toHaveLength(0);
    });

    a.setValue("A'");
    return a.triggerChange();
});

test('when a field passes its validation, it exists in change map, with empty list of errors', async () => {
    expect.assertions(2);

    const a = new Field('A');
    const aValidator = jest.fn();
    aValidator.mockReturnValue(Promise.resolve());

    const values = {
        a: a,
    };

    liveValidate(
        values,
        {
            a: {
                validators: [aValidator],
            },
        },
        (changes: ILiveValidationChangeMap<typeof values, ValidationError>) => {
            expect(changes.getErrorsForNode('a')).toHaveLength(0);
        },
    );

    a.setValue("A'");
    await a.triggerChange();

    expect(aValidator).toHaveBeenCalledWith("A'", new Map(), {});
});

test('when a field triggers change and has dependants, they appear in the change map', async () => {
    expect.assertions(4);

    const a = new Field('A');
    const b = new Field('B');

    const values: { a: Field; b: Field } = {
        a: a,
        b: b,
    };

    liveValidate(
        values,
        {
            b: {
                dependencies: ['a'],
            },
        },
        (changes: ILiveValidationChangeMap<typeof values, ValidationError>) => {
            expect(changes.hasErrors).toBe(false);
            expect(Array.from(changes.keys())).toEqual(['a', 'b']);
            expect(changes.getErrorsForNode('a')).toEqual([]);
            expect(changes.getErrorsForNode('b')).toEqual([]);
        },
    );

    a.setValue("A'");
    return a.triggerChange();
});

test('when a field fails its validations, its dependants does not appear in change map', async () => {
    expect.assertions(3);

    const a = new Field('A');
    const b = new Field('B');

    const aValidator = jest.fn();
    aValidator.mockReturnValue(Promise.reject(new ValidationError('Nope!')));

    const values: { a: Field; b: Field } = {
        a: a,
        b: b,
    };

    liveValidate(
        values,
        {
            a: {
                validators: [aValidator],
            },
            b: {
                dependencies: ['a'],
            },
        },
        (changes: ILiveValidationChangeMap<typeof values, ValidationError>) => {
            expect(changes.hasErrors).toBe(true);
            expect(Array.from(changes.keys())).toEqual(['a']);
            expect(changes.getErrorsForNode('a')).toHaveLength(1);
        },
    );

    a.setValue("A'");
    return a.triggerChange();
});

// tslint:disable-next-line:max-line-length
test('when field triggers change, if a later change triggers, and returns first, second return will not call change handler', async () => {
    expect.assertions(6);

    const a = new Field('A');

    const aValidator = jest.fn();
    aValidator
        .mockReturnValueOnce(
            new Promise((_resolve, reject) => {
                setTimeout(() => reject(), 30);
            }),
        )
        .mockReturnValueOnce(
            new Promise(resolve => {
                setTimeout(() => resolve(), 10);
            }),
        );

    const values: { a: Field } = {
        a: a,
    };

    liveValidate(
        values,
        {
            a: {
                validators: [aValidator],
            },
        },
        (changes: ILiveValidationChangeMap<typeof values, ValidationError>) => {
            expect(changes.hasErrors).toBe(false);
            expect(Array.from(changes.keys())).toEqual(['a']);
            expect(changes.getErrorsForNode('a')).toHaveLength(0);
        },
    );

    const changePromises: Promise<void>[] = [];

    a.setValue("A'");
    changePromises.push(a.triggerChange());

    a.setValue("A''");
    changePromises.push(a.triggerChange());

    await Promise.all(changePromises);

    expect(aValidator).toHaveBeenCalledTimes(2);
    expect(aValidator).toHaveBeenCalledWith("A'", new Map(), {});
    expect(aValidator).toHaveBeenCalledWith("A''", new Map(), {});
});

// tslint:disable-next-line:max-line-length
test('when subscriptions are cancelled and a long running validation returns, the change handler is not called', async () => {
    const a = new Field('A');

    const aValidator = jest.fn();
    const changeHandler = jest.fn();

    aValidator.mockReturnValue(
        new Promise(resolve => {
            setTimeout(() => resolve(), 30);
        }),
    );

    const values: { a: Field } = {
        a: a,
    };

    const cancelSubscriptions = liveValidate(
        values,
        {
            a: {
                validators: [aValidator],
            },
        },
        changeHandler,
    );

    a.setValue("A'");
    const changePromise = a.triggerChange();

    expect(changeHandler).not.toHaveBeenCalled();
    cancelSubscriptions();

    await changePromise;

    expect(changeHandler).not.toHaveBeenCalled();
});

test('validators in *next* level in dependecy graph is not called when subscriptions are cancelled', async () => {
    const a = new Field('A');
    const b = new Field('B');

    const aValidator = jest.fn();
    const bValidator = jest.fn();
    const changeHandler = jest.fn();

    aValidator.mockReturnValue(
        new Promise(resolve => {
            setTimeout(() => resolve(), 30);
        }),
    );
    bValidator.mockReturnValue(Promise.resolve());

    const values: { a: Field; b: Field } = {
        a: a,
        b: b,
    };

    const cancelSubscriptions = liveValidate(
        values,
        {
            a: {
                validators: [aValidator],
            },
            b: {
                dependencies: ['a'],
                validators: [bValidator],
            },
        },
        changeHandler,
    );

    a.setValue("A'");
    const changePromise = a.triggerChange();

    setTimeout(() => cancelSubscriptions(), 0);

    await changePromise;

    expect(aValidator).toHaveBeenCalled();
    expect(bValidator).not.toHaveBeenCalled();
    expect(changeHandler).not.toHaveBeenCalled();
});
