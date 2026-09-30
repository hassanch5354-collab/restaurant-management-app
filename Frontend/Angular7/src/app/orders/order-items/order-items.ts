import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ItemService } from '../../shared/item.service';
import { Item } from '../../shared/item.model';
import { OrderService } from '../../shared/order.service';

@Component({
  selector: 'app-order-items',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-items.html',
})
export class OrderItemsComponent implements OnInit {
  formData: any = {
    OrderItemID: 0,
    OrderID: 0,
    ItemID: 0,
    ItemName: '',
    Price: 0,
    Quantity: 1,
    Total: 0
  };
  itemList: Item[] = [];
  orderItemIndex: number = -1;

  constructor(
    private itemService: ItemService,
    private orderService: OrderService,
    private router: Router,
    private currentRoute: ActivatedRoute,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const indexParam = this.currentRoute.snapshot.paramMap.get('id');
    const orderIDParam = this.currentRoute.snapshot.paramMap.get('orderID');

    this.orderItemIndex = indexParam !== null ? parseInt(indexParam, 10) : -1;
    const orderID = orderIDParam !== null ? parseInt(orderIDParam, 10) : 0;

    this.itemService.getItemList().subscribe({
      next: (res: any) => {
        this.itemList = res as Item[];
        this.cd.detectChanges();
      },
      error: (err: any) => console.error('Item fetch failed:', err)
    });

    if (this.orderItemIndex === -1) {
      this.formData = {
        OrderItemID: 0,
        OrderID: orderID,
        ItemID: 0,
        ItemName: '',
        Price: 0,
        Quantity: 1,
        Total: 0
      };
    } else {
      this.formData = Object.assign({}, this.orderService.orderItems[this.orderItemIndex]);
    }
  }

  updatePrice(ctrl: any): void {
    if (ctrl.selectedIndex === 0) {
      this.formData.Price = 0;
      this.formData.ItemName = '';
    } else {
      const selectedItem = this.itemList[ctrl.selectedIndex - 1];
      if (selectedItem) {
        this.formData.Price = selectedItem.Price;
        this.formData.ItemName = selectedItem.Name;
      }
    }
    this.updateTotal();
  }

  updateTotal(): void {
    const qty = Number(this.formData.Quantity) || 0;
    const price = Number(this.formData.Price) || 0;
    this.formData.Total = parseFloat((qty * price).toFixed(2));
    this.cd.detectChanges();
  }

  onSubmit(form: NgForm): void {
    if (this.validateForm()) {
      if (this.orderItemIndex === -1) {
        this.orderService.orderItems.push(this.formData);
      } else {
        this.orderService.orderItems[this.orderItemIndex] = this.formData;
      }
      this.orderService.saveStateToStorage();
      this.router.navigate(['/order']);
    }
  }

  validateForm(): boolean {
    if (!this.formData.ItemID || this.formData.ItemID == 0 || this.formData.ItemID === '0') {
      alert('Please select Food Item.');
      return false;
    }
    if (this.formData.Quantity <= 0) {
      alert('Quantity must be greater than 0.');
      return false;
    }
    return true;
  }

  onClose(): void {
    this.router.navigate(['/order']);
  }
}