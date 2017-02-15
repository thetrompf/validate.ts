import {
    EventEmitter,
} from 'events';

export class Field extends EventEmitter {

    protected value: any;

    public constructor(value: any) {
        super();
        this.value = value;
    }

    public getValue() {
        return this.value;
    }

    public setValue(value: any): void {
        this.value = value;
    }
}

export class FieldAsync extends Field {

    public getValue(): Promise<any> {
        return new Promise((resolve, reject) => {
            setTimeout(() => resolve(this.value), 10);
        });
    }
}
