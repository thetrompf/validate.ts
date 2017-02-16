import { Graph } from 'dependency-graph/graph';
import { Constraints, FieldValuesObject } from 'validation/types';
/**
 * Add `dependencies` as outgoing edges from `node` in the `graph`.
 *
 * If `dependencies` are `undefined` this function is a no-op.
 */
export declare function addConstraints<K, V>(graph: Graph<K, V>, node: K, dependencies: Set<K> | undefined): void;
/**
 * Add all the constraints from the `dependencyMap` to the `nodes` in the `graph`.
 */
export declare function addAllConstraints<K, V>(graph: Graph<K, V>, nodes: K[], dependencyMap: Map<K, Set<K>>): void;
/**
 * Map all constraints with dependencies,
 * in order for easier building the graph,
 * and resolve the asynchronous dependencies later on.
 */
export declare function buildDependencyMap<T>(constraints: Constraints<T>): Map<keyof T, Set<keyof T>>;
/**
 * Return a map with all the values of the `dependencies` resolved,
 * so they can be accessed synchronously afterwards,
 * e.g. when passed to validators.
 *
 * If `dependencies` are not provieded the return value is `undefined`.
 */
export declare function getPromisedDependencyMap<T>(values: FieldValuesObject, dependencies: Set<keyof T> | undefined): Promise<Map<keyof T, any> | undefined>;
/**
 * The threshold of when a validation times out.
 */
export declare const VALIDATION_TIMEOUT = 2000;
/**
 * Function that returns a promise that rejects
 * after the `VALIDATION_TIMEOUT` has exceeded.
 */
export declare function validationTimeout(): Promise<void>;
/**
 * Utility function used to determine if a field has an empty value.
 */
export declare function isEmpty(value: any): boolean;
