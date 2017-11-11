import { GraphCycleError, NoSuchEdgeGraphError } from './errors';

/**
 * The interface of a depth first search call.
 */
export type DFS<TNode> = (node: TNode) => void;

/**
 * Utility function for creating a depth first search function through the `edges`
 * and populate nodes to the `result`, when `leavesOnly` is true, only
 * the nodes without any children is populated to the `result`.
 *
 * If a cycle is detected a `GraphCycleError` is thrown.
 */
export function createDfs<TNode>(edges: Map<TNode, Set<TNode>>, leavesOnly: boolean, result: Set<TNode>): DFS<TNode> {
    const stack: TNode[] = [];
    const visited: Set<TNode> = new Set();

    // tslint:disable-next-line:no-unnecessary-local-variable
    const dfs = (currentNode: TNode): void => {
        visited.add(currentNode);
        stack.push(currentNode);

        const currentEdges = edges.get(currentNode);
        if (currentEdges == null) {
            throw new NoSuchEdgeGraphError(currentNode);
        }

        currentEdges.forEach(node => {
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
