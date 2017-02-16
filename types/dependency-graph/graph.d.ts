/**
 * A simple class for modelling a
 * dependency graph data structure.
 */
export declare class Graph<TNode, TData> {
    /**
     * This property is only protected for testing purposes.
     **/
    protected incomingEdges: Map<TNode, Set<TNode>>;
    /**
     * This property is only protected for testing purposes.
     **/
    protected outgoingEdges: Map<TNode, Set<TNode>>;
    /**
     * This property is only protected for testing purposes.
     */
    protected nodes: Map<TNode, TData>;
    constructor();
    /**
     * Add an independant `node` to the graph,
     * and attach `data` to it.
     *
     * If the `node` already exists,
     * the call would be a no-op.
     */
    addNode(node: TNode, data: TData): void;
    /**
     * Retrieve `data` from the `node`.
     *
     * If the `node` doesn't exist it will throw `NoSuchNodeGraphError`.
     */
    getNodeData(node: TNode): TData;
    /**
     * Set new `data` on the `node`.
     * If the `node` doesn't exist it will throw `NoSuchNodeGraphError`.
     */
    setNodeData(node: TNode, data: TData): void;
    /**
     * Returns true if the `node` exists in the graph.
     */
    hasNode(node: TNode): boolean;
    /**
     * Add an edge between `fromNode` and `toNode`,
     * the `toNode` will depend on `fromNode`.
     *
     * If `fromNode` or `toNode` don't exist
     * a `NoSuchNodeGraphError` is thrown.
     */
    addDependency(fromNode: TNode, toNode: TNode): void;
    /**
     * Remove an edge between `fromNode` and `toNode`.
     *
     * If `fromNode` or `toNode` don't exist
     * a `NoSuchNodeGraphError` is thrown.
     */
    removeDependency(fromNode: TNode, toNode: TNode): void;
    /**
     * Return a set of all the nodes, this `node` depends on.
     *
     * If `leavesOnly` is true only the leaves of the sub-graph
     *    that depends on `node` will be returned.
     * If `node` does not exist in the graph
     *    a `NoSuchNodeGraphError` is thrown.
     */
    dependenciesOf(node: TNode, leavesOnly?: boolean): Set<TNode>;
    /**
     * Return a set of all the nodes, that depends on this `node`.
     *
     * If `leavesOnly` is true, only the leaves of the sub-graph
     *    this `node` depends on will be returned.
     * If `node` does not exist in the graph
     *    a `NoSuchNodeGraphError` is thrown.
     */
    dependantsOf(node: TNode, leavesOnly?: boolean): Set<TNode>;
    /**
     * Return a valid solved execution path of the dependency graph.
     *
     * If `leavesOnly` is true, only the leaves of execution path is returned.
     * If a cycle is detected a `GraphCycleError` is thrown.
     */
    overallOrder(leavesOnly?: boolean): Set<TNode>;
}
