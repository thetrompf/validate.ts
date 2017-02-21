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

    public triggerChange(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const listerners = this.emit('change', (err?: any) => {
                resolve(err);
            });

            if (!listerners) {
                resolve();
            }
        });
    }
}

export class FieldAsync extends Field {

    public getValue(): Promise<any> {
        return new Promise((resolve, reject) => {
            setTimeout(() => resolve(this.value), 100);
        });
    }
}
