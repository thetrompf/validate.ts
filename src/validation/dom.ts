import {
    ValidationAggregateError,
} from 'validation/errors';

import {
    Constraints,
} from 'validation/types';

export interface WrapOptions {
    feedbackSelector: string | null;
    fieldSelector: string;
    editorSelector: string;
    errorClass: string;
}

const defaultOptions: WrapOptions = {
    feedbackSelector: null, // '.validation-feedback',
    fieldSelector: '.form-field',
    editorSelector: '[name]',
    errorClass: 'has-errors',
};

export interface FormMap {
    [fieldName: string]: {
        fieldElement: Element,
        editorElement: Element | null,
        feedbackElement: Element | null,
    };
}

function createClearErrorsFn(formMap: FormMap, options: WrapOptions) {
    return () => {
        for (const field of Object.keys(formMap)) {
            const map = formMap[field];
            if (map.feedbackElement) {
                map.feedbackElement.innerHTML = '';
            }
            map.fieldElement.classList.remove(options.errorClass);
        }
    };
}

function createSetErrorsFn(formMap: FormMap, options: WrapOptions) {
    return (errors: ValidationAggregateError<FormMap>) => {
        errors.errors.forEach((validationErrors, field) => {
            formMap[field].fieldElement.classList.add(options.errorClass);
            const feedbackElement = formMap[field].feedbackElement;
            if (feedbackElement != null) {
                if (validationErrors.length > 1) {
                    feedbackElement.innerHTML = `
                        <ul>
                            <li>${validationErrors.map(e => e.message).join('</li><li>')}</li>
                        </ul>
                    `;
                } else {
                    feedbackElement.innerHTML = validationErrors[0].message as string;
                }
            }
        });
    };
}

export function getFormValidationObject(form: HTMLFormElement, options?: Partial<WrapOptions>) {
    const resolvedOptions = Object.assign({}, defaultOptions, (options || {}));
    const fieldElements = form.querySelectorAll(resolvedOptions.fieldSelector);
    if (fieldElements.length === 0) {
        throw new Error(`No form fields found with selector: ${resolvedOptions.fieldSelector}`);
    }

    const formMap: FormMap = {};
    for (const fieldElement of Array.from(fieldElements)) {
        const editorElement = fieldElement.querySelector(resolvedOptions.editorSelector);
        if (editorElement == null) {
            throw new Error(`Couldn't find editor element for ${fieldElement}`);
        }
        const fieldName = editorElement.getAttribute('name') as string;
        formMap[fieldName] = {
            fieldElement: fieldElement,
            editorElement: editorElement,
            feedbackElement: (
                resolvedOptions.feedbackSelector == null
                    ? null
                    : fieldElement.querySelector(resolvedOptions.feedbackSelector)
            ),
        };
    }

    const result = {
        clearErrors: createClearErrorsFn(formMap, resolvedOptions),
        formMap: formMap,
        setErrors: createSetErrorsFn(formMap, resolvedOptions),
    };

    Object.defineProperty(result, 'values', {
        enumerable: true,
        configurable: false,
        get: () => {
            const res = {} as any;
            for (const field of Object.keys(formMap)) {
                res[field] = (formMap[field].editorElement as HTMLInputElement).value;
            }
            return res;
        }
    });

    return result;
}
