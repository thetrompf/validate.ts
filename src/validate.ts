import {
    Graph,
} from './dependency-graph';

/**
 * The interface for field values to validate.
 */
export interface FieldValuesObject {
    [key: string]: any;
}

/**
 * The interface of a validator function.
 */
export interface Validator {
    (value: any, dependencies?: Map<string, any> | undefined, options?: any): Promise<void>;
}
/**
 * The interface/options for constraints.
 */
export interface ConstraintSpecification {
    
    /** 
     * A list of identifiers to depend on.
     */
    dependencies?: string[];
    
    /**
     * Mark that the field must have a non-empty value
     */
    required?: boolean;
    
    /**
     * A list of validators to run against the field value
     */
    validators?: Validator[];
}

export type Constraints<T> = {
    [P in keyof T]?: ConstraintSpecification;
};

/**
 * The base validation error.
 */
export class ValidationError extends Error {

}

/**
 * This error is thrown if a validation exceeds the `VALIDATION_TIMEOUT`.
 */
export class ValidationTimeoutError extends ValidationError {

}

/**
 * The aggregated error to be thrown to the caller.
 */
export class ValidationAggregateError extends ValidationError {

    private _errors: Map<string, ValidationError[]>;

    public constructor() {
        super();
        this._errors = new Map();
    }

    /**
     * The number of fields with validation errors.
     */
    public get length(): number {
        return this._errors.size;
    }

    /**
     * A map from field to errors.
     */
    public get errors() {
        return this._errors;
    }

    /**
     * Add a validation error to `field`.
     */
    public add(field: string, error: ValidationError): void {
        if(this._errors.has(field)) {
            const errors = this._errors.get(field) as ValidationError[];
            errors.push(error);
        } else {
            this._errors.set(field, [error]);
        }
    }

    /**
     * A string represention of the aggregated errors.
     */
    public toString(): string {
        let result = `
Validation errors:`;
        
        this._errors.forEach((errors, key) => {
            result += `
  - ${key}:
    ${errors.map(e => '* '+e.message)}`
        });
        return result;
    }
}

/**
 * Utility function used to determine if a field has an empty value.
 */
export const isEmpty = (value: any): boolean => {
    switch(true) {
        case (value == null):
            return true;
        case (typeof value === 'string' && value.trim().length === 0):
            return true;
        case (Array.isArray(value) && value.length === 0):
            return true;
        default:
            return false;
    }
};

/**
 * The threshold of when a validation times out.
 */
export const VALIDATION_TIMEOUT = 2000;

/**
 * Function that returns a promise that rejects
 * after the `VALIDATION_TIMEOUT` has exceeded.
 */
export const validationTimeout = () : Promise<void> => {
    return new Promise<void>((resolve, reject) => {
        setTimeout(() => {
            reject(new ValidationTimeoutError('Validation timeout'));
        }, VALIDATION_TIMEOUT);
    });
}

function addConstraints<K, V>(graph: Graph<K, V> , node: K, dependencies: Set<K> | undefined): void {
    if(dependencies == null) {
        return;
    }
    dependencies.forEach(d => graph.addDependency(d, node));
}

function addAllConstraints<K, V>(graph: Graph<K, V>, nodes: K[], dependencyMap: Map<K, Set<K>>): void {
    nodes.forEach(n => addConstraints(graph, n, dependencyMap.get(n) as Set<K>))
}

async function getPromisedDependencyMap(values: FieldValuesObject, dependencies: Set<string> | undefined): Promise<Map<string, any> | undefined> {
    if(dependencies == null) {
        return undefined;
    }

    const map = new Map<string, any>();
    const promises: Promise<any>[] = [];

    for(const key of dependencies) {
        const value = values[key];
        if(value != null) {
            if(value instanceof Promise) {
                promises.push(value.then((v) => map.set(key, v)));
            } else {
                map.set(key, value);
            }
        } else {
            map.set(key, undefined);
        }
    }

    await Promise.all(promises);
    return map;
}

/**
 * Validate `values` against the `constraints` specification.
 * 
 * If one or more values don't comply with the `constraints`,
 * an `AggregateError` is thrown containing the all the `ValidationError`s
 * in the validation process.
 * 
 * If a single validator exceeds the `VALIDATION_TIMEOUT`
 * a `ValidationTimeoutError` is thrown.
 */
export const validate = async <T extends FieldValuesObject>(values: T, constraints: Constraints<T>) : Promise<void> => {
    const keys = Object.keys(values);
    const errors = new ValidationAggregateError();
    const promises: Promise<any>[] = [];

    // Create dependency graph.
    const graph = new Graph<string, ConstraintSpecification | undefined>();

    // Add all nodes.
    keys.forEach(k => graph.addNode(k, constraints[k]));
    
    // Map all constraints with dependencies,
    // in order for easier building the graph,
    // and resolve the asynchronous dependencies later on.
    const dependencyMap = new Map<string, Set<string>>();
    for(const key in constraints) {
        const nodeConstraints = constraints[key];
        if(nodeConstraints && nodeConstraints.dependencies != null) {
            dependencyMap.set(key, new Set(nodeConstraints.dependencies));
        }
    }
    addAllConstraints(graph, keys, dependencyMap);

    for(const key of graph.overallOrder()) {
        const constraint = constraints[key];
        if(constraint != undefined) {
            let value = values[key];
            if(!(value instanceof Promise)) {
                value = Promise.resolve(value);
            }
            promises.push(Promise.race([
                validationTimeout(),
                value,
            ]).then((value: any) => {
                if(isEmpty(value)) {
                    if(constraint.required) {
                        errors.add(key, new ValidationError('Cannot be blank'));
                        return;
                    }
                } else if(constraint.validators) {
                    const dependencies = dependencyMap.get(key);
                    return Promise.all(constraint.validators.map((validator: Validator) => {
                        return Promise.race([
                            validationTimeout(),
                            getPromisedDependencyMap(values, dependencies),
                        ]).then((deps: Map<string, any> | undefined) => {
                            return Promise.race([
                                validationTimeout(),
                                validator(value, deps).catch(e => {
                                    if(e instanceof ValidationError) {
                                        errors.add(key, e);
                                        return;
                                    }
                                    throw e;
                                }),
                            ]);
                        });
                    }));
                }
            }, (e) => {
                if(e instanceof ValidationError) {
                    errors.add(key, e);
                    return;
                }
                throw e;
            }).catch(e => {
                if(e instanceof ValidationError) {
                    errors.add(key, e);
                    return;
                }
                throw e;
            }));
        }
    }

    await Promise.all(promises);

    if(errors.length > 0) {
        throw errors;
    }
    
    return;
};
