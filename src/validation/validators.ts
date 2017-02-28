import {
    RequiredValidationError,
} from './errors';

import {
    isEmpty,
} from './utils';

export async function requiredValidator(value: any): Promise<void> {
    if (isEmpty(value)) {
        throw new RequiredValidationError('Cannot be blank');
    }
}
