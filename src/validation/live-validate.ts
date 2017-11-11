import { Graph } from '../dependency-graph/graph';
import { ValidationAggregateError, ValidationError } from './errors';
import {
    Constraints,
    ConstraintSpecification,
    FieldObservables,
    LiveValidationChangeHandler,
    LiveValueChangeHandler,
    NodeValidationErrorHandler,
    SubscriptionCanceller,
    ValidationErrorHandler,
    Validator,
    ValueProvider,
} from './types';

import { addAllConstraints, buildDependencyMap, validationTimeout, LiveValidationChangeMap } from './utils';

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
                promises.push(value.then(v => map.set(key, v)));
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

/**
 * Return an error handler for `node`
 * which adds errors to the aggregated `errors`,
 * in context of the node.
 */
function getErrorHandlerForNode<TValues>(
    node: keyof TValues,
    changeMap: LiveValidationChangeMap<TValues>,
): NodeValidationErrorHandler {
    return (e: Error): void => {
        if (e instanceof ValidationError) {
            changeMap.addError(node, e);
            return;
        }
        throw e;
    };
}

interface ValidationNodeState {
    global: {
        subscriptionIsActive: boolean;
    };
    version: number;
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
    changeMap: LiveValidationChangeMap<TValues>,
    globalChangeCallback: LiveValidationChangeHandler<TValues, ValidationError>,
    nodeState: ValidationNodeState,
): Promise<void> {
    const validateDendencies = () => {
        return Promise.all(
            validateDependenciesFor(node, values, constraints, graph, dependencyMap, changeMap, nodeState),
        ).then(__ => undefined);
    };

    changeMap.markNodeAsChanged(node);

    // If no validation constraints is tied to the `node`
    // then opt-out early.
    // This adds a bit to the complexity of the caller,
    // in trade for a considered amount of performance.
    const constraint = constraints[node];
    if (constraint === undefined || constraint.validators === undefined) {
        // Don't proceed if subscriptions has been cancelled.
        if (!nodeState.global.subscriptionIsActive) {
            return;
        }
        // Run validation of the dependants of this node.
        return validateDendencies();
    }

    // Race for for the value.
    return Promise.race([validationTimeout(), values[node].getValue()])
        .then((value: any) => {
            // No need to proceed if subscription are canclled.
            if (!nodeState.global.subscriptionIsActive) {
                return;
            }

            // Race for the validation dependency values.
            return Promise.race([validationTimeout(), getPromisedDependencyMap(values, dependencyMap.get(node))]).then(
                (dependencies: Map<keyof TValues, any> | void) => {
                    // This check has already been made,
                    // but in async context the type checker
                    // thinks it could have been mutated in the meantime.
                    if (!nodeState.global.subscriptionIsActive || constraint.validators == null) {
                        return;
                    }

                    const dependantValidationTimeout = validationTimeout();
                    return Promise.all(
                        constraint.validators.map((validate: Validator<TValues>) => {
                            // Run the validators of the field,
                            // race all the validation for timeout.
                            return Promise.race([
                                dependantValidationTimeout,
                                validate(value, dependencies as Map<keyof TValues, any>, {}).catch(
                                    globalChangeCallback,
                                ),
                            ]);
                        }),
                    ).then(() => {
                        // Opt-out of the chain if an error has occured
                        // or
                        if (changeMap.hasErrors || !nodeState.global.subscriptionIsActive) {
                            return;
                        }

                        // Run validation of the dependants of this node.
                        return validateDendencies();
                    });
                },
            );
        }, globalChangeCallback)
        .catch(globalChangeCallback);
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
    changeMap: LiveValidationChangeMap<TValues>,
    nodeState: ValidationNodeState,
): Promise<void>[] {
    // Don't proceed if the subscriptions has been cancelled.
    if (!nodeState.global.subscriptionIsActive) {
        return [];
    }

    const promises: Promise<void>[] = [];
    const dependants = graph.immediateDependenciesOf(node);

    // loop through all immediate dependants of `node`
    // and run the validators in order.
    for (const dependant of Array.from(dependants.values())) {
        const dependantErrorsHandler = getErrorHandlerForNode(dependant, changeMap);

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
                    changeMap,
                    dependantErrorsHandler,
                    nodeState,
                ),
            );
        } else {
            // event though the dependant does not have
            // any validators, in terms of live validation
            // it should still appear in the change map.
            changeMap.markNodeAsChanged(dependant);
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
    changeMap: LiveValidationChangeMap<TValues>,
    globalChangeCallback: LiveValidationChangeHandler<TValues, ValidationError>,
    version: number,
    nodeState: ValidationNodeState,
    localChangeCallback?: (e?: any) => void,
): Promise<void> {
    return validationPromise.then(
        () => {
            if (typeof localChangeCallback === 'function') {
                if (changeMap.hasErrors) {
                    localChangeCallback(changeMap);
                } else {
                    localChangeCallback();
                }
            }

            if (version === nodeState.version && nodeState.global.subscriptionIsActive) {
                globalChangeCallback(changeMap);
            }
        },
        e => {
            if (typeof localChangeCallback === 'function') {
                localChangeCallback(e);
            }
            if (version === nodeState.version && nodeState.global.subscriptionIsActive) {
                globalChangeCallback(changeMap);
            }
        },
    );
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
    globalChangeCallback: LiveValidationChangeHandler<TValues, ValidationError>,
): SubscriptionCanceller {
    const globalState = {
        subscriptionIsActive: true,
    };

    const keys = Object.keys(nodes) as [keyof TValues];
    const graph = new Graph<keyof TValues, ConstraintSpecification<TValues> | undefined>();

    // keep track of subscriptions to make it easy to unhook change handlers.
    const subscriptions = new Map<ValueProvider, LiveValueChangeHandler>();

    keys.forEach(key => graph.addNode(key, constraints[key]));

    const dependencyMap = buildDependencyMap(constraints);
    addAllConstraints(graph, keys, dependencyMap);

    // define the generic node change handler.
    const handleChanges = (node: keyof TValues) => {
        // The internal state of validation local for this `node`.
        const currentState = {
            global: globalState,
            version: 0,
        };

        return (localChangeCallback?: (e?: any) => void) => {
            if (!globalState.subscriptionIsActive) {
                if (typeof localChangeCallback === 'function') {
                    localChangeCallback();
                }
                return;
            }

            const version = ++currentState.version;

            // instanciate the aggregated error
            // to collect all validation errors in.
            const changeMap = new LiveValidationChangeMap<TValues>();

            // create error handler for current `node`.
            const keyValidationErrorsHandler = getErrorHandlerForNode(node, changeMap);

            // retrieve the constraint for the node if any.
            const constraint = constraints[node];

            // if no constraints defined on `node`
            // run the validators of its dependencies.
            if (constraint === undefined) {
                // mark this node for change,
                // event though it has no constraints,
                // it has still changed in temrs of live validation.
                changeMap.markNodeAsChanged(node);
                const promises = validateDependenciesFor(
                    node,
                    nodes,
                    constraints,
                    graph,
                    dependencyMap,
                    changeMap,
                    currentState,
                );

                // decorate the validation promises.
                unwrapErrors(
                    Promise.all(promises),
                    changeMap,
                    globalChangeCallback,
                    version,
                    currentState,
                    localChangeCallback,
                );
            } else {
                // run the validators of the `node`.
                const validationPromise = validateNode(
                    node,
                    nodes,
                    constraints,
                    graph,
                    dependencyMap,
                    changeMap,
                    keyValidationErrorsHandler,
                    currentState,
                );

                // decorate the validation promise.
                unwrapErrors(
                    validationPromise,
                    changeMap,
                    globalChangeCallback,
                    version,
                    currentState,
                    localChangeCallback,
                );
            }
        };
    };
    // attach change listeners to all the nodes.
    // tslint:disable-next-line:forin
    for (const node of Object.keys(nodes)) {
        const valueProvider = nodes[node];
        const keyChangeHandler = handleChanges(node);
        if (keyChangeHandler != null) {
            subscriptions.set(valueProvider, keyChangeHandler);
            valueProvider.addListener('change', keyChangeHandler as any);
        }
    }

    // return the subscription canceller.
    return () => {
        // support cancelling multiple times.
        if (!globalState.subscriptionIsActive) {
            return;
        }

        globalState.subscriptionIsActive = false;

        // remove all change handlers.
        subscriptions.forEach((handler: LiveValueChangeHandler, valueProvider: ValueProvider) => {
            valueProvider.removeListener('change', handler);
        });

        return;
    };
}
