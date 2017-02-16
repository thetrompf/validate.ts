/**
 * The base graph error, all errors thrown
 * in terms of the graph is derived from this base class
 * or maybe the base class itself.
 */
export declare class GraphError extends Error {
}
/**
 * This error is thrown when trying to access a node
 * or calling a function that illegally assumes
 * a certain node exists, but doesn't.
 */
export declare class NoSuchNodeGraphError<K> extends GraphError {
    constructor(node: K);
}
/**
 * This error is thrown when calling a method that
 * assumes a certain incoming or outgoing edge of
 * a node exists, but doesn't.
 */
export declare class NoSuchEdgeGraphError<TNode> extends GraphError {
    constructor(node: TNode);
}
/**
 * This error is thrown when a cycle is detected in the graph
 * when trying to resolve a execution path/order or
 * a sub-execution path/order of a node.
 *
 * e.g. when calling:
 *  - `Graph.dependenciesOf(node)`
 *  - `Graph.dependantsOf(node)`
 *  - `Graph.overallOrder()`
 */
export declare class GraphCycleError<TNode> extends GraphError {
    readonly cycle: TNode[];
    constructor(cycle: TNode[]);
    toString(): string;
}
