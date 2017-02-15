/**
 * The base graph error, all errors thrown
 * in terms of the graph is derived from this base class
 * or maybe the base class itself.
 */
export class GraphError extends Error {

}

/**
 * This error is thrown when trying to access a node
 * or calling a function that illegally assumes
 * a certain node exists, but doesn't.
 */
export class NoSuchNodeGraphError<K> extends GraphError {
    public constructor(node: K) {
        super(`Node '${node}' does not exist in graph`);
    }
}

/**
 * This error is thrown when calling a method that
 * assumes a certain incoming or outgoing edge of
 * a node exists, but doesn't.
 */
export class NoSuchEdgeGraphError<K> extends GraphError {
    public constructor(node: K) {
        super(`No edges found for node '${node}' in graph`);
    }
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
export class GraphCycleError<K> extends GraphError {
    public readonly cycle: K[];
    public constructor(cycle: K[]) {
        super('A cycle detected in the dependency graph');
        this.cycle = cycle;
    }

    public toString(): string {
        return this.message + `

${this.cycle.join(' -> ')}`;
    }
}
