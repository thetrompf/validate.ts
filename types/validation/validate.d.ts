import { Constraints, FieldValuesObject } from 'validation/types';
/**
 * Validate `values` against the `constraints` specification.
 *
 * If one or more values don't comply with the `constraints`,
 * an `AggregateError` is thrown containing the all the `ValidationError`s
 * in the validation process.
 *
 * If a single validator exceeds the `VALIDATION_TIMEOUT`
 * a `ValidationTimeoutError` is thrown.
 */
export declare function validate<T extends FieldValuesObject>(values: T, constraints: Constraints<T>): Promise<void>;
