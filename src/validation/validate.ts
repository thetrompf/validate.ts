import { Graph } from '../dependency-graph/graph';
import { ValidationAggregateError, ValidationError } from './errors';
import { Constraints, ConstraintSpecification, FieldValuesObject, Validator } from './types';

import { addAllConstraints, buildDependencyMap, getPromisedDependencyMap, promisify, validationTimeout } from './utils';

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
export async function validate<T extends FieldValuesObject>(values: T, constraints: Constraints<T>): Promise<void> {
    const keys = Object.keys(values) as [keyof T];
    const errors = new ValidationAggregateError<T>();
    const promises: Promise<any>[] = [];

    // Create dependency graph.
    const graph = new Graph<keyof T, ConstraintSpecification<T> | undefined>();

    // Add all nodes.
    keys.forEach(k => graph.addNode(k, constraints[k]));

    // Map all constraints with dependencies,
    // in order for easier building the graph,
    // and resolve the asynchronous dependencies later on.
    const dependencyMap = buildDependencyMap(constraints);

    addAllConstraints(graph, keys, dependencyMap);

    const handleValidationErrors = (key: keyof T) => (e: any) => {
        if (e instanceof ValidationError) {
            errors.add(key, e);
            return;
        }
        throw e;
    };

    // Loop through the dependency graph in a resolved execution path.
    for (const key of Array.from(graph.overallOrder().values())) {
        const constraint = constraints[key];
        if (constraint !== undefined) {
            // Create error handler for this `key`.
            const keyValidationErrorsHandler = handleValidationErrors(key);

            // Wrap asynchronous value in a promise
            // to normalize the handling of values.
            const value = promisify(values[key as keyof typeof values]);

            // Push the `key` resolution promise
            // to the list of the overall resolution,
            // for waiting the whole result at the end.
            promises.push(
                Promise.race([validationTimeout(), value])
                    .then((val: any) => {
                        if (constraint.validators) {
                            // Retrieve resolved dependencies to use in the validators.
                            return Promise.race([
                                validationTimeout(),
                                getPromisedDependencyMap<T>(values, dependencyMap.get(key)),
                            ]).then((dependencies: Map<keyof T, any> | void): any => {
                                // Run all validators, and race with the timeout.
                                if (constraint.validators == null) {
                                    return;
                                }

                                // Create a single validation timeout promise per key
                                // to share for all validations on a single key.
                                const keyValidationTimeout = validationTimeout();

                                // Run all validators and resolve when all validators are completed.
                                return Promise.all(
                                    constraint.validators.map((validator: Validator<T>) => {
                                        return Promise.race([
                                            keyValidationTimeout,
                                            validator(val, dependencies as Map<keyof T, any>, {})
                                                // Handle the validation error up front
                                                // and add it to the aggregated error.
                                                .catch(keyValidationErrorsHandler),
                                        ]);
                                    }),
                                );
                            });
                        }

                        // Setup error handling to pick up
                        // timeout errors and dependency resolution errors,
                        // but appropiately rethrow non-related graph
                        // and `legal` validation errors.
                    }, keyValidationErrorsHandler)
                    .catch(keyValidationErrorsHandler),
            );
        }
    }

    // Await all asynchronous work.
    await Promise.all(promises);

    // Throw the aggregated error
    // any if validation errors was picked up.
    if (errors.length > 0) {
        throw errors;
    }

    return;
}
