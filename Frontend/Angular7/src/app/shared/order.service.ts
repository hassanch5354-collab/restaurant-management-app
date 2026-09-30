import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Order } from './order.model';
import { OrderItem } from './order-item.model';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  formData: any = {
    OrderID: 0,
    OrderNo: '',
    CustomerID: 0,
    PMethod: '',
    GTotal: 0,
    DeletedOrderItemIDs: ''
  };
  orderItems: any[] = [];

  readonly rootURL = 'https://localhost:44309/api';

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  saveStateToStorage(): void {
    localStorage.setItem('pendingOrderState', JSON.stringify({
      formData: this.formData,
      orderItems: this.orderItems
    }));
  }

  loadStateFromStorage(): void {
    const raw = localStorage.getItem('pendingOrderState');
    if (raw) {
      try {
        const state = JSON.parse(raw);
        if (state && state.formData) this.formData = state.formData;
        if (state && Array.isArray(state.orderItems)) this.orderItems = state.orderItems;
      } catch (e) {
        console.error(e);
      }
    }
  }

  clearStateStorage(): void {
    localStorage.removeItem('pendingOrderState');
  }

  saveOrUpdateOrder(): Observable<any> {
    const headers = this.getAuthHeaders();

    const body = {
      OrderID: Number(this.formData.OrderID) || 0,
      OrderNo: this.formData.OrderNo ? this.formData.OrderNo.toString() : Math.floor(100000 + Math.random() * 900000).toString(),
      CustomerID: Number(this.formData.CustomerID),
      PMethod: this.formData.PMethod || 'Cash',
      GTotal: Number(this.formData.GTotal),
      DeletedOrderItemIDs: this.formData.DeletedOrderItemIDs ? this.formData.DeletedOrderItemIDs.toString() : '',
      OrderItems: (this.orderItems || []).map((item: any) => ({
        OrderItemID: Number(item.OrderItemID) || 0,
        OrderID: Number(this.formData.OrderID) || 0,
        ItemID: Number(item.ItemID || item.itemID),
        Quantity: Number(item.Quantity) || 1
      }))
    };

    return this.http.post(`${this.rootURL}/Order`, body, { headers });
  }

  getOrderList(): Promise<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.rootURL}/Order`, { headers }).toPromise();
  }

  getOrderByID(id: number): Promise<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.rootURL}/Order/${id}`, { headers }).toPromise();
  }

  deleteOrder(id: number): Promise<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete(`${this.rootURL}/Order/${id}`, { headers }).toPromise();
  }

  getSalesReport(from?: string, to?: string): Observable<any> {
    const headers = this.getAuthHeaders();
    let url = `${this.rootURL}/Order/GetSalesReport`;
    if (from && to) {
      url += `?fromDate=${from}&toDate=${to}`;
    }
    return this.http.get(url, { headers });
  }
}