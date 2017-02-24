import {
    ValidationAggregateError,
    ValidationError,
} from './errors';

import {
    Constraints,
    LiveValidationChangeMap,
    ValueProvider,
} from './types';

export type HTMLFormValueElement =
    | HTMLButtonElement
    | HTMLInputElement
    | HTMLOptionElement
    | HTMLOptGroupElement
    | HTMLSelectElement
    | HTMLTextAreaElement
    ;

export interface WrapOptions {
    feedbackSelector: string | null;
    fieldSelector: string;
    editorSelector: string;
    errorClass: string;
    live: boolean;
    static: boolean;
}

const defaultOptions: WrapOptions = {
    feedbackSelector: null, // '.validation-feedback',
    fieldSelector: '.form-field',
    editorSelector: '[name]',
    errorClass: 'has-errors',
    live: false,
    static: true,
};

export interface FormMap {
    [fieldName: string]: {
        fieldElement: Element,
        editorElement: HTMLFormValueElement | null,
        feedbackElement: Element | null,
        valueProvider: ValueProvider | null,
    };
}

function createClearErrorsFn(formMap: FormMap, options: WrapOptions) {
    return (field?: string) => {
        if (typeof field === 'string') {
            const map = formMap[field];
            if (map.feedbackElement) {
                map.feedbackElement.innerHTML = '';
            }
            map.fieldElement.classList.remove(options.errorClass);
        } else {
            for (const field of Object.keys(formMap)) {
                const map = formMap[field];
                if (map.feedbackElement) {
                    map.feedbackElement.innerHTML = '';
                }
                map.fieldElement.classList.remove(options.errorClass);
            }
        }
    };
}

function createStaticSetErrorsFn(formMap: FormMap, options: WrapOptions) {
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

function createLiveSetErrorsFn(formMap: FormMap, options: WrapOptions) {
    return (changeMap: LiveValidationChangeMap<FormMap, ValidationError>) => {
        changeMap.forEach((errors, field) => {
            const map = formMap[field];
            if (errors.length === 0) {
                if (map.feedbackElement) {
                    map.feedbackElement.innerHTML = '';
                }
                map.fieldElement.classList.remove(options.errorClass);
            } else {
                if (map.feedbackElement) {
                    map.feedbackElement.innerHTML = `
                        <ul>
                            <li>${errors.map(e => e.message).join('</li><li>')}</li>
                        </ul>
                    `;
                }
                map.fieldElement.classList.add(options.errorClass);
            }
        });
    };
}


export function createValueProvider(editor: HTMLFormValueElement): ValueProvider {
    return {
        getValue: (): any => {
            return editor.value;
        },
        addListener: (event: string, ...args: any[]) => {
            args.unshift(event === 'change' ? 'input' : event);
            editor.addEventListener.call(editor, ...args);
        },
        removeListener: (event: string, ...args: any[]) => {
            args.unshift(event === 'change' ? 'input' : event);
            editor.removeEventListener.call(editor, ...args);
        },
    };
}

export function getFormValidationObject(form: HTMLFormElement, options?: Partial<WrapOptions>) {
    const resolvedOptions = Object.assign({}, defaultOptions, (options || {}));

    if (!resolvedOptions.static && !resolvedOptions.live) {
        throw new Error('No validation mode enabled');
    }

    const fieldElements = form.querySelectorAll(resolvedOptions.fieldSelector);
    if (fieldElements.length === 0) {
        throw new Error(`No form fields found with selector: ${resolvedOptions.fieldSelector}`);
    }

    const formMap: FormMap = {};
    for (const fieldElement of Array.from(fieldElements)) {
        const editorElement = fieldElement.querySelector(resolvedOptions.editorSelector) as HTMLFormValueElement;
        if (editorElement == null) {
            throw new Error(`Couldn't find editor element for ${fieldElement}`);
        }
        const fieldName = editorElement.getAttribute('name') as string;
        formMap[fieldName] = {
            editorElement: editorElement,
            feedbackElement: (
                resolvedOptions.feedbackSelector == null
                    ? null
                    : fieldElement.querySelector(resolvedOptions.feedbackSelector)
            ),
            fieldElement: fieldElement,
            valueProvider: resolvedOptions.live ? createValueProvider(editorElement) : null,
        };
    }

    const result = {
        clearErrors: createClearErrorsFn(formMap, resolvedOptions),
        formMap: formMap,
        setStaticErrors: resolvedOptions.static
            ? createStaticSetErrorsFn(formMap, resolvedOptions)
            : null,
        setLiveErrors: resolvedOptions.live
            ? createLiveSetErrorsFn(formMap, resolvedOptions)
            : null,
    };

    if (resolvedOptions.static) {
        Object.defineProperty(result, 'values', {
            enumerable: true,
            configurable: false,
            get: () => {
                const res = {} as any;
                for (const field of Object.keys(formMap)) {
                    res[field] = (formMap[field].editorElement as HTMLFormValueElement).value;
                }
                return res;
            }
        });
    }

    if (resolvedOptions.live) {
        Object.defineProperty(result, 'valueProviders', {
            enumerable: true,
            configurable: false,
            get: () => {
                const res = {} as any;
                for (const field of Object.keys(formMap)) {
                    res[field] = formMap[field].valueProvider;
                }
                return res;
            }
        });
    }

    return result;
}
