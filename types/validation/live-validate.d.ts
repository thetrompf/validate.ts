import { Constraints, FieldObservables, SubscriptionAborter, ValidationErrorHandler } from 'validation/types';
export declare function liveValidate<TValues extends FieldObservables>(values: TValues, constraints: Constraints<TValues>, handleErrors: ValidationErrorHandler<TValues>): SubscriptionAborter;
