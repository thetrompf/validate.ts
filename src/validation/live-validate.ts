import {
    Graph,
} from 'dependency-graph/graph';

import {
    ValidationAggregateError,
    ValidationError,
} from 'validation/errors';

import {
    Constraints,
    ConstraintSpecification,
    FieldObservables,
    LiveValueChangeHandler,
    SubscriptionAborter,
    ValidationErrorHandler,
    Validator,
    ValueProvider,
} from 'validation/types';

import {
    addAllConstraints,
    buildDependencyMap,
    isEmpty,
    validationTimeout,
} from 'validation/utils';

/**
 * Return a map with all the values of the `dependencies` resolved,
 * so they can be accessed synchronously afterwards,
 * e.g. when passed to validators.
 *
 * If `dependencies` are not provieded the return value is `undefined`.
 */
async function getPromisedDependencyMap<TValues extends FieldObservables>(
    values: TValues,
    dependencies: Set<keyof TValues> | undefined,
): Promise<Map<keyof TValues, any>> {
    if (dependencies == null) {
        return new Map();
    }

    const map = new Map<keyof TValues, any>();
    const promises: Promise<any>[] = [];

    for (const key of Array.from(dependencies.values())) {
        let value = values[key];
        if (value != null) {
            value = value.getValue();
            if (value instanceof Promise) {
                promises.push(value.then((v) => map.set(key, v)));
            } else {
                map.set(key, value);
            }
        } else {
            map.set(key, undefined);
        }
    }

    await Promise.all(promises);
    return map;
}


interface LiveValidationErrorHandler {
    (e: any): void;
}

function getErrorHandlerForNode<TValues>(
    node: keyof TValues,
    errors: ValidationAggregateError<TValues>,
): LiveValidationErrorHandler {
    return function (e: any): void {
        if (e instanceof ValidationError) {
            errors.add(node, e);
            return;
        }
        throw e;
    };
}

async function validateNode<TValues extends FieldObservables>(
    node: keyof TValues,
    values: TValues,
    constraints: Constraints<TValues>,
    graph: Graph<keyof TValues, ConstraintSpecification<TValues> | undefined>,
    dependencyMap: Map<keyof TValues, Set<keyof TValues>>,
    errors: ValidationAggregateError<TValues>,
    errorHandler: LiveValidationErrorHandler,
): Promise<void> {
    const constraint = constraints[node];
    if (constraint == undefined || constraint.validators == undefined) {
        return;
    }

    return Promise.race([
        validationTimeout(),
        values[node].getValue(),
    ]).then((value: any) => {
        if (isEmpty(value)) {
            return;
        }

        return Promise.race([
            validationTimeout(),
            getPromisedDependencyMap(values, dependencyMap.get(node)),
        ]).then((dependencies: Map<keyof TValues, any>) => {
            if (constraint.validators == null) {
                return;
            }

            const dependantValidationTimeout = validationTimeout();
            return Promise.all(constraint.validators.map((validate: Validator<TValues>) => {
                return Promise.race([
                    dependantValidationTimeout,
                    validate(value, dependencies, {})
                        .catch(errorHandler),
                ]);
            })).then(() => {
                if (errors.length > 0) {
                    return;
                }

                return Promise.all(validateDependenciesFor(
                    node,
                    values,
                    constraints,
                    graph,
                    dependencyMap,
                    errors,
                )).then(__ => undefined);
            });
        });
    }, errorHandler)
        .catch(errorHandler);
}

function validateDependenciesFor<TValues extends FieldObservables>(
    node: keyof TValues,
    values: TValues,
    constraints: Constraints<TValues>,
    graph: Graph<keyof TValues, ConstraintSpecification<TValues> | undefined>,
    dependencyMap: Map<keyof TValues, Set<keyof TValues>>,
    errors: ValidationAggregateError<TValues>,
): Promise<void>[] {
    const promises: Promise<void>[] = [];
    const dependants = graph.dependenciesOf(node);

    for (const dependant of Array.from(dependants)) {
        const dependantErrorsHandler = getErrorHandlerForNode(dependant, errors);

        const constraint = constraints[dependant];
        if (constraint && constraint.validators) {
            promises.push(
                validateNode(
                    dependant,
                    values,
                    constraints,
                    graph,
                    dependencyMap,
                    errors,
                    dependantErrorsHandler,
                )
            );
        }
    }

    return promises;
}

export function liveValidate<TValues extends FieldObservables>(
    values: TValues,
    constraints: Constraints<TValues>,
    handleErrors: ValidationErrorHandler<TValues>,
): SubscriptionAborter {
    let isSubscriptionActive = true;

    const keys = Object.keys(values) as [keyof TValues];
    const graph = new Graph<keyof TValues, ConstraintSpecification<TValues> | undefined>();
    const subsriptions = new Map<ValueProvider, LiveValueChangeHandler>();

    keys.forEach(key => graph.addNode(key, constraints[key]));

    const dependencyMap = buildDependencyMap(constraints);

    addAllConstraints(graph, keys, dependencyMap);

    const handleChanges = (key: keyof TValues) => (cb?: Function) => {
        if (!isSubscriptionActive) {
            if (cb != null) {
                cb();
            }
            return;
        }

        const errors = new ValidationAggregateError<TValues>();

        const keyValidationErrorsHandler = getErrorHandlerForNode(key, errors);

        const constraint = constraints[key];
        if (constraint == undefined) {
            const promises = validateDependenciesFor(
                key,
                values,
                constraints,
                graph,
                dependencyMap,
                errors,
            );

            Promise.all(promises).then(() => {
                if (errors.length !== 0) {
                    handleErrors(errors);
                }
                if (cb != null) {
                    if (errors.length === 0) {
                        cb();
                    } else {
                        cb(errors);
                    }
                }
            }, (e) => {
                if (cb != null) {
                    cb(e);
                }
            });

            return;
        }

        validateNode(
            key,
            values,
            constraints,
            graph,
            dependencyMap,
            errors,
            keyValidationErrorsHandler,
        ).then(() => {
            if (errors.length !== 0) {
                handleErrors(errors);
            }
            if (cb != null) {
                if (errors.length === 0) {
                    cb();
                } else {
                    cb(errors);
                }
            }
        }, (e) => {
            if (cb != null) {
                cb(e);
            }
        });
    };

    for (const key in values) {
        const valueProvider = values[key];
        const keyChangeHandler = handleChanges(key);
        subsriptions.set(valueProvider, keyChangeHandler);
        valueProvider.addListener('change', keyChangeHandler);
    }

    return () => {
        if (!isSubscriptionActive) {
            return;
        }

        isSubscriptionActive = false;

        subsriptions.forEach((handler: LiveValueChangeHandler, valueProvider: ValueProvider) => {
            valueProvider.removeListener('change', handler);
        });

        return;
    };
}
