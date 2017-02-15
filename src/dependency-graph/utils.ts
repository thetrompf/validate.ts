import {
    GraphCycleError,
    NoSuchEdgeGraphError,
} from 'dependency-graph/errors';

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
export function createDfs<K>(edges: Map<K, Set<K>>, leavesOnly: boolean, result: Set<K>): DFS<K> {
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
