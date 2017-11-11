import { GraphCycleError, NoSuchEdgeGraphError } from '../errors';
import { createDfs } from '../utils';

test('create dfs returns a function', () => {
    const dfs = createDfs<string>(new Map(), false, new Set());
    expect(dfs).toBeInstanceOf(Function);
});

test('calling dfs populate the result set with in depth-first order', () => {
    const result = new Set<string>();
    const edges = new Map<string, Set<string>>([['a', new Set()], ['b', new Set(['a'])], ['c', new Set(['b'])]]);

    createDfs(edges, false, result)('c');
    expect(result).toEqual(new Set(['a', 'b', 'c']));
});

test('calling dfs with node not respresented in edges map will throw', () => {
    const result = new Set<string>();
    const edges = new Map<string, Set<string>>([['a', new Set()], ['b', new Set(['a'])]]);

    const dfs = createDfs(edges, false, result);
    expect(() => dfs('c')).toThrowError(NoSuchEdgeGraphError);
});

test('calling dfs with cyclic edges will throw', () => {
    expect.assertions(2);
    const result = new Set<string>();
    const edges = new Map<string, Set<string>>([['a', new Set(['b'])], ['b', new Set(['c'])], ['c', new Set(['a'])]]);

    const dfs = createDfs(edges, false, result);
    try {
        dfs('a');
    } catch (e) {
        expect(e).toBeInstanceOf(GraphCycleError);
        const cyclicGraphError = e as GraphCycleError<string>;
        expect(e.cycle).toEqual(['a', 'b', 'c', 'a']);
    }
});
