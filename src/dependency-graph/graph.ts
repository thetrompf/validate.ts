import { GraphError, NoSuchNodeGraphError } from './errors';
import { createDfs } from './utils';

/**
 * A simple class for modelling a
 * dependency graph data structure.
 */
export class Graph<TNode, TData> {
    /**
     * This property is only protected for testing purposes.
     */
    protected incomingEdges: Map<TNode, Set<TNode>>;

    /**
     * This property is only protected for testing purposes.
     */
    protected nodes: Map<TNode, TData>;

    /**
     * This property is only protected for testing purposes.
     */
    protected outgoingEdges: Map<TNode, Set<TNode>>;

    public constructor() {
        this.nodes = new Map();
        this.incomingEdges = new Map();
        this.outgoingEdges = new Map();
    }

    /**
     * Add an edge between `fromNode` and `toNode`,
     * the `toNode` will depend on `fromNode`.
     *
     * If `fromNode` or `toNode` don't exist
     * a `NoSuchNodeGraphError` is thrown.
     */
    public addDependency(fromNode: TNode, toNode: TNode): void {
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
     * Add an independant `node` to the graph,
     * and attach `data` to it.
     *
     * If the `node` already exists,
     * the call would be a no-op.
     */
    public addNode(node: TNode, data: TData): void {
        if (!this.nodes.has(node)) {
            this.nodes.set(node, data);

            this.incomingEdges.set(node, new Set());
            this.outgoingEdges.set(node, new Set());
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
    public dependantsOf(node: TNode, leavesOnly: boolean = false): Set<TNode> {
        if (this.nodes.has(node)) {
            const result = new Set<TNode>();
            const dfs = createDfs(this.incomingEdges, leavesOnly, result);

            dfs(node);
            result.delete(node);

            return result;
        } else {
            throw new NoSuchNodeGraphError(node);
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
    public dependenciesOf(node: TNode, leavesOnly: boolean = false): Set<TNode> {
        if (this.nodes.has(node)) {
            const result = new Set<TNode>();
            const dfs = createDfs(this.outgoingEdges, leavesOnly, result);

            dfs(node);
            result.delete(node);

            return result;
        } else {
            throw new NoSuchNodeGraphError(node);
        }
    }

    /**
     * Retrieve `data` from the `node`.
     *
     * If the `node` doesn't exist it will throw `NoSuchNodeGraphError`.
     */
    public getNodeData(node: TNode): TData {
        const data = this.nodes.get(node);
        if (data == null) {
            throw new NoSuchNodeGraphError(node);
        }
        return data;
    }

    /**
     * Returns true if the `node` exists in the graph.
     */
    public hasNode(node: TNode): boolean {
        return this.nodes.has(node);
    }

    /**
     * Return the outgoing edges of the `node`
     *
     * If `node` does not exist in the graph
     *     a `NoSuchNodeGraphError` is thrown.
     */
    public immediateDependenciesOf(node: TNode): Set<TNode> {
        if (this.nodes.has(node)) {
            return this.outgoingEdges.get(node) as Set<TNode>;
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
    public overallOrder(leavesOnly: boolean = false): Set<TNode> {
        const result = new Set<TNode>();

        if (this.nodes.size === 0) {
            return result;
        }

        const keys = Array.from(this.nodes.keys());

        // detect cycles in the graph.
        const cycleDfs = createDfs(this.outgoingEdges, false, new Set<TNode>());
        keys.forEach(cycleDfs);

        const dfs = createDfs(this.outgoingEdges, leavesOnly, result);
        keys
            .filter(node => {
                const ie = this.incomingEdges.get(node);
                if (ie == null) {
                    throw new GraphError('This should never happen');
                }
                return ie.size === 0;
            })
            .forEach(dfs);

        return result;
    }

    /**
     * Remove an edge between `fromNode` and `toNode`.
     *
     * If `fromNode` or `toNode` don't exist
     * a `NoSuchNodeGraphError` is thrown.
     */
    public removeDependency(fromNode: TNode, toNode: TNode): void {
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
     * Set new `data` on the `node`.
     * If the `node` doesn't exist it will throw `NoSuchNodeGraphError`.
     */
    public setNodeData(node: TNode, data: TData): void {
        if (!this.nodes.has(node)) {
            throw new NoSuchNodeGraphError(node);
        }
        this.nodes.set(node, data);
    }
}
