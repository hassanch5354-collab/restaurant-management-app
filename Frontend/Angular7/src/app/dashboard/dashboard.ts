import { Component, ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements AfterViewInit {
  @ViewChild('paymentDonutCanvas') paymentDonutCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('topItemsPieCanvas') topItemsPieCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('revenueSplitDonutCanvas') revenueSplitDonutCanvas!: ElementRef<HTMLCanvasElement>;

  readonly rootURL = 'https://localhost:44309/api';
  totalRevenue: number = 0;
  totalOrdersCount: number = 0;
  cashOrdersCount: number = 0;
  cardOrdersCount: number = 0;
  paymentChart: any;
  itemsPieChart: any;
  revenueDonutChart: any;
  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}
  ngAfterViewInit(): void {
    this.fetchDashboardData();
  }
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || localStorage.getItem('userToken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }
  fetchDashboardData(): void {
    const headers = this.getAuthHeaders();
    this.http.get<any[]>(`${this.rootURL}/Order`, { headers }).subscribe({
      next: (orders) => {
        if (!orders || orders.length === 0) return;
        this.ngZone.run(() => {
          // 1. KPI Metrics
          this.totalOrdersCount = orders.length;
          this.totalRevenue = orders.reduce((sum, order) => sum + (Number(order.GTotal) || 0), 0);
          this.cashOrdersCount = orders.filter(order => (order.PMethod || '').toLowerCase() === 'cash').length;
          this.cardOrdersCount = orders.filter(order => (order.PMethod || '').toLowerCase() === 'card').length;
          this.cdr.detectChanges();
          // 2. Top Food Items Calculation (For Pie Chart)
          const itemQuantityMap: { [key: string]: number } = {};
          orders.forEach(order => {
            if (order.OrderItems && Array.isArray(order.OrderItems)) {
              order.OrderItems.forEach((oi: any) => {
                const name = oi.ItemName || (oi.Item && oi.Item.Name) || `Item #${oi.ItemID}`;
                const qty = Number(oi.Quantity) || 1;
                itemQuantityMap[name] = (itemQuantityMap[name] || 0) + qty;
              });
            }
          });
          const sortedItems = Object.entries(itemQuantityMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4);
          const itemLabels = sortedItems.length > 0 
            ? sortedItems.map(i => i[0]) 
            : ['Pasta Alfredo', 'Cold Drink', 'French Fries'];
          const itemCounts = sortedItems.length > 0 
            ? sortedItems.map(i => i[1]) 
            : [12, 19, 8];
          // 3. High Value vs Regular Value Orders (For 2nd Donut Chart)
          const highValueOrders = orders.filter(o => Number(o.GTotal) >= 100).length;
          const regularOrders = orders.length - highValueOrders;
          setTimeout(() => {
            this.renderPaymentDonut(this.cashOrdersCount, this.cardOrdersCount);
            this.renderTopItemsPie(itemLabels, itemCounts);
            this.renderRevenueSplitDonut(highValueOrders, regularOrders);
          }, 50);
        });
      },
      error: (err) => {
        console.error('Error fetching dashboard analytics data:', err);
      }
    });
  }
  // 1. Donut Chart: Cash vs Card
  renderPaymentDonut(cashCount: number, cardCount: number): void {
    if (this.paymentChart) this.paymentChart.destroy();
    const ctx = this.paymentDonutCanvas?.nativeElement?.getContext('2d');
    if (!ctx) return;
    this.paymentChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Cash', 'Card'],
        datasets: [{
          data: [cashCount, cardCount],
          backgroundColor: ['#2d6a4f', '#d4a373'],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }
  // 2. Pie Chart: Menu Items Share
  renderTopItemsPie(labels: string[], data: number[]): void {
    if (this.itemsPieChart) this.itemsPieChart.destroy();
    const ctx = this.topItemsPieCanvas?.nativeElement?.getContext('2d');
    if (!ctx) return;
    this.itemsPieChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: ['#1b4332', '#40916c', '#b78a28', '#e9c46a'],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }
  // 3. Donut Chart: Order Value Categories
  renderRevenueSplitDonut(highCount: number, regCount: number): void {
    if (this.revenueDonutChart) this.revenueDonutChart.destroy();
    const ctx = this.revenueSplitDonutCanvas?.nativeElement?.getContext('2d');
    if (!ctx) return;
    this.revenueDonutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Large Orders ', 'Regular Orders '],
        datasets: [{
          data: [highCount, regCount],
          backgroundColor: ['#52b788', '#c99738'],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }
}