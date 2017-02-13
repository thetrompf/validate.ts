export class GraphError extends Error {

}

export class NoSuchNodeGraphError<K> extends GraphError {
    public constructor(node: K) {
        super(`Node '${node}' does not exist in graph`);
    }
}

export class NoSuchEdgesGraphError<K> extends GraphError {
    public constructor(node: K) {
        super(`No edges found for node '${node}' in graph`);
    }
}

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

interface DFS<K> {
    (node: K): void;
}

function createDfs<K>(edges: Map<K, Set<K>>, leavesOnly: boolean, result: Set<K>): DFS<K> {
    const stack: K[] = [];
    const visited: Set<K> = new Set();

    const dfs = (currentNode: K): void => {
        visited.add(currentNode);
        stack.push(currentNode);

        const currentEdges = edges.get(currentNode);
        if (currentEdges == null) {
            throw new NoSuchEdgesGraphError(currentNode);
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

export class Graph<K, V> {

    // This property is only protected for testing purposes.
    protected incomingEdges: Map<K, Set<K>>;
    // This property is only protected for testing purposes.
    protected outgoingEdges: Map<K, Set<K>>;
    // This property is only protected for testing purposes.
    protected nodes: Map<K, V>;

    public constructor() {
        this.nodes = new Map;
        this.incomingEdges = new Map;
        this.outgoingEdges = new Map;
    }

    public addNode(node: K, data: V): void {
        if (!this.nodes.has(node)) {
            this.nodes.set(node, data);

            this.incomingEdges.set(node, new Set);
            this.outgoingEdges.set(node, new Set);
        }
    }

    public getNodeData(node: K): V {
        const data = this.nodes.get(node);
        if (data == null) {
            throw new NoSuchNodeGraphError(node);
        }
        return data;
    }

    public setNodeData(id: K, data: V): void {
        if (!this.nodes.has(id)) {
            throw new NoSuchNodeGraphError(id);
        }
        this.nodes.set(id, data);
    }

    public hasNode(node: K): boolean {
        return this.nodes.has(node);
    }

    public addDependency(from: K, to: K): void {
        const outgoingEdges = this.outgoingEdges.get(from);
        if (outgoingEdges == null) {
            throw new NoSuchNodeGraphError(from);
        }

        const incomingEdges = this.incomingEdges.get(to);
        if (incomingEdges == null) {
            throw new NoSuchNodeGraphError(to);
        }

        incomingEdges.add(from);
        outgoingEdges.add(to);
    }

    public removeDependency(from: K, to: K): void {
        const outgoingEdges = this.outgoingEdges.get(from);
        if (outgoingEdges != null) {
            outgoingEdges.delete(to);
        }

        const incomingEdges = this.incomingEdges.get(to);
        if (incomingEdges != null) {
            incomingEdges.delete(from);
        }
    }

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

    public overallOrder(leavesOnly: boolean = false) {
        const result = new Set<K>();
        if (this.nodes.size === 0) {
            return result;
        }
        const keys = Array.from(this.nodes.keys());
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
