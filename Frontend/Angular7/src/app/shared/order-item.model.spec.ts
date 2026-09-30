declare var describe: any;
declare var it: any;
declare var expect: any;

import { OrderItem } from './order-item.model';

describe('OrderItem', () => {
  it('should create an instance', () => {
    expect(new OrderItem()).toBeTruthy();
  });
});