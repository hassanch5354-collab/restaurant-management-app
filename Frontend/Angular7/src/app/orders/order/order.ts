import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { OrderService } from '../../shared/order.service';
import { CustomerService } from '../../shared/customer.service';
import { Customer } from '../../shared/customer.model';
import { ItemService } from '../../shared/item.service';

@Component({
  selector: 'app-order',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order.html',
})
export class OrderComponent implements OnInit {
  customerList: Customer[] = [];
  itemList: any[] = [];
  isValid: boolean = true;
  isSaving: boolean = false;

  constructor(
    public service: OrderService,
    private customerService: CustomerService,
    private itemService: ItemService,
    private router: Router,
    private currentRoute: ActivatedRoute,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const orderID = this.currentRoute.snapshot.paramMap.get('id');

    // Load master items list to automatically populate missing item names or prices
    this.itemService.getItemList().subscribe({
      next: (items: any) => {
        this.itemList = items || [];
        this.syncItemNamesAndPrices();
      }
    });

    if (orderID == null) {
      this.service.loadStateFromStorage();
      if (!this.service.formData || !this.service.formData.OrderNo) {
        this.resetForm();
      }
    } else {
      this.service.getOrderByID(parseInt(orderID, 10)).then((res: any) => {
        this.service.formData = {
          OrderID: res.order.OrderID,
          OrderNo: res.order.OrderNo,
          CustomerID: res.order.CustomerID,
          PMethod: res.order.PMethod,
          GTotal: res.order.GTotal,
          DeletedOrderItemIDs: ''
        };
        this.service.orderItems = res.orderDetails || [];
        this.syncItemNamesAndPrices();
        this.service.saveStateToStorage();
        this.cd.detectChanges();
      });
    }

    this.customerService.getCustomerList().subscribe({
      next: (res: any) => {
        this.customerList = res as Customer[];
        this.cd.detectChanges();
      },
      error: (err: any) => console.error('Failed to load customer list:', err)
    });

    this.updateGrandTotal();
    this.cd.detectChanges();
  }

  // Automatically fills in missing ItemName or Price from catalog items
  syncItemNamesAndPrices(): void {
    if (this.service.orderItems && this.service.orderItems.length > 0 && this.itemList.length > 0) {
      this.service.orderItems.forEach(item => {
        const match = this.itemList.find(x => (x.ItemID == item.ItemID || x.itemID == item.ItemID));
        if (match) {
          if (!item.ItemName || item.ItemName.trim() === '') {
            item.ItemName = match.Name || match.name || match.ItemName || 'Food Item';
          }
          if (!item.Price || Number(item.Price) === 0) {
            item.Price = Number(match.Price || match.price || 0);
          }
          item.Total = parseFloat((Number(item.Quantity) * Number(item.Price)).toFixed(2));
        }
      });
      this.updateGrandTotal();
      this.service.saveStateToStorage();
      this.cd.detectChanges();
    }
  }

  resetForm(form?: NgForm): void {
    if (form != null) form.resetForm();

    this.service.clearStateStorage();
    this.service.formData = {
      OrderID: 0,
      OrderNo: Math.floor(100000 + Math.random() * 900000).toString(),
      CustomerID: 0,
      PMethod: '',
      GTotal: 0,
      DeletedOrderItemIDs: ''
    };
    this.service.orderItems = [];
    this.service.saveStateToStorage();
    this.cd.detectChanges();
  }

  AddOrEditOrderItem(orderItemIndex: any, OrderID: any): void {
    this.service.saveStateToStorage();
    const index = (orderItemIndex !== null && orderItemIndex !== undefined) ? orderItemIndex : -1;
    const oID = (OrderID !== null && OrderID !== undefined && OrderID > 0) ? OrderID : (this.service.formData.OrderID || 0);
    this.router.navigateByUrl(`/order/order-item/${index}/${oID}`);
  }

  onDeleteOrderItem(orderItemID: number | null | undefined, i: number): void {
    if (orderItemID != null && orderItemID > 0) {
      this.service.formData.DeletedOrderItemIDs += orderItemID.toString() + ',';
    }
    this.service.orderItems.splice(i, 1);
    this.updateGrandTotal();
    this.service.saveStateToStorage();
    this.cd.detectChanges();
  }

  updateGrandTotal(): void {
    if (!this.service.orderItems) this.service.orderItems = [];
    this.service.formData.GTotal = this.service.orderItems.reduce((prev: number, curr: any) => {
      return prev + (Number(curr.Total) || 0);
    }, 0);
    this.service.formData.GTotal = parseFloat(this.service.formData.GTotal.toFixed(2));
    this.cd.detectChanges();
  }

  validateForm(): boolean {
    this.isValid = true;
    if (this.service.formData.CustomerID === 0 || !this.service.formData.CustomerID) {
      this.isValid = false;
      alert('Please select a Customer.');
    } else if (!this.service.formData.PMethod || this.service.formData.PMethod === '') {
      this.isValid = false;
      alert('Please select a Payment Method.');
    } else if (!this.service.orderItems || this.service.orderItems.length === 0) {
      this.isValid = false;
      alert('Please add at least one item.');
    }
    return this.isValid;
  }

  onSubmit(form: NgForm): void {
    if (this.validateForm()) {
      this.isSaving = true;

      this.service.saveOrUpdateOrder().subscribe({
        next: () => {
          this.isSaving = false;
          alert('Your order has been saved successfully.');
          this.resetForm();
          this.router.navigate(['/orders']);
        },
        error: (err: any) => {
          this.isSaving = false;
          console.error('Failed to save order:', err);
          alert('Failed to save order. Please check the server logs.');
          this.cd.detectChanges();
        }
      });
    }
  }
}