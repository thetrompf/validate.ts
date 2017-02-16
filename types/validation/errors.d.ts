/**
 * The base validation error.
 */
export declare class ValidationError extends Error {
}
/**
 * This error is thrown if a validation exceeds the `VALIDATION_TIMEOUT`.
 */
export declare class ValidationTimeoutError extends ValidationError {
}
/**
 * This error is added to the `ValidationAggregateError`
 * when the special `required` constraint is violated.
 */
export declare class RequiredValidationError extends ValidationError {
}
/**
 * The aggregated error to be thrown to the caller.
 */
export declare class ValidationAggregateError<TValues> extends ValidationError {
    private _errors;
    constructor();
    /**
     * The number of fields with validation errors.
     */
    readonly length: number;
    /**
     * A map from field to errors.
     */
    readonly errors: Map<keyof TValues, ValidationError[]>;
    /**
     * Add a validation error to `field`.
     */
    add(field: keyof TValues, error: ValidationError): void;
    /**
     * A string represention of the aggregated errors.
     */
    toString(): string;
}
