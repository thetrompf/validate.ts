import { ValidationAggregateError, ValidationError } from './errors';
import { Constraints, LiveValidationChangeMap, ValueProvider } from './types';

export type HTMLFormValueElement =
    | HTMLButtonElement
    | HTMLInputElement
    | HTMLOptionElement
    | HTMLOptGroupElement
    | HTMLSelectElement
    | HTMLTextAreaElement;

export interface WrapOptions {
    editorSelector: string;
    errorClass: string;
    feedbackSelector: string | null;
    fieldSelector: string;
    live: boolean;
    // tslint:disable-next-line:no-reserved-keywords
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
        editorElement: HTMLFormValueElement | null;
        feedbackElement: Element | null;
        fieldElement: Element;
        valueProvider: ValueProvider | null;
    };
}

function createClearErrorsFn(formMap: FormMap, options: WrapOptions) {
    return (field?: string) => {
        if (typeof field === 'string') {
            const map = formMap[field];
            if (map.feedbackElement) {
                // tslint:disable-next-line:no-inner-html
                map.feedbackElement.innerHTML = '';
            }
            map.fieldElement.classList.remove(options.errorClass);
        } else {
            for (const f of Object.keys(formMap)) {
                const map = formMap[f];
                if (map.feedbackElement) {
                    // tslint:disable-next-line:no-inner-html
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
                switch (validationErrors.length) {
                    case 1:
                        // tslint:disable-next-line:no-inner-html
                        feedbackElement.innerHTML = escapeHtml(validationErrors[0].message);
                        break;
                    default:
                        // tslint:disable-next-line:no-inner-html
                        feedbackElement.innerHTML = `
                            <ul>
                                <li>${validationErrors.map(e => escapeHtml(e.message)).join('</li><li>')}</li>
                            </ul>
                        `;
                        break;
                }
            }
        });
    };
}

function escapeHtml(content?: string): string {
    if (content == null) {
        return '';
    }

    const text = document.createTextNode(content);
    const div = document.createElement('div');
    div.appendChild(text);

    return div.innerHTML;
}

function createLiveSetErrorsFn(formMap: FormMap, options: WrapOptions) {
    return (changeMap: LiveValidationChangeMap<FormMap, ValidationError>) => {
        changeMap.forEach((errors, field) => {
            const map = formMap[field];
            switch (errors.length) {
                case 0:
                    if (map.feedbackElement) {
                        // tslint:disable-next-line:no-inner-html
                        map.feedbackElement.innerHTML = '';
                    }
                    map.fieldElement.classList.remove(options.errorClass);
                    break;
                case 1:
                    if (map.feedbackElement) {
                        // tslint:disable-next-line:no-inner-html
                        map.feedbackElement.innerHTML = escapeHtml(errors[0].message);
                    }
                    map.fieldElement.classList.add(options.errorClass);
                    break;
                default:
                    if (map.feedbackElement) {
                        // tslint:disable-next-line:no-inner-html
                        map.feedbackElement.innerHTML = `
                            <ul>
                                <li>${errors.map(e => escapeHtml(e.message)).join('</li><li>')}</li>
                            </ul>
                        `;
                    }
                    map.fieldElement.classList.add(options.errorClass);
                    break;
            }
        });
    };
}

export function createValueProvider(editor: HTMLFormValueElement): ValueProvider {
    return {
        addListener: (event: string, ...args: any[]) => {
            args.unshift(event === 'change' ? 'input' : event);
            editor.addEventListener.call(editor, ...args);
        },
        getValue: (): any => {
            return editor.value;
        },
        removeListener: (event: string, ...args: any[]) => {
            args.unshift(event === 'change' ? 'input' : event);
            editor.removeEventListener.call(editor, ...args);
        },
    };
}

export function getFormValidationObject(form: HTMLFormElement, options?: Partial<WrapOptions>) {
    const resolvedOptions = Object.assign({}, defaultOptions, options || {});

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
            feedbackElement:
                resolvedOptions.feedbackSelector == null
                    ? null
                    : fieldElement.querySelector(resolvedOptions.feedbackSelector),
            fieldElement: fieldElement,
            valueProvider: resolvedOptions.live ? createValueProvider(editorElement) : null,
        };
    }

    const result = {
        clearErrors: createClearErrorsFn(formMap, resolvedOptions),
        formMap: formMap,
        setLiveErrors: resolvedOptions.live ? createLiveSetErrorsFn(formMap, resolvedOptions) : null,
        setStaticErrors: resolvedOptions.static ? createStaticSetErrorsFn(formMap, resolvedOptions) : null,
    };

    if (resolvedOptions.static) {
        Object.defineProperty(result, 'values', {
            configurable: false,
            enumerable: true,
            get: () => {
                const res = {} as any;
                for (const field of Object.keys(formMap)) {
                    res[field] = (formMap[field].editorElement as HTMLFormValueElement).value;
                }
                return res;
            },
        });
    }

    if (resolvedOptions.live) {
        Object.defineProperty(result, 'valueProviders', {
            configurable: false,
            enumerable: true,
            get: () => {
                const res = {} as any;
                for (const field of Object.keys(formMap)) {
                    res[field] = formMap[field].valueProvider;
                }
                return res;
            },
        });
    }

    return result;
}
