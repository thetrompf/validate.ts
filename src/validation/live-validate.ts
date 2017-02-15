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
async function getPromisedDependencyMap<T>(values: FieldObservables, dependencies: Set<keyof T> | undefined): Promise<Map<keyof T, any> | undefined> {
    if (dependencies == null) {
        return undefined;
    }

    const map = new Map<keyof T, any>();
    const promises: Promise<any>[] = [];

    for (const key of dependencies) {
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

export function liveValidate<T extends FieldObservables>(values: T, constraints: Constraints<T>, handleErrors: ValidationErrorHandler<T>): SubscriptionAborter {
    let isSubscriptionActive = true;

    const keys = Object.keys(values) as [keyof T];
    const graph = new Graph<keyof T, ConstraintSpecification<T> | undefined>();
    const subsriptions = new Map<ValueProvider, LiveValueChangeHandler>();

    keys.forEach(key => graph.addNode(key, constraints[key]));

    const dependencyMap = buildDependencyMap(constraints);

    addAllConstraints(graph, keys, dependencyMap);

    const handleChanges = (key: keyof T) => (cb?: Function) => {
        if (!isSubscriptionActive) {
            if (cb != null) {
                cb();
            }
            return;
        }

        const constraint = constraints[key];
        if (constraint == undefined) {
            return;
        }

        const errors = new ValidationAggregateError<T>();

        const keyValidationErrorsHandler = (e: any) => {
            if (e instanceof ValidationError) {
                errors.add(key, e);
                return;
            }
            throw e;
        };

        const value = Promise.race([
            validationTimeout(),
            values[key].getValue(),
        ]).then((value: any) => {
            if (isEmpty(value)) {
                return;
            } else if (constraint.validators != null) {
                return Promise.race([
                    validationTimeout(),
                    getPromisedDependencyMap<T>(values, dependencyMap.get(key)),
                ]).then((dependencies: Map<keyof T, any>): any => {
                    if (constraint.validators == null) {
                        return;
                    }

                    const keyValidationTimeout = validationTimeout();

                    return Promise.all(constraint.validators.map((validator: Validator<T>) => {
                        return Promise.race([
                            keyValidationTimeout,
                            validator(value, dependencies, {})
                                .catch(keyValidationErrorsHandler),
                        ]);
                    }));
                });
            } else {
                graph.dependantsOf(key);
            }
        }, keyValidationErrorsHandler)
            .catch(keyValidationErrorsHandler)
        .then(() => {
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

    for (const key in constraints) {
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
