export class Order {
    OrderID: number | null = null;
    OrderNo: string = '';
    CustomerID: number = 0;
    PMethod: string = '';
    GTotal: number = 0;
    OrderDate: string | Date = '';
    DeletedOrderItemIDs: string = '';
}