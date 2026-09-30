import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { OrderService } from '../../Services/order.service';
import { AuthService } from '../../Services/auth.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './orders.html',
})
export class OrdersComponent implements OnInit {
  orderList: any[] = [];
  isLoading: boolean = false;

  constructor(
    public orderService: OrderService,
    public authService: AuthService,
    private router: Router,
    private cd: ChangeDetectorRef
  ) {}
  ngOnInit(): void {
    // Only query data from the server if view rights are enabled
    if (this.authService.canOrderListView) {
      this.refreshList();
    }
  }
  refreshList(): void {
    this.isLoading = true;
    this.orderService.getOrderList().then((res: any) => {
      this.orderList = res || [];
      this.isLoading = false;
      this.cd.detectChanges();
    }).catch((err: any) => {
      this.isLoading = false;
      console.error('Failed to load orders list:', err);
      this.cd.detectChanges();
    });
  }
  openForEdit(orderID: number): void {
    this.router.navigate(['/order/edit/' + orderID]);
  }

  onOrderDelete(id: number): void {
    if (!this.authService.canDeleteOrderView) {
      alert('Access Denied: You do not have permission to delete orders.');
      return;
    }

    if (confirm('Are you sure you want to delete this order record?')) {
      this.orderService.deleteOrder(id).then(() => {
        this.refreshList();
        alert('Order deleted successfully.');
      }).catch((err: any) => {
        console.error('Error deleting order:', err);
        alert('Failed to delete order.');
      });
    }
  }
}