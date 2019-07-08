import { EventEmitter } from 'events';
import { ValidationAggregateError } from './errors';

/**
 * The interface of a validator function.
 */
export type Validator<T> = (value: any, dependencies: Map<keyof T, any>, options: any) => Promise<void>;

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
     * A list of validators to run against the field value
     */
    validators?: Validator<T>[];
}

/**
 * A map of constraints to hold up against `TValues`.
 */
export type Constraints<TValues> = {
    // tslint:disable-next-line:semicolon
    [P in keyof TValues]?: ConstraintSpecification<TValues>;
};

/**
 * The interface of both validation and non-validation
 * errors that occurs during validation of a single node.
 */
export type NodeValidationErrorHandler = (e: any) => void;

export interface ILiveValidationChangeMap<TValues, TError> {
    readonly hasErrors: boolean;
    addError(node: keyof TValues, error: TError): void;
    entries(): IterableIterator<[keyof TValues, TError[]]>;
    forEach(
        callbackFn: (value: TError[], key: keyof TValues, map: Map<keyof TValues, TError[]>) => void,
        thisArg?: any,
    ): void;
    getAllErrors(): Map<keyof TValues, TError[]>;
    getErrorsForNode(node: keyof TValues): TError[] | undefined;
    keys(): IterableIterator<keyof TValues>;
    markNodeAsChanged(node: keyof TValues): void;
    toString(): string;
    values(): IterableIterator<TError[]>;
}

export type LiveValidationChangeHandler<TValues, TError> = (e: ILiveValidationChangeMap<TValues, TError>) => void;

export interface ValueProvider {
    addListener(event: string, callback: (cb?: (e: any) => void) => void): void;
    getValue(): any;
    removeListener(event: string, callback: (cb?: (e: any) => void) => void): void;
}

export interface FieldObservables {
    [field: string]: ValueProvider;
}

/**
 * This interface represents the function returned from
 * `liveValidate` to cancelled the current subscription.
 */
export type SubscriptionCanceller = () => void;

export type ValidationErrorHandler<T> = (e: ValidationAggregateError<T>) => void;

export type LiveValueChangeHandler = () => void;
