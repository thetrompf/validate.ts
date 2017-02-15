import {
    Graph,
} from 'dependency-graph/graph';

import {
    ValidationTimeoutError,
} from 'validation/errors';

import {
    Constraints,
    FieldValuesObject,
} from 'validation/types';

/**
 * Add `dependencies` as outgoing edges from `node` in the `graph`.
 *
 * If `dependencies` are `undefined` this function is a no-op.
 */
export function addConstraints<K, V>(graph: Graph<K, V>, node: K, dependencies: Set<K> | undefined): void {
    if (dependencies == null) {
        return;
    }
    dependencies.forEach(d => graph.addDependency(d, node));
}

/**
 * Add all the constraints from the `dependencyMap` to the `nodes` in the `graph`.
 */
export function addAllConstraints<K, V>(graph: Graph<K, V>, nodes: K[], dependencyMap: Map<K, Set<K>>): void {
    nodes.forEach(n => addConstraints(graph, n, dependencyMap.get(n)));
}

/**
 * Map all constraints with dependencies,
 * in order for easier building the graph,
 * and resolve the asynchronous dependencies later on.
 */
export function buildDependencyMap<T>(constraints: Constraints<T>): Map<keyof T, Set<keyof T>> {
    const dependencyMap = new Map<keyof T, Set<keyof T>>();
    for (const key in constraints) {
        const nodeConstraint = constraints[key];
        if (nodeConstraint && nodeConstraint.dependencies != null) {
            dependencyMap.set(key, new Set<keyof T>(nodeConstraint.dependencies));
        }
    }
    return dependencyMap;
}

/**
 * Return a map with all the values of the `dependencies` resolved,
 * so they can be accessed synchronously afterwards,
 * e.g. when passed to validators.
 *
 * If `dependencies` are not provieded the return value is `undefined`.
 */
export async function getPromisedDependencyMap<T>(values: FieldValuesObject, dependencies: Set<keyof T> | undefined): Promise<Map<keyof T, any> | undefined> {
    if (dependencies == null) {
        return undefined;
    }

    const map = new Map<keyof T, any>();
    const promises: Promise<any>[] = [];

    for (const key of dependencies) {
        const value = values[key];
        if (value != null) {
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

/**
 * The threshold of when a validation times out.
 */
export const VALIDATION_TIMEOUT = 2000;

/**
 * Function that returns a promise that rejects
 * after the `VALIDATION_TIMEOUT` has exceeded.
 */
export function validationTimeout(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        setTimeout(() => {
            reject(new ValidationTimeoutError('Validation timeout'));
        }, VALIDATION_TIMEOUT);
    });
}

/**
 * Utility function used to determine if a field has an empty value.
 */
export function isEmpty(value: any): boolean {
    switch (true) {
        case (value == null):
            return true;
        case (typeof value === 'string' && value.trim().length === 0):
            return true;
        case (Array.isArray(value) && value.length === 0):
            return true;
        default:
            return false;
    }
};
