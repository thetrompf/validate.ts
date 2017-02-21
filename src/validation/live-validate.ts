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
    SubscriptionCanceller,
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

/**
 * Return an error handler for `node`
 * which adds errors to the aggregated `errors`,
 * in context of the node.
 */
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

/**
 * Run the validators of the `node`
 * and recursive through the dependencies.
 */
async function validateNode<TValues extends FieldObservables>(
    node: keyof TValues,
    values: TValues,
    constraints: Constraints<TValues>,
    graph: Graph<keyof TValues, ConstraintSpecification<TValues> | undefined>,
    dependencyMap: Map<keyof TValues, Set<keyof TValues>>,
    errors: ValidationAggregateError<TValues>,
    errorHandler: LiveValidationErrorHandler,
): Promise<void> {

    const validateDendencies = () => {
        return Promise.all(
            validateDependenciesFor(
                node,
                values,
                constraints,
                graph,
                dependencyMap,
                errors,
            )
        ).then(__ => undefined);
    };

    // If no validation constraints is tied to the `node`
    // then opt-out early.
    // This adds a bit to the complexity of the caller,
    // in trade for a considered amount of performance.
    const constraint = constraints[node];
    if (constraint == undefined || constraint.validators == undefined) {
        // Run validation of the dependants of this node.
        return validateDendencies();
    }

    // Race for for the value.
    return Promise.race([
        validationTimeout(),
        values[node].getValue(),
    ]).then((value: any) => {

        // No need for live-validate empty values.
        if (isEmpty(value)) {
            return;
        }

        // Race for the validation dependency values.
        return Promise.race([
            validationTimeout(),
            getPromisedDependencyMap(values, dependencyMap.get(node)),
        ]).then((dependencies: Map<keyof TValues, any>) => {

            // This check has already been made,
            // but in async context the type checker
            // thinks it could have been mutated in the meantime.
            if (constraint.validators == null) {
                return;
            }

            const dependantValidationTimeout = validationTimeout();
            return Promise.all(constraint.validators.map((validate: Validator<TValues>) => {

                // Run the validators of the field,
                // race all the validation for timeout.
                return Promise.race([
                    dependantValidationTimeout,
                    validate(value, dependencies, {})
                        .catch(errorHandler),
                ]);

            })).then(() => {

                // Opt-out of the chain if an error has occured.
                if (errors.length > 0) {
                    return;
                }

                // Run validation of the dependants of this node.
                return validateDendencies();
            });
        });
    }, errorHandler)
        .catch(errorHandler);
}

/**
 * Run the validators of the dependants of the `node`.
 */
function validateDependenciesFor<TValues extends FieldObservables>(
    node: keyof TValues,
    values: TValues,
    constraints: Constraints<TValues>,
    graph: Graph<keyof TValues, ConstraintSpecification<TValues> | undefined>,
    dependencyMap: Map<keyof TValues, Set<keyof TValues>>,
    errors: ValidationAggregateError<TValues>,
): Promise<void>[] {
    const promises: Promise<void>[] = [];
    const dependants = graph.immediateDependenciesOf(node);

    // loop through all immediate dependants of `node`
    // and run the validators in order.
    for (const dependant of Array.from(dependants.values())) {
        const dependantErrorsHandler = getErrorHandlerForNode(dependant, errors);

        // validate all the nodes that has
        // validators described.
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

/**
 * Unwrap errors thrown in the chain and
 * added to the aggregated `errors`
 * and propagate the result to live validator's
 * attached error handler, if a change callback is
 * supplied to the emitted change event.
 */
function unwrapErrors<TValues>(
    validationPromise: Promise<any>,
    errors: ValidationAggregateError<TValues>,
    errorHandler: ValidationErrorHandler<TValues>,
    changeCallback?: Function,
): Promise<void> {
    return validationPromise.then(() => {
        if (errors.length !== 0) {
            errorHandler(errors);
        }

        if (changeCallback != null) {
            if (errors.length === 0) {
                changeCallback();
            } else {
                changeCallback(errors);
            }
        }
    }, (e) => {
        if (changeCallback != null) {
            changeCallback(e);
        }
    });
}

/**
 * Attach subscriptions to `nodes`
 * and call change handlers and validators according
 * to the `constraints` defined.
 *
 * If an validation error occurs
 * call the `errorHandler` with an `ValidationAggregateError`
 * containg all the errors collected in the chain.
 *
 * Note: If an error occurs, no validators
 *       that depends on the node that is invalid will be called
 *       further down the chain.
 */
export function liveValidate<TValues extends FieldObservables>(
    nodes: TValues,
    constraints: Constraints<TValues>,
    errorHandler: ValidationErrorHandler<TValues>,
): SubscriptionCanceller {
    let isSubscriptionActive = true;

    const keys = Object.keys(nodes) as [keyof TValues];
    const graph = new Graph<keyof TValues, ConstraintSpecification<TValues> | undefined>();

    // keep track of subscriptions to make it easy to unhook change handlers.
    const subsriptions = new Map<ValueProvider, LiveValueChangeHandler>();

    keys.forEach(key => graph.addNode(key, constraints[key]));

    const dependencyMap = buildDependencyMap(constraints);
    addAllConstraints(graph, keys, dependencyMap);

    // define the generic node change handler.
    const handleChanges = (node: keyof TValues) => (changeCallback?: Function) => {
        if (!isSubscriptionActive) {
            if (changeCallback != null) {
                changeCallback();
            }
            return;
        }

        // instanciate the aggregated error
        // to collect all validation errors in.
        const errors = new ValidationAggregateError<TValues>();

        // create error handler for current `node`.
        const keyValidationErrorsHandler = getErrorHandlerForNode(node, errors);

        // retrieve the constraint for the node if any.
        const constraint = constraints[node];

        // if no constraints defined on `node`
        // run the validators of its dependencies.
        if (constraint == undefined) {

            const promises = validateDependenciesFor(
                node,
                nodes,
                constraints,
                graph,
                dependencyMap,
                errors,
            );

            // decorate the validation promises.
            unwrapErrors(
                Promise.all(promises),
                errors,
                errorHandler,
                changeCallback,
            );

        } else {

            // run the validators of the `node`.
            const validationPromise = validateNode(
                node,
                nodes,
                constraints,
                graph,
                dependencyMap,
                errors,
                keyValidationErrorsHandler,
            );

            // decorate the validation promise.
            unwrapErrors(
                validationPromise,
                errors,
                errorHandler,
                changeCallback,
            );
        }
    };

    // attach change listeners to all the nodes.
    for (const node in nodes) {
        const valueProvider = nodes[node];
        const keyChangeHandler = handleChanges(node);
        subsriptions.set(valueProvider, keyChangeHandler);
        valueProvider.addListener('change', keyChangeHandler);
    }

    // return the subscription canceller.
    return () => {

        // support cancelling multiple times.
        if (!isSubscriptionActive) {
            return;
        }

        isSubscriptionActive = false;

        // remove all change handlers.
        subsriptions.forEach((handler: LiveValueChangeHandler, valueProvider: ValueProvider) => {
            valueProvider.removeListener('change', handler);
        });

        return;
    };
}
