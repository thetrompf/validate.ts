import {
    Graph,
} from 'dependency-graph/graph';

export class MockGraph<TNode, TData> extends Graph<TNode, TData> {
    public getIncomingEdges() {
        return this.incomingEdges;
    }

    public getOutgoingEdges() {
        return this.outgoingEdges;
    }

    public getNodes(): Map<TNode, TData> {
        return this.nodes;
    }
}
