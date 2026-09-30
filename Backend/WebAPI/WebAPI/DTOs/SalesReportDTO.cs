using System;
using System.Collections.Generic;

namespace WebAPI.DTOs
{
    public class SalesReportViewModel
    {
        public decimal TotalRevenue { get; set; }
        public int TotalOrders { get; set; }
        public List<TopSellingItemDto> TopSellingItems { get; set; } = new List<TopSellingItemDto>();
        public List<SalesReportDetailDto> ReportDetails { get; set; } = new List<SalesReportDetailDto>();
    }

    public class TopSellingItemDto
    {
        public string ItemName { get; set; }
        public int QuantitySold { get; set; }
        public decimal TotalSales { get; set; }
    }

    public class SalesReportDetailDto
    {
        public string OrderNo { get; set; }
        public string CustomerName { get; set; }
        public DateTime? OrderDate { get; set; }
        public string PMethod { get; set; }
        public string ItemName { get; set; }
        public int Quantity { get; set; }
        public decimal Price { get; set; }
        public decimal ItemTotal { get; set; }
    }
}