import { Component, OnInit, ElementRef, ViewChild, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface Message {
  sender: 'bot' | 'user';
  text: string;
  time: string;
}
export interface Item {
  ItemID: number;
  Name: string;
  Price: number;
}
export interface Customer {
  CustomerID: number;
  Name: string;
}
export interface OrderItemPayload {
  ItemID: number;
  Quantity: number;
}
export interface OrderData {
  CustomerName: string;
  CustomerID: number;
  PMethod: string;
  GTotal: number;
  OrderItems: OrderItemPayload[];
  ItemDetails: string;
}
@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.html',
  styleUrls: ['./chatbot.css']
})
export class ChatbotComponent implements OnInit {
  @ViewChild('chatScroll') private chatScrollContainer!: ElementRef;
  isOpen: boolean = false;
  userMessage: string = '';
  messages: Message[] = [];
  step: number = 0;
  orderData: OrderData = {
    CustomerName: '',
    CustomerID: 0,
    PMethod: '',
    GTotal: 0,
    OrderItems: [],
    ItemDetails: ''
  };
  menuItems: Item[] = [];
  customerList: Customer[] = [];
  readonly rootURL = 'https://localhost:44309/api';
  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}
  ngOnInit(): void {
    this.loadMenuItemsFromDB();
    this.loadCustomersFromDB();
    this.addBotMessage(
      'Hello! Welcome to the Restaurant AI Assistant.\nWould you like to place an order? (Type: "Menu" or "Yes")'
    );
  }
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || localStorage.getItem('userToken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }
  loadMenuItemsFromDB(): void {
    const headers = this.getAuthHeaders();
    this.http.get<any[]>(`${this.rootURL}/Item`, { headers }).subscribe({
      next: (res) => {
        this.menuItems = (res || []).map((item: any) => ({
          ItemID: Number(item.ItemID || item.ItemId || item.id),
          Name: (item.Name || item.ItemName || 'Item').toString().trim(),
          Price: Number(item.Price || 0)
        }));
      },
      error: (err) => console.error('Error fetching items:', err)
    });
  }
  loadCustomersFromDB(): void {
    const headers = this.getAuthHeaders();
    this.http.get<any[]>(`${this.rootURL}/Customer`, { headers }).subscribe({
      next: (res) => {
        this.customerList = (res || []).map((c: any) => ({
          CustomerID: Number(c.CustomerID || c.CustomerId || c.id),
          Name: (c.Name || c.CustomerName || 'Customer').toString().trim()
        }));
      },
      error: (err) => console.error('Error fetching customers:', err)
    });
  }
  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      setTimeout(() => this.scrollToBottom(), 50);
    }
  }
  scrollToBottom(): void {
    try {
      if (this.chatScrollContainer && this.chatScrollContainer.nativeElement) {
        this.chatScrollContainer.nativeElement.scrollTop = this.chatScrollContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }
  sendMessage(): void {
    if (!this.userMessage.trim()) return;
    const input = this.userMessage.trim();
    this.addUserMessage(input);
    this.userMessage = '';

    this.ngZone.run(() => {
      this.processUserInput(input);
    });
  }
  processUserInput(input: string): void {
    const text = input.toLowerCase();
    // Step 0: Greeting and Menu Display
    if (this.step === 0) {
      if (text.includes('menu') || text.includes('list') || text.includes('yes') || text.includes('order')) {
        if (!this.menuItems || this.menuItems.length === 0) {
          this.addBotMessage('Fetching menu from database, please wait a moment...');
          this.loadMenuItemsFromDB();
          return;
        }
        let menuMsg = 'Here is our Menu:\n';
        this.menuItems.forEach((item, index) => {
          menuMsg += `${index + 1}. ${item.Name} - Rs. ${item.Price}\n`;
        });
        menuMsg += '\nWhich items and quantities would you like to order?';
        this.addBotMessage(menuMsg);
        this.step = 1;
      } else {
        this.addBotMessage('I am here to assist you with ordering. Please type "Menu" to view available dishes.');
      }
      return;
    }
    // Step 1: Detect Multiple Items & Quantities (Strict Non-Duplicate Matching)
    if (this.step === 1) {
      const detectedItems: OrderItemPayload[] = [];
      let totalBill = 0;
      const detailsList: string[] = [];
      let workingText = (' ' + text + ' ').replace(/,/g, ' and ');
      // Sort menu items by name length in descending order to match longer names first
      const sortedMenu = [...this.menuItems].sort((a, b) => b.Name.length - a.Name.length);
      for (const item of sortedMenu) {
        const itemNameLower = item.Name.toLowerCase().trim();
        const escapedName = itemNameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Regex captures quantity either before or after item name 
        const regex = new RegExp(`(?:(\\d+)\\s*(?:x)?\\s*${escapedName}|${escapedName}\\s*(?:x)?\\s*(\\d+)|${escapedName})`, 'i');
        const match = workingText.match(regex);
        if (match) {
          let qty = 1;
          if (match[1]) {
            qty = parseInt(match[1], 10);
          } else if (match[2]) {
            qty = parseInt(match[2], 10);
          }
          const itemTotal = item.Price * qty;
          totalBill += itemTotal;
          detectedItems.push({
            ItemID: item.ItemID,
            Quantity: qty
          });
          detailsList.push(`${qty}x ${item.Name} (Rs. ${itemTotal})`);
          // Remove the matched substring to avoid duplicate matches
          workingText = workingText.replace(match[0], ' ');
        }
      }
      if (detectedItems.length > 0) {
        this.orderData.OrderItems = detectedItems;
        this.orderData.GTotal = totalBill;
        this.orderData.ItemDetails = detailsList.join(', ');
        this.addBotMessage(
          `Selected Items:\n- ${detailsList.join('\n- ')}\n\n` +
          `Total Bill: Rs. ${totalBill}\n\n` +
          `Please provide the Customer Name for this order:`
        );
        this.step = 2;
      } else {
        this.addBotMessage('Sorry, I could not recognize any item from your message. Please mention the items as shown in the menu list.');
      }
      return;
    }
    // Step 2: Capture Customer Name
    if (this.step === 2) {
      this.orderData.CustomerName = input.trim();
      let matched = this.customerList.find(c => c.Name.toLowerCase() === input.trim().toLowerCase());
      if (!matched && this.customerList.length > 0) {
        matched = this.customerList[0];
      }
      this.orderData.CustomerID = matched ? matched.CustomerID : 1;
      this.addBotMessage(`Thank you, ${this.orderData.CustomerName}! What payment method will you use? (Cash or Card?)`);
      this.step = 3;
      return;
    }
    // Step 3: Payment Method and Submit Order
    if (this.step === 3) {
      if (text.includes('card') || text.includes('online') || text.includes('credit')) {
        this.orderData.PMethod = 'Card';
      } else {
        this.orderData.PMethod = 'Cash';
      }
      this.addBotMessage('Connecting to database and saving your order...');
      this.submitOrderToBackend();
      return;
    }
  }
  submitOrderToBackend(): void {
    const headers = this.getAuthHeaders();
    let validCustID = Number(this.orderData.CustomerID);
    if (!validCustID || isNaN(validCustID) || validCustID <= 0) {
      validCustID = this.customerList.length > 0 ? this.customerList[0].CustomerID : 1;
    }
    const payload = {
      OrderID: 0,
      OrderNo: Math.floor(100000 + Math.random() * 900000).toString(),
      CustomerID: validCustID,
      PMethod: this.orderData.PMethod || 'Cash',
      GTotal: Number(this.orderData.GTotal),
      DeletedOrderItemIDs: '',
      OrderItems: (this.orderData.OrderItems || []).map((item: OrderItemPayload) => ({
        ItemID: Number(item.ItemID),
        Quantity: Number(item.Quantity) || 1
      }))
    };
    console.log('Sending Order Payload to Backend:', payload);
    this.http.post(`${this.rootURL}/Order`, payload, { headers }).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.addBotMessage(
            `Your order has been placed successfully!\n\n` +
            `Order No: #${payload.OrderNo}\n` +
            `Customer: ${this.orderData.CustomerName}\n` +
            `Items:\n- ${this.orderData.ItemDetails.split(', ').join('\n- ')}\n` +
            `Payment: ${payload.PMethod}\n` +
            `Grand Total: Rs. ${payload.GTotal}\n\n` +
            `Type "Menu" to place another order.`
          );
          this.resetOrder();
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Order Submission Error:', err);
        this.ngZone.run(() => {
          this.addBotMessage(
            `Could not save to database.\nStatus: ${err.status} (${err.statusText || 'Error'})\n` +
            `Check console for API details.`
          );
          this.resetOrder();
          this.cdr.detectChanges();
        });
      }
    });
  }
  resetOrder(): void {
    this.step = 0;
    this.orderData = {
      CustomerName: '',
      CustomerID: 0,
      PMethod: '',
      GTotal: 0,
      OrderItems: [],
      ItemDetails: ''
    };
  }
  addBotMessage(text: string): void {
    this.messages.push({
      sender: 'bot',
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    this.cdr.detectChanges();
    setTimeout(() => this.scrollToBottom(), 10);
  }
  addUserMessage(text: string): void {
    this.messages.push({
      sender: 'user',
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    this.cdr.detectChanges();
    setTimeout(() => this.scrollToBottom(), 10);
  }
}