import { GraphCycleError } from 'dependency-graph/errors';
import { ValidationAggregateError, ValidationError, ValidationTimeoutError } from 'validation/errors';
import { VALIDATION_TIMEOUT } from 'validation/utils';
import { validate } from 'validation/validate';
import { requiredValidator } from 'validation/validators';

test('simple call to public interface with empty value and empty constraints', async () => {
    const result = await validate({}, {});
    expect(result).toBeUndefined();
});

test('a required field filled out passes', async () => {
    const result = await validate(
        { field: 'has-value' },
        {
            field: {
                validators: [requiredValidator],
            },
        },
    );
    expect(result).toBeUndefined();
});

test.only('a required field fails when it is null', async () => {
    expect.assertions(2);
    try {
        await validate(
            { field: null },
            {
                field: {
                    validators: [requiredValidator],
                },
            },
        );
    } catch (e) {
        expect(e).toBeInstanceOf(ValidationAggregateError);
        expect(e.length).toEqual(1);
    }
});

test('a required field fails when it is an empty string', async () => {
    expect.assertions(2);
    try {
        await validate(
            { field: '' },
            {
                field: {
                    validators: [requiredValidator],
                },
            },
        );
    } catch (e) {
        expect(e).toBeInstanceOf(ValidationAggregateError);
        expect(e.length).toEqual(1);
    }
});

test('a required field only contains whitespace fails', async () => {
    expect.assertions(2);
    try {
        await validate(
            { field: '    ' },
            {
                field: {
                    validators: [requiredValidator],
                },
            },
        );
    } catch (e) {
        expect(e).toBeInstanceOf(ValidationAggregateError);
        expect(e.length).toEqual(1);
    }
});

test('a field that fails a simple validator throws', async () => {
    expect.assertions(2);
    try {
        await validate(
            { field: '23' },
            {
                field: {
                    validators: [
                        async (value: any) => {
                            if (typeof value !== 'number') {
                                throw new ValidationError('Must be a number');
                            }
                        },
                    ],
                },
            },
        );
    } catch (e) {
        expect(e).toBeInstanceOf(ValidationAggregateError);
        expect(e.length).toEqual(1);
    }
});

test('a single field with multiple failing validators', async () => {
    expect.assertions(5);
    try {
        await validate(
            { field: 23 },
            {
                field: {
                    validators: [
                        async (value: any) => {
                            throw new ValidationError('fail 1');
                        },
                        async (value: any) => {
                            throw new ValidationError('fail 2');
                        },
                    ],
                },
            },
        );
    } catch (e) {
        expect(e).toBeInstanceOf(ValidationAggregateError);
        const aggError = e as any;
        expect(aggError.length).toEqual(1);
        expect(aggError.errors.get('field').length).toEqual(2);
        expect(aggError.errors.get('field')[0].message).toEqual('fail 1');
        expect(aggError.errors.get('field')[1].message).toEqual('fail 2');
    }
});

test('validators of a field are called when its value is empty', async () => {
    const validator = jest.fn();
    validator.mockReturnValue(Promise.resolve(null));
    const result = await validate(
        { field: null },
        {
            field: {
                validators: [validator],
            },
        },
    );
    expect(result).toBeUndefined();
    expect(validator).toHaveBeenCalledWith(null, undefined, {});
});

test('validators of a required field is called when field is empty', async () => {
    expect.assertions(2);
    try {
        await validate(
            { field: null },
            {
                field: {
                    validators: [
                        async (value: any) => {
                            throw new ValidationError('fail');
                        },
                    ],
                },
            },
        );
    } catch (e) {
        expect(e).toBeInstanceOf(ValidationAggregateError);
        const aggError = e as any;
        expect(aggError.length).toEqual(1);
    }
});

test('a validator that exceeds timeout throws', async () => {
    expect.assertions(3);
    try {
        await validate(
            { field: 'value' },
            {
                field: {
                    validators: [
                        async (value: any) => {
                            return new Promise<void>((resolve, reject) => {
                                setTimeout(resolve, VALIDATION_TIMEOUT + 1000);
                            });
                        },
                    ],
                },
            },
        );
    } catch (e) {
        expect(e).toBeInstanceOf(ValidationAggregateError);
        const aggError = e as any;
        expect(aggError.length).toEqual(1);
        expect(aggError.errors.get('field')[0]).toBeInstanceOf(ValidationTimeoutError);
    }
});

test('a non validation error thrown is not wrapped in ValidationAggregateError', async () => {
    expect.assertions(3);
    try {
        await validate(
            { field: 'value' },
            {
                field: {
                    validators: [
                        async (value: any) => {
                            throw new Error('A non validation error');
                        },
                    ],
                },
            },
        );
    } catch (e) {
        expect(e).not.toBeInstanceOf(ValidationAggregateError);
        expect(e).toBeInstanceOf(Error);
        const error = e as Error;
        expect(e.message).toEqual('A non validation error');
    }
});

test('async values is resolved before passed as dependency value', async () => {
    expect.assertions(1);
    await validate(
        {
            field1: new Promise((resolve, reject) => {
                setTimeout(() => resolve('test1'), 100);
            }),
            field2: 'test2',
        },
        {
            field2: {
                dependencies: ['field1'],
                validators: [
                    async (value: any, dependencies: any) => {
                        expect(dependencies.get('field1')).toEqual('test1');
                    },
                ],
            },
        },
    );
});

test('dependencies is passed to the validator', async () => {
    expect.assertions(1);
    await validate(
        {
            field1: 'test1',
            field2: 'test2',
        },
        {
            field2: {
                dependencies: ['field1'],
                validators: [
                    async (value: any, dependencies: any) => {
                        expect(dependencies.get('field1')).toEqual('test1');
                    },
                ],
            },
        },
    );
});

test('async values are resolved before passed to validators', async () => {
    expect.assertions(1);
    await validate(
        {
            field1: new Promise((resolve, reject) => {
                setTimeout(() => resolve('test1'), 100);
            }),
        },
        {
            field1: {
                validators: [
                    async (value: any) => {
                        expect(value).toEqual('test1');
                    },
                ],
            },
        },
    );
});

test('creating a cycle in depencies throws', async () => {
    expect.assertions(2);
    try {
        await validate(
            {
                a: 'A',
                b: 'B',
                c: 'C',
            },
            {
                a: {
                    dependencies: ['c'],
                },
                b: {
                    dependencies: ['a'],
                },
                c: {
                    dependencies: ['b'],
                },
            },
        );
    } catch (e) {
        expect(e).toBeInstanceOf(GraphCycleError);
        expect(e.cycle).toEqual(['a', 'b', 'c', 'a']);
    }
});
