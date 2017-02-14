import {
    Field,
    FieldAsync,
} from '../__mocks__/live-validate-fields';

import {
    liveValidate,
} from '../live-validate';

test.skip('live validators are called when field emits change', async () => {
    expect.assertions(1);
    const field1 = new Field('value1');

    liveValidate({
        field1: field1,
    }, {
        field1: {
            validators: [
                async (value: any, dependencies: Map<string, any>): Promise<void> => {
                    expect(value).toEqual('value2');
                },
            ],
        },
    }, (errors) => {
        console.log(errors);
    });

    field1.setValue('value2');
    field1.emit('change');

    return new Promise((resolve, reject) => {
        setTimeout(resolve, 100);
    });
});
