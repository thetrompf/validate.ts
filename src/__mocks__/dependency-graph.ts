import {
    Graph,
} from '../dependency-graph';

export class MockGraph<K, V> extends Graph<K, V> {
    public getIncomingEdges() {
        return this.incomingEdges;
    }

    public getOutgoingEdges() {
        return this.outgoingEdges;
    }

    public getNodes(): Map<K, V> {
        return this.nodes;
    }
}
