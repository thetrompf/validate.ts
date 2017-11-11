import { Graph } from '../graph';

export class MockGraph<TNode, TData> extends Graph<TNode, TData> {
    public getIncomingEdges() {
        return this.incomingEdges;
    }

    public getNodes(): Map<TNode, TData> {
        return this.nodes;
    }

    public getOutgoingEdges() {
        return this.outgoingEdges;
    }
}
