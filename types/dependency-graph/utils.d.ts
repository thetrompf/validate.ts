/**
 * The interface of a depth first search call.
 */
export interface DFS<TNode> {
    (node: TNode): void;
}
/**
 * Utility function for creating a depth first search function through the `edges`
 * and populate nodes to the `result`, when `leavesOnly` is true, only
 * the nodes without any children is populated to the `result`.
 *
 * If a cycle is detected a `GraphCycleError` is thrown.
 */
export declare function createDfs<TNode>(edges: Map<TNode, Set<TNode>>, leavesOnly: boolean, result: Set<TNode>): DFS<TNode>;
