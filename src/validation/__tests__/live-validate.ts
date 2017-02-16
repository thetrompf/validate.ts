import {
    Field,
    FieldAsync,
} from 'validation/__mocks__/live-fields';

import {
    liveValidate,
} from 'validation/live-validate';

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
