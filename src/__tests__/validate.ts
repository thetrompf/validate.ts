import {
    GraphCycleError,
} from '../dependency-graph';

import {
    ValidationAggregateError,
    validate,
    ValidationError,
    ValidationTimeoutError,
    VALIDATION_TIMEOUT,
} from '../validate';

test('simple call to public interface with empty value and empty constraints', async () => {
    const result = await validate({}, {});
    expect(result).toBeUndefined();
});

test('a required field filled out passes', async () => {
    const result = await validate(
        {field: 'has-value'},
        {field: {
            required: true,
        }}
    );
    expect(result).toBeUndefined();
});

test('a required field fails when it is null', async () => {
    let failed = false;

    try {
        await validate(
            {field: null},
            {field: {
                required: true
            }}
        );
    } catch (e) {
        failed = true;
        expect(e).toBeInstanceOf(ValidationAggregateError);
        expect(e.length).toEqual(1);
    }

    expect(failed).toBe(true);
});

test('a required field fails when it is an empty string', async () => {
    let failed = false;

    try {
        await validate(
            {field: ''},
            {field: {
                required: true
            }}
        );
    } catch(e) {
        failed = true;
        expect(e).toBeInstanceOf(ValidationAggregateError);
        expect(e.length).toEqual(1);
    }

    expect(failed).toBe(true);
});

test('a required field only contains whitespace fails', async () => {
    let failed = false;

    try {
        await validate(
            {field: '    '},
            {field: {
                required: true
            }}
        );
    } catch(e) {
        failed = true;
        expect(e).toBeInstanceOf(ValidationAggregateError);
        expect(e.length).toEqual(1);
    }

    expect(failed).toBe(true);
});

test('a field that fails a simple validator throws', async () => {
    let failed = false;

    try {
        await validate(
            {field: '23'},
            {field: {
                validators: [
                    async (value: any) => {
                        if(typeof value !== 'number') {
                            throw new ValidationError('Must be a number');
                        }
                    }
                ]
            }}
        );
    } catch(e) {
        failed = true;
        expect(e).toBeInstanceOf(ValidationAggregateError);
        expect(e.length).toEqual(1);
    }

    expect(failed).toBe(true);
});

test('a single field with multiple failing validators', async () => {
    let failed = false;

    try {
        await validate(
            {field: 23},
            {field: {
                validators: [
                    async (value: any) => {throw new ValidationError('fail 1');},
                    async (value: any) => {throw new ValidationError('fail 2');},
                ]
            }}
        );
    } catch(e) {
        failed = true;
        expect(e).toBeInstanceOf(ValidationAggregateError);
        const aggError = e as ValidationAggregateError;
        expect(aggError.length).toEqual(1);
        expect(aggError.errors.get('field').length).toEqual(2);
        expect(aggError.errors.get('field')[0].message).toEqual('fail 1');
        expect(aggError.errors.get('field')[1].message).toEqual('fail 2');
    }

    expect(failed).toBe(true);
});

test('validators of a field are not called when its value is empty', async () => {
    const result = await validate(
        {field: null},
        {field: {
            validators: [
                async (value: any) => {throw new ValidationError('fail');}
            ]
        }}
    );
    expect(result).toBeUndefined();
});

test('validators of a required field is called when field is empty', async () => {
    let failed = false;

    try {
        await validate(
            {field: null},
            {field: {
                required: true,
                validators: [
                    async (value: any) => {throw new ValidationError('fail');}
                ]
            }}
        );
    } catch(e) {
        failed = true;
        expect(e).toBeInstanceOf(ValidationAggregateError);
        const aggError = e as ValidationAggregateError;
        expect(aggError.length).toEqual(1);
    }

    expect(failed).toBe(true);
});

test('a validator that exceeds timeout throws', async () => {
    let failed = false;

    try {
        await validate(
            {field: 'value'},
            {field: {
                validators: [
                    async (value: any) => {
                        return new Promise<void>((resolve, reject) => {
                            setTimeout(resolve, VALIDATION_TIMEOUT+1000);
                        });
                    }
                ]
            }}
        );
    } catch (e) {
        failed = true;
        expect(e).toBeInstanceOf(ValidationAggregateError);
        const aggError = e as ValidationAggregateError;
        expect(aggError.length).toEqual(1);
        expect(aggError.errors.get('field')[0]).toBeInstanceOf(ValidationTimeoutError);
    }

    expect(failed).toBe(true);
});

test('a non validation error thrown is not wrapped in ValidationAggregateError', async () => {
    let failed = false;

    try {
        await validate(
            {field: 'value'},
            {field: {
                validators: [
                    async (value) => { throw new Error('A non validation error'); }
                ]
            }}
        )
    } catch(e) {
        failed = true;
        expect(e).not.toBeInstanceOf(ValidationAggregateError);
        expect(e).toBeInstanceOf(Error);
        const error = e as Error;
        expect(e.message).toEqual('A non validation error');
    }

    expect(failed).toBe(true);
});


test('async values is resolved before passed as dependency value', async () => {
    let executed = false;

    await validate(
        {
            field1: new Promise((resolve, reject) => {
                setTimeout(() => resolve('test1'), 100);
            }),
            field2: 'test2',
        },
        {
            field2: {
                dependencies: [
                    'field1',
                ],
                validators: [
                    async (value, dependencies) => {
                        executed = true;
                        expect(dependencies.get('field1')).toEqual('test1');
                    },
                ],
            }
        }
    );

    expect(executed).toBe(true);
});

test('dependencies is passed to the validator', async () => {
    let executed = false;
    
    await validate(
        {
            field1: 'test1',
            field2: 'test2',
        },
        {
            field2: {
                dependencies: [
                    'field1',
                ],
                validators: [
                    async (value, dependencies) => {
                        executed = true;
                        expect(dependencies.get('field1')).toEqual('test1');
                    },
                ],
            },
        },
    );

    expect(executed).toBe(true);
});

test('async values are resolved before passed to validators', async () => {
    let executed = false;

    await validate(
        {
            field1: new Promise((resolve, reject) => {
                setTimeout(() => resolve('test1'), 100);
            }),
        },
        {
            field1: {
                validators: [
                    async (value) => {
                        executed = true;
                        expect(value).toEqual('test1');
                    },
                ]
            }
        }
    );

    expect(executed).toBe(true);
});

test('creating a cycle in depencies throws', async () => {
    let failed = false;
    try {
        await validate(
            {
                a: 'A',
                b: 'B',
                c: 'C',
            },{
                a: {
                    dependencies: ['c'],
                },
                b: {
                    dependencies: ['a'],
                },
                c: {
                    dependencies: ['b'],
                },
            }
        );
    } catch (e) {
        failed = true;
        expect(e).toBeInstanceOf(GraphCycleError);
        expect(e.cycle).toEqual(['a', 'b', 'c', 'a']);
    }
    expect(failed).toBe(true);
});
