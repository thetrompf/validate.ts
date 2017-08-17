/**
 * The base graph error, all errors thrown
 * in terms of the graph is derived from this base class
 * or maybe the base class itself.
 */
export class GraphError extends Error {
    constructor(msg?: string) {
        super(msg);
        Object.setPrototypeOf(this, GraphError.prototype);
    }
}

/**
 * This error is thrown when trying to access a node
 * or calling a function that illegally assumes
 * a certain node exists, but doesn't.
 */
export class NoSuchNodeGraphError<K> extends GraphError {
    public constructor(node: K) {
        super(`Node '${node}' does not exist in graph`);
        Object.setPrototypeOf(this, NoSuchNodeGraphError.prototype);
    }
}

/**
 * This error is thrown when calling a method that
 * assumes a certain incoming or outgoing edge of
 * a node exists, but doesn't.
 */
export class NoSuchEdgeGraphError<TNode> extends GraphError {
    public constructor(node: TNode) {
        super(`No edges found for node '${node}' in graph`);
        Object.setPrototypeOf(this, NoSuchEdgeGraphError.prototype);
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
export class GraphCycleError<TNode> extends GraphError {
    public readonly cycle: TNode[];
    public constructor(cycle: TNode[]) {
        super('A cycle detected in the dependency graph');
        Object.setPrototypeOf(this, GraphCycleError.prototype);
        this.cycle = cycle;
    }

    public toString(): string {
        return (
            this.message +
            `

${this.cycle.join(' -> ')}`
        );
    }
}
