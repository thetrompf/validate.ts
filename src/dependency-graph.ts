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

/**
 * The interface of a depth first search call.
 */
interface DFS<K> {
    (node: K): void;
}

/**
 * Utility function for creating a depth first search function through the `edges`
 * and populate nodes to the `result`, when `leavesOnly` is true, only
 * the nodes without any children is populated to the `result`.
 *
 * If a cycle is detected a `GraphCycleError` is thrown.
 */
function createDfs<K>(edges: Map<K, Set<K>>, leavesOnly: boolean, result: Set<K>): DFS<K> {
    const stack: K[] = [];
    const visited: Set<K> = new Set();

    const dfs = (currentNode: K): void => {
        visited.add(currentNode);
        stack.push(currentNode);

        const currentEdges = edges.get(currentNode);
        if (currentEdges == null) {
            throw new NoSuchEdgeGraphError(currentNode);
        }

        currentEdges.forEach((node) => {
            if (!visited.has(node)) {
                dfs(node);
            } else if (stack.indexOf(node) > -1) {
                stack.push(node);
                throw new GraphCycleError(stack);
            }
        });

        stack.pop();

        if ((!leavesOnly || currentEdges.size === 0) && !result.has(currentNode)) {
            result.add(currentNode);
        }
    };

    return dfs;
}

/**
 * A simple class for modelling a
 * dependency graph data structure.
 */
export class Graph<K, V> {

    /**
     * This property is only protected for testing purposes.
     **/
    protected incomingEdges: Map<K, Set<K>>;

    /**
     * This property is only protected for testing purposes.
     **/
    protected outgoingEdges: Map<K, Set<K>>;

    /**
     * This property is only protected for testing purposes.
     */
    protected nodes: Map<K, V>;

    public constructor() {
        this.nodes = new Map;
        this.incomingEdges = new Map;
        this.outgoingEdges = new Map;
    }

    /**
     * Add an independant `node` to the graph,
     * and attach `data` to it.
     *
     * If the `node` already exists,
     * the call would be a no-op.
     */
    public addNode(node: K, data: V): void {
        if (!this.nodes.has(node)) {
            this.nodes.set(node, data);

            this.incomingEdges.set(node, new Set);
            this.outgoingEdges.set(node, new Set);
        }
    }

    /**
     * Retrieve `data` from the `node`.
     *
     * If the `node` doesn't exist it will throw `NoSuchNodeGraphError`.
     */
    public getNodeData(node: K): V {
        const data = this.nodes.get(node);
        if (data == null) {
            throw new NoSuchNodeGraphError(node);
        }
        return data;
    }

    /**
     * Set new `data` on the `node`.
     * If the `node` doesn't exist it will throw `NoSuchNodeGraphError`.
     */
    public setNodeData(node: K, data: V): void {
        if (!this.nodes.has(node)) {
            throw new NoSuchNodeGraphError(node);
        }
        this.nodes.set(node, data);
    }

    /**
     * Returns true if the `node` exists in the graph.
     */
    public hasNode(node: K): boolean {
        return this.nodes.has(node);
    }

    /**
     * Add an edge between `fromNode` and `toNode`,
     * the `toNode` will depend on `fromNode`.
     *
     * If `fromNode` or `toNode` don't exist
     * a `NoSuchNodeGraphError` is thrown.
     */
    public addDependency(fromNode: K, toNode: K): void {
        const outgoingEdges = this.outgoingEdges.get(fromNode);
        if (outgoingEdges == null) {
            throw new NoSuchNodeGraphError(fromNode);
        }

        const incomingEdges = this.incomingEdges.get(toNode);
        if (incomingEdges == null) {
            throw new NoSuchNodeGraphError(toNode);
        }

        incomingEdges.add(fromNode);
        outgoingEdges.add(toNode);
    }

    /**
     * Remove an edge between `fromNode` and `toNode`.
     *
     * If `fromNode` or `toNode` don't exist
     * a `NoSuchNodeGraphError` is thrown.
     */
    public removeDependency(fromNode: K, toNode: K): void {
        const outgoingEdges = this.outgoingEdges.get(fromNode);
        if (outgoingEdges != null) {
            outgoingEdges.delete(toNode);
        }

        const incomingEdges = this.incomingEdges.get(toNode);
        if (incomingEdges != null) {
            incomingEdges.delete(fromNode);
        }
    }

    /**
     * Return a set of all the nodes, this `node` depends on.
     *
     * If `leavesOnly` is true only the leaves of the sub-graph
     *    that depends on `node` will be returned.
     * If `node` does not exist in the graph
     *    a `NoSuchNodeGraphError` is thrown.
     */
    public dependenciesOf(node: K, leavesOnly: boolean = false): Set<K> {
        if (this.nodes.has(node)) {
            const result = new Set<K>();
            const dfs = createDfs(this.outgoingEdges, leavesOnly, result);

            dfs(node);
            result.delete(node);

            return result;
        } else {
            throw new NoSuchNodeGraphError(node);
        }
    }

    /**
     * Return a set of all the nodes, that depends on this `node`.
     *
     * If `leavesOnly` is true, only the leaves of the sub-graph
     *    this `node` depends on will be returned.
     * If `node` does not exist in the graph
     *    a `NoSuchNodeGraphError` is thrown.
     */
    public dependantsOf(node: K, leavesOnly: boolean = false): Set<K> {
        if (this.nodes.has(node)) {
            const result = new Set<K>();
            const dfs = createDfs(this.incomingEdges, leavesOnly, result);

            dfs(node);
            result.delete(node);

            return result;
        } else {
            throw new NoSuchNodeGraphError(node);
        }
    }

    /**
     * Return a valid solved execution path of the dependency graph.
     *
     * If `leavesOnly` is true, only the leaves of execution path is returned.
     * If a cycle is detected a `GraphCycleError` is thrown.
     */
    public overallOrder(leavesOnly: boolean = false): Set<K> {
        const result = new Set<K>();

        if (this.nodes.size === 0) {
            return result;
        }

        const keys = Array.from(this.nodes.keys());

        // detect cycles in the graph.
        const cycleDfs = createDfs(this.outgoingEdges, false, new Set<K>());
        keys.forEach(cycleDfs);

        const dfs = createDfs(this.outgoingEdges, leavesOnly, result);
        keys.filter(node => {
            const ie = this.incomingEdges.get(node);
            if (ie == null) {
                throw new GraphError('This should never happen');
            }
            return ie.size === 0;
        }).forEach(dfs);

        return result;
    }
}
