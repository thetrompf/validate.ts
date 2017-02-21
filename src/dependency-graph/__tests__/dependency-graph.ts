import {
    MockGraph
} from 'dependency-graph/__mocks__/graph';

import {
    GraphCycleError,
    NoSuchNodeGraphError,
} from 'dependency-graph/errors';

import {
    Graph,
} from 'dependency-graph/graph';

test('hasNode returns true for added node', () => {
    const graph = new Graph<string, void>();
    const node = 'node';
    graph.addNode(node, undefined);
    expect(graph.hasNode(node)).toBe(true);
});

test('getNodeData retuns data attached to the node via addNode', () => {
    const graph = new Graph<string, number>();
    const node = 'node';
    graph.addNode(node, 1);
    expect(graph.getNodeData(node)).toEqual(1);
});

test('getNodeData throws when node does not exist', () => {
    const graph = new Graph<string, void>();
    const node = 'node';
    expect(() => graph.getNodeData(node)).toThrowError(NoSuchNodeGraphError);
});

test('adding node that already exists is a no-op', () => {
    const graph = new Graph<string, number>();
    const node = 'node';
    graph.addNode(node, 1);
    graph.addNode(node, 2);
    expect(graph.getNodeData(node)).toEqual(1);
});

test('hasNode returns false when node does not exist', () => {
    const graph = new Graph<string, void>();
    const node = 'node';
    expect(graph.hasNode(node)).toBe(false);
});

test('setNodeData overwrites existing data on node', () => {
    const graph = new Graph<string, number>();
    const node = 'node';
    graph.addNode(node, 1);
    expect(graph.getNodeData(node)).toEqual(1);
    graph.setNodeData(node, 2);
    expect(graph.getNodeData(node)).toEqual(2);
});

test('setNodeData on node that does not exist throws', () => {
    const graph = new Graph<string, number>();
    const node = 'node';
    expect(() => graph.setNodeData(node, 2)).toThrowError(NoSuchNodeGraphError);
});

test('adding dependency adds incoming and outgoing edges', () => {
    const graph = new MockGraph<string, number>();
    const node1 = 'node1';
    const node2 = 'node2';

    graph.addNode(node1, 1);
    graph.addNode(node2, 2);
    graph.addDependency(node1, node2);

    const incomingEdges = graph.getIncomingEdges();
    const outgoingEdges = graph.getOutgoingEdges();

    const node1IncomingEdges = incomingEdges.get(node1) as Set<string>;
    const node1OutgoingEdges = outgoingEdges.get(node1) as Set<string>;
    const node2IncomingEdges = incomingEdges.get(node2) as Set<string>;
    const node2OutgoingEdges = outgoingEdges.get(node2) as Set<string>;

    expect(node1IncomingEdges.size).toEqual(0);
    expect(node1OutgoingEdges.size).toEqual(1);
    expect(node2IncomingEdges.size).toEqual(1);
    expect(node2OutgoingEdges.size).toEqual(0);

    expect(node1OutgoingEdges.has(node2)).toBe(true);
    expect(node2IncomingEdges.has(node1)).toBe(true);
});

test('adding dependency where the "from" node does not exist throws', () => {
    const graph = new Graph<string, number>();
    const node1 = 'node1';
    const node2 = 'node2';

    graph.addNode(node2, 2);
    expect(() => graph.addDependency(node1, node2)).toThrowError(NoSuchNodeGraphError);
});

test('adding dependency where "to" node does not exist throws', () => {
    const graph = new Graph<string, number>();
    const node1 = 'node1';
    const node2 = 'node2';

    graph.addNode(node1, 1);
    expect(() => graph.addDependency(node1, node2)).toThrowError(NoSuchNodeGraphError);
});

test('adding a dependency that already exists is a no-op', () => {
    const graph = new MockGraph<string, number>();
    const node1 = 'node1';
    const node2 = 'node2';

    graph.addNode(node1, 1);
    graph.addNode(node2, 2);

    const node1OutgoingEdges = graph.getOutgoingEdges().get(node1) as Set<string>;
    const node2IncomingEdges = graph.getIncomingEdges().get(node2) as Set<string>;

    graph.addDependency(node1, node2);

    expect(node1OutgoingEdges.size).toEqual(1);
    expect(node2IncomingEdges.size).toEqual(1);

    graph.addDependency(node1, node2);

    expect(node1OutgoingEdges.size).toEqual(1);
    expect(node2IncomingEdges.size).toEqual(1);
});

test('removing a dependency removes incoming and outgoing edges', () => {
    const graph = new MockGraph<string, number>();
    const node1 = 'node1';
    const node2 = 'node2';

    graph.addNode(node1, 1);
    graph.addNode(node2, 2);

    const node1OutgoingEdges = graph.getOutgoingEdges().get(node1) as Set<string>;
    const node2IncomingEdges = graph.getIncomingEdges().get(node2) as Set<string>;

    graph.addDependency(node1, node2);

    expect(node1OutgoingEdges.size).toEqual(1);
    expect(node2IncomingEdges.size).toEqual(1);

    graph.removeDependency(node1, node2);

    expect(node1OutgoingEdges.size).toEqual(0);
    expect(node2IncomingEdges.size).toEqual(0);
});

test('removing a dependency that does not exist does not throw', () => {
    const graph = new MockGraph<string, number>();
    const node1 = 'node1';
    const node2 = 'node2';

    graph.addNode(node1, 1);
    graph.addNode(node2, 2);

    // reverse order
    graph.addDependency(node2, node1);

    const nodes = graph.getNodes();

    const outgoingEdges = graph.getOutgoingEdges().get(node1) as Set<string>;
    const incomingEdges = graph.getIncomingEdges().get(node2) as Set<string>;

    expect(nodes.size).toEqual(2);
    expect(incomingEdges.size).toEqual(0);
    expect(outgoingEdges.size).toEqual(0);

    graph.removeDependency(node1, node2);

    expect(incomingEdges.size).toEqual(0);
    expect(outgoingEdges.size).toEqual(0);
});

test('dependenciesOf returns the sub tree of the node in question', () => {
    const graph = new Graph<string, number>();
    const a = 'A';
    const b = 'B';
    const c = 'C';
    const d = 'D';
    const e = 'E';
    const f = 'F';
    const g = 'G';

    const data = 1;

    graph.addNode(a, data);
    graph.addNode(b, data);
    graph.addNode(c, data);
    graph.addNode(d, data);
    graph.addNode(e, data);
    graph.addNode(f, data);
    graph.addNode(g, data);

    //      A
    //     / \
    //    B   C
    //   / \ / \
    //  D  E F  G

    graph.addDependency(a, b);
    graph.addDependency(a, c);
    graph.addDependency(b, d);
    graph.addDependency(b, e);
    graph.addDependency(c, f);
    graph.addDependency(c, g);

    expect(graph.dependenciesOf(g, false).size).toEqual(0);
    expect(graph.dependenciesOf(f, false).size).toEqual(0);
    expect(graph.dependenciesOf(e, false).size).toEqual(0);
    expect(graph.dependenciesOf(d, false).size).toEqual(0);
    expect(graph.dependenciesOf(c, false).size).toEqual(2);
    expect(graph.dependenciesOf(b, false).size).toEqual(2);
    expect(graph.dependenciesOf(a, false).size).toEqual(6);

    expect(graph.dependenciesOf(a, true).size).toEqual(4);
    expect(graph.dependenciesOf(b, true).size).toEqual(2);
    expect(graph.dependenciesOf(c, true).size).toEqual(2);

    expect(
        Array.from(graph.dependenciesOf(a, false)).sort()
    ).toEqual([b, c, d, e, f, g]);

    expect(
        Array.from(graph.dependenciesOf(b, false)).sort()
    ).toEqual([d, e]);

    expect(
        Array.from(graph.dependenciesOf(c, false)).sort()
    ).toEqual([f, g]);
});

test('dependantsOf returns all nodes that are depending on the node itself', () => {
    const graph = new Graph<string, number>();
    const a = 'A';
    const b = 'B';
    const c = 'C';
    const d = 'D';
    const e = 'E';
    const f = 'F';
    const g = 'G';

    const data = 1;

    graph.addNode(a, data);
    graph.addNode(b, data);
    graph.addNode(c, data);
    graph.addNode(d, data);
    graph.addNode(e, data);
    graph.addNode(f, data);
    graph.addNode(g, data);

    //      A
    //     / \
    //    B   C
    //   / \ / \
    //  D  E F  G

    graph.addDependency(a, b);
    graph.addDependency(a, c);
    graph.addDependency(b, d);
    graph.addDependency(b, e);
    graph.addDependency(c, f);
    graph.addDependency(c, g);

    expect(graph.dependantsOf(g).size).toEqual(2);
    expect(graph.dependantsOf(f).size).toEqual(2);
    expect(graph.dependantsOf(e).size).toEqual(2);
    expect(graph.dependantsOf(d).size).toEqual(2);
    expect(graph.dependantsOf(c).size).toEqual(1);
    expect(graph.dependantsOf(b).size).toEqual(1);
    expect(graph.dependantsOf(a).size).toEqual(0);

    expect(
        Array.from(graph.dependantsOf(g)).sort()
    ).toEqual([a, c]);

    expect(
        Array.from(graph.dependantsOf(f)).sort()
    ).toEqual([a, c]);

    expect(
        Array.from(graph.dependantsOf(e)).sort()
    ).toEqual([a, b]);

    expect(
        Array.from(graph.dependantsOf(d)).sort()
    ).toEqual([a, b]);

    expect(
        Array.from(graph.dependantsOf(c))
    ).toEqual([a]);

    expect(
        Array.from(graph.dependantsOf(b))
    ).toEqual([a]);

    expect(
        Array.from(graph.dependantsOf(a))
    ).toEqual([]);
});

test('resolving dependencies of a node that does not exist throws', () => {
    const graph = new Graph<string, number>();
    const node = 'node';
    expect(() => graph.dependenciesOf(node)).toThrowError(NoSuchNodeGraphError);
});

test('resolving dependants of a node that does not exist throws', () => {
    const graph = new Graph<string, number>();
    const node = 'node';
    expect(() => graph.dependantsOf(node)).toThrowError(NoSuchNodeGraphError);
});

test('resolving dependencies in a graph that has cycle(s) throws', () => {
    const graph = new Graph<string, void>();
    const a = 'A';
    const b = 'B';
    const c = 'C';

    const data = undefined;

    graph.addNode(a, data);
    graph.addNode(b, data);
    graph.addNode(c, data);

    graph.addDependency(a, b);
    graph.addDependency(b, c);
    graph.addDependency(c, a);

    expect(() => graph.dependenciesOf(b)).toThrowError(GraphCycleError);
});

test('resolving dependants in a graph that has cycle(s) throws', () => {
    const graph = new Graph<string, void>();
    const a = 'A';
    const b = 'B';
    const c = 'C';

    const data = undefined;

    graph.addNode(a, data);
    graph.addNode(b, data);
    graph.addNode(c, data);

    graph.addDependency(a, b);
    graph.addDependency(b, c);
    graph.addDependency(c, a);

    expect(() => graph.dependantsOf(b)).toThrowError(GraphCycleError);
});

test('overallOrder returns a legal execution path for graphs with disconnected sub graphs', () => {
    const graph = new Graph<string, void>();

    const a = 'A';
    const b = 'B';
    const c = 'C';
    const d = 'D';
    const e = 'E';
    const f = 'F';
    const g = 'G';
    const h = 'H';
    const i = 'I';
    const j = 'J';
    const k = 'K';
    const l = 'L';
    const m = 'M';

    const data = undefined;

    graph.addNode(a, data);
    graph.addNode(b, data);
    graph.addNode(c, data);
    graph.addNode(d, data);
    graph.addNode(e, data);
    graph.addNode(f, data);
    graph.addNode(g, data);
    graph.addNode(h, data);
    graph.addNode(i, data);
    graph.addNode(j, data);
    graph.addNode(k, data);
    graph.addNode(l, data);
    graph.addNode(m, data);

    //      A       D   G I  /-J
    //     / \     / \ /  | /  |
    //    B   C   E --|   K    |
    //     \   \ /    H   |    |
    //      --- F         L -- M

    graph.addDependency(a, b);
    graph.addDependency(a, c);
    graph.addDependency(b, f);
    graph.addDependency(c, f);
    graph.addDependency(d, e);
    graph.addDependency(e, f);
    graph.addDependency(d, h);
    graph.addDependency(h, e);
    graph.addDependency(g, h);
    graph.addDependency(i, k);
    graph.addDependency(k, l);
    graph.addDependency(j, k);
    graph.addDependency(j, m);
    graph.addDependency(l, m);

    expect(
        Array.from(graph.overallOrder())
    ).toEqual([f, b, c, a, e, h, d, g, m, l, k, i, j]);
});

test('resolving immediate dependencies of node', () => {
    const graph = new Graph<string, void>();

    const a = 'A';
    const b = 'B';
    const c = 'C';
    const d = 'D';
    const e = 'E';

    const data = undefined;

    graph.addNode(a, data);
    graph.addNode(b, data);
    graph.addNode(c, data);
    graph.addNode(d, data);
    graph.addNode(e, data);

    graph.addDependency(a, b);
    graph.addDependency(a, c);
    graph.addDependency(b, d);
    graph.addDependency(b, e);

    expect(
        Array.from(graph.immediateDependenciesOf(a))
    ).toEqual([b, c]);

    expect(
        Array.from(graph.immediateDependenciesOf(b))
    ).toEqual([d, e]);

    expect(
        Array.from(graph.immediateDependenciesOf(c))
    ).toHaveLength(0);
});
