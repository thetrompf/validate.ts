import {
    Graph,
} from '../dependency-graph/graph';

import {
    ValidationError,
    ValidationTimeoutError,
} from './errors';

import {
    Constraints,
    FieldValuesObject,
    LiveValidationChangeMap as ILiveValidationChangeMap,
} from './types';

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
    for (const node in constraints) {
        const nodeConstraint = constraints[node];
        if (nodeConstraint && nodeConstraint.dependencies != null) {
            dependencyMap.set(node, new Set<keyof T>(nodeConstraint.dependencies));
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

    for (const key of Array.from(dependencies.values())) {
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
 * The threshold of when a validation .s out.
 */
export const VALIDATION_TIMEOUT = 2000;

/**
 * Function that returns a promise that rejects
 * after the `VALIDATION_TIMEOUT` has exceeded.
 */
export function validationTimeout(id?: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        setTimeout(() => {
            reject(new ValidationTimeoutError('Validation timeout' + (id == null ? '' : id)));
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


/**
 * The map object returned to the live validation change handler.
 */
export class LiveValidationChangeMap<TValues> implements ILiveValidationChangeMap<TValues, ValidationError> {
    private _errors: Map<keyof TValues, ValidationError[]>;

    public constructor() {
        this._errors = new Map();
    }

    public values() {
        return this._errors.values();
    }

    public entries() {
        return this._errors.entries();
    }

    public keys() {
        return this._errors.keys();
    }

    public getErrorsForNode(node: keyof TValues) {
        return this._errors.get(node);
    }

    public getAllErrors() {
        const errorMap = new Map<keyof TValues, ValidationError[]>();
        this._errors.forEach((errors: ValidationError[], node: keyof TValues) => {
            if (errors.length > 0) {
                errorMap.set(node, errors);
            }
        });
        return errorMap;
    }

    public forEach(
        callbackFn: (
            value: ValidationError[],
            key: keyof TValues,
            map: Map<keyof TValues, ValidationError[]>,
        ) => void,
        thisArg?: any
    ): void {
        this._errors.forEach(callbackFn, thisArg);
    }

    public get hasErrors(): boolean {
        for (const errors of Array.from(this._errors.values())) {
            if (errors.length > 0) {
                return true;
            }
        }
        return false;
    }

    public markNodeAsChanged(node: keyof TValues) {
        if (!this._errors.has(node)) {
            this._errors.set(node, []);
        }
    }

    public addError(node: keyof TValues, error: ValidationError): void {
        if (this._errors.has(node)) {
            (this._errors.get(node) as ValidationError[]).push(error);
        } else {
            this._errors.set(node, [error]);
        }
    }

    public toString(): string {
        let result = `
Field changes with errors:`;

        this._errors.forEach((errors, node) => {
            result += `
  - ${node}:`;
            if (errors.length > 0) {
                result += `
    ${errors.map(e => '*' + e.message)}`;
            } else {
                result += `
    No errors`;
            }
        });
        return result;
    }
}
