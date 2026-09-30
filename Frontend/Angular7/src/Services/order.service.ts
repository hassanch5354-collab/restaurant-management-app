import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Order } from '../app/shared/order.model';
import { OrderItem } from '../app/shared/order-item.model';

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
    DeletedOrderItemIDs: '',
    OrderDate: new Date().toISOString()
  };
  orderItems: OrderItem[] = [];

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
    const state = {
      formData: this.formData,
      orderItems: this.orderItems
    };
    localStorage.setItem('pendingOrderState', JSON.stringify(state));
  }

  loadStateFromStorage(): void {
    const raw = localStorage.getItem('pendingOrderState');
    if (raw) {
      try {
        const state = JSON.parse(raw);
        if (state && state.formData) {
          this.formData = state.formData;
        }
        if (state && Array.isArray(state.orderItems)) {
          this.orderItems = state.orderItems;
        }
      } catch (e) {
        console.error('Failed to parse saved order state', e);
      }
    }
  }

  clearStateStorage(): void {
    localStorage.removeItem('pendingOrderState');
  }

  saveOrUpdateOrder(): Observable<any> {
    const headers = this.getAuthHeaders();
    const isEdit = Number(this.formData.OrderID) > 0;

    const cleanItems = (this.orderItems || []).map((item: any) => {
      const itemPayload: any = {
        ItemID: Number(item.ItemID || item.itemID),
        Quantity: Number(item.Quantity) || 1
      };

      if (isEdit) {
        itemPayload.OrderID = Number(this.formData.OrderID);
        if (Number(item.OrderItemID) > 0) {
          itemPayload.OrderItemID = Number(item.OrderItemID);
        }
      }

      return itemPayload;
    });

    let delIDs = '';
    if (this.formData.DeletedOrderItemIDs && typeof this.formData.DeletedOrderItemIDs === 'string') {
      delIDs = this.formData.DeletedOrderItemIDs
        .split(',')
        .map((x: string) => x.trim())
        .filter((x: string) => x !== '' && !isNaN(Number(x)))
        .join(',');
    }

    const payload: any = {
      OrderID: Number(this.formData.OrderID) || 0,
      OrderNo: this.formData.OrderNo ? this.formData.OrderNo.toString() : Math.floor(100000 + Math.random() * 900000).toString(),
      CustomerID: Number(this.formData.CustomerID),
      PMethod: this.formData.PMethod || 'Cash',
      GTotal: Number(this.formData.GTotal),
      DeletedOrderItemIDs: delIDs,
      OrderItems: cleanItems
    };

    return this.http.post(`${this.rootURL}/Order`, payload, { headers });
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
    let url = `${this.rootURL}/Order/SalesReport`;
    if (from && to) {
      url += `?from=${from}&to=${to}`;
    }
    return this.http.get(url, { headers });
  }
}