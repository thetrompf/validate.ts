/**
 * The base validation error.
 */
export class ValidationError extends Error {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}

/**
 * This error is thrown if a validation exceeds the `VALIDATION_TIMEOUT`.
 */
export class ValidationTimeoutError extends ValidationError {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, ValidationTimeoutError.prototype);
    }
}

/**
 * This error is added to the `ValidationAggregateError`
 * when the special `required` constraint is violated.
 */
export class RequiredValidationError extends ValidationError {
    constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, RequiredValidationError.prototype);
    }
}

/**
 * The aggregated error to be thrown to the caller.
 */
export class ValidationAggregateError<TValues> extends ValidationError {
    // tslint:disable-next-line:variable-name
    private _errors: Map<keyof TValues, ValidationError[]>;

    public constructor(message?: string) {
        super(message);
        Object.setPrototypeOf(this, ValidationAggregateError.prototype);
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
    public add(field: keyof TValues, error: ValidationError): void {
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
