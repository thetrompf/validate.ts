/**
 * The base validation error.
 */
export class ValidationError extends Error {

}

/**
 * This error is thrown if a validation exceeds the `VALIDATION_TIMEOUT`.
 */
export class ValidationTimeoutError extends ValidationError {

}

/**
 * This error is added to the `ValidationAggregateError`
 * when the special `required` constraint is violated.
 */
export class RequiredValidationError extends ValidationError {

}

/**
 * The aggregated error to be thrown to the caller.
 */
export class ValidationAggregateError extends ValidationError {

    private _errors: Map<string, ValidationError[]>;

    public constructor() {
        super();
        this._errors = new Map();
    }

    /**
     * The number of fields with validation errors.
     */
    public get length(): number {
        return this._errors.size;
    }

    /**
     * A map from field to errors.
     */
    public get errors() {
        return this._errors;
    }

    /**
     * Add a validation error to `field`.
     */
    public add(field: string, error: ValidationError): void {
        if (this._errors.has(field)) {
            const errors = this._errors.get(field) as ValidationError[];
            errors.push(error);
        } else {
            this._errors.set(field, [error]);
        }
    }

    /**
     * A string represention of the aggregated errors.
     */
    public toString(): string {
        let result = `
Validation errors:`;

        this._errors.forEach((errors, key) => {
            result += `
  - ${key}:
    ${errors.map(e => '* ' + e.message)}`;
        });
        return result;
    }
}
