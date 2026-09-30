import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../shared/order.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-sales-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sales-report.html',
})
export class SalesReportComponent implements OnInit {
  // Start and End dates remain empty by default to display all-time data
  fromDate: string = '';
  toDate: string = '';
  loading: boolean = false;

  salesReportData: any = {
    TotalOrders: 0,
    TotalRevenue: 0,
    TopSellingItems: [],
    ReportDetails: []
  };

  constructor(
    private orderService: OrderService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Initial fetch to load the entire report without date filters
    this.fetchReport();
  }

  /**
   * Fetches sales data from the backend using optional date filters.
   */
  fetchReport(): void {
    this.loading = true;
    const serviceAny = this.orderService as any;

    if (typeof serviceAny.getSalesReport === 'function') {
      serviceAny.getSalesReport(this.fromDate, this.toDate).subscribe({
        next: (res: any) => {
          this.salesReportData = res || this.salesReportData;
          this.loading = false;
          this.cd.detectChanges();
        },
        error: (err: any) => {
          console.error('Error loading sales report:', err);
          this.loading = false;
          this.cd.detectChanges();
        }
      });
    }
  }

  /**
   * Resets date filters to empty strings and reloads the full report.
   */
  resetFilter(): void {
    this.fromDate = '';
    this.toDate = '';
    this.fetchReport();
  }

  /**
   * Generates and downloads a formatted PDF report with executive summary metrics and tables.
   */
  exportToPDF(): void {
    const doc = new jsPDF('p', 'pt', 'a4');

    // Document Title
    doc.setFontSize(18);
    doc.setTextColor(33, 37, 41);
    doc.text('Sales & Analytical Report', 40, 45);

    // Filter Range Subtitle
    doc.setFontSize(10);
    doc.setTextColor(108, 117, 125);
    const dateRangeText = (this.fromDate && this.toDate) 
      ? `Period: ${this.fromDate} to ${this.toDate}` 
      : 'Period: All Time (Overall Report)';
    doc.text(dateRangeText, 40, 65);

    // Summary Metric: Total Revenue
    doc.setFontSize(12);
    doc.setTextColor(40, 167, 69);
    doc.text(
      `Total Revenue: $${Number(this.salesReportData.TotalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      40,
      95
    );

    // Summary Metric: Total Orders
    doc.setTextColor(23, 162, 184);
    doc.text(`Total Orders: ${this.salesReportData.TotalOrders || 0}`, 260, 95);

    // Table 1: Top 5 Best-Selling Items
    if (this.salesReportData.TopSellingItems && this.salesReportData.TopSellingItems.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(33, 37, 41);
      doc.text('Top 5 Best-Selling Items', 40, 130);

      const topRows = this.salesReportData.TopSellingItems.map((item: any) => [
        item.ItemName,
        item.QuantitySold,
        `$${Number(item.TotalSales || 0).toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: 140,
        head: [['Item Name', 'Units Sold', 'Total Revenue']],
        body: topRows,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 9 }
      });
    }

    // Table 2: Detailed Transaction Records
    const details = this.salesReportData.ReportDetails || [];
    if (details.length > 0) {
      const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 25 : 140;

      doc.setFontSize(12);
      doc.setTextColor(33, 37, 41);
      doc.text('Transaction Details', 40, finalY);

      const detailRows = details.map((row: any) => [
        row.OrderNo,
        row.CustomerName || 'Customer',
        row.OrderDate ? new Date(row.OrderDate).toLocaleDateString() : '',
        row.PMethod,
        row.ItemName || '-',
        row.Quantity || '1',
        `$${Number(row.Price || 0).toFixed(2)}`,
        `$${Number(row.ItemTotal || row.GTotal || 0).toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: finalY + 10,
        head: [['Order ID', 'Customer', 'Date', 'Pay Method', 'Item Description', 'Qty', 'Unit Price', 'Line Total']],
        body: detailRows,
        theme: 'grid',
        headStyles: { fillColor: [52, 73, 94] },
        styles: { fontSize: 8 }
      });
    }

    // Dynamic Filename Generation
    const filename = (this.fromDate && this.toDate) 
      ? `Sales_Report_${this.fromDate}_to_${this.toDate}.pdf`
      : 'Sales_Report_Overall.pdf';

    doc.save(filename);
  }
}