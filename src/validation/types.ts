import {
    EventEmitter,
} from 'events';

import {
    ValidationAggregateError,
} from 'validation/errors';

/**
 * The interface of a validator function.
 */
export interface Validator<T> {
    (value: any, dependencies: Map<keyof T, any>, options: any): Promise<void>;
}

/**
 * The interface for field values to validate.
 */
export interface FieldValuesObject {
    [key: string]: any;
}

/**
 * The interface/options for constraints.
 */
export interface ConstraintSpecification<T> {

    /**
     * A list of identifiers to depend on.
     */
    dependencies?: [keyof T];

    /**
     * Mark that the field must have a non-empty value
     */
    required?: boolean;

    /**
     * A list of validators to run against the field value
     */
    validators?: Validator<T>[];
}

export type Constraints<T> = {
    // tslint:disable-next-line:semicolon
    [P in keyof T]?: ConstraintSpecification<T>;
};

export interface NodeValidationErrorHandler {
    (e: any): void;
}

export interface LiveValidationChangeMap<TValues, TError> {
    addError(node: keyof TValues, error: TError): void;
    entries(): IterableIterator<[keyof TValues, TError[]]>;
    forEach(
        callbackFn: (
            value: TError[],
            key: keyof TValues,
            map: Map<keyof TValues, TError[]>,
        ) => void,
        thisArg?: any
    ): void;
    getErrorsForNode(node: keyof TValues): TError[] | undefined;
    getAllErrors(): Map<keyof TValues, TError[]>;
    readonly hasErrors: boolean;
    keys(): IterableIterator<keyof TValues>;
    markNodeAsChanged(node: keyof TValues): void;
    values(): IterableIterator<TError[]>;
    toString(): string;
}


export interface LiveValidationChangeHandler<TValues, TError> {
    (e: LiveValidationChangeMap<TValues, TError>): void;
}

export interface ValueProvider extends EventEmitter {
    getValue(): any;
}

export interface FieldObservables {
    [field: string]: ValueProvider;
}

export interface SubscriptionCanceller {
    (): void;
}

export interface ValidationErrorHandler<T> {
    (e: ValidationAggregateError<T>): void;
}

export interface LiveValueChangeHandler {
    (): void;
}
