using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Data.SqlClient;
using System.Linq;
using WebAPI.DTOs;
using WebAPI.Models;

namespace WebAPI.Services
{
    public class OrderService : IDisposable
    {
        private RestaurentDBEntities2 db = new RestaurentDBEntities2();

        // 1. Get All Orders
        public object GetAllOrders()
        {
            var result = (from a in db.Orders
                          join b in db.Customers on a.CustomerID equals b.CustomerID into cust
                          from b in cust.DefaultIfEmpty()
                          select new
                          {
                              a.OrderID,
                              a.OrderNo,
                              Customer = b == null ? "Walk-in Customer" : b.Name,
                              a.PMethod,
                              a.GTotal
                          }).ToList();

            return result;
        }

        // 2. Get Order By ID (For Editing)
        public object GetOrderById(long id)
        {
            var order = (from a in db.Orders
                         where a.OrderID == id
                         select new
                         {
                             a.OrderID,
                             a.OrderNo,
                             a.CustomerID,
                             a.PMethod,
                             a.GTotal,
                             DeletedOrderItemIDs = ""
                         }).FirstOrDefault();

            var orderDetails = (from a in db.OrderItems
                                join b in db.Items on a.ItemID equals b.ItemID
                                where a.OrderID == id
                                select new
                                {
                                    a.OrderID,
                                    a.OrderItemID,
                                    a.ItemID,
                                    ItemName = b.Name,
                                    b.Price,
                                    a.Quantity,
                                    Total = a.Quantity * b.Price
                                }).ToList();

            return new { order, orderDetails };
        }

        // 3. Save Or Update Order (Raw SQL Execution to bypass EF Relationship Errors)
        public void SaveOrUpdateOrder(Order order)
        {
            if (order.OrderID == 0)
            {
                // Raw SQL se parent Order insert karein taake exact new ID mil jaye
                string insertOrderQuery = @"
                    INSERT INTO [Order] (OrderNo, CustomerID, PMethod, GTotal) 
                    VALUES (@OrderNo, @CustomerID, @PMethod, @GTotal);
                    SELECT CAST(SCOPE_IDENTITY() AS BIGINT);";

                long newOrderId = db.Database.SqlQuery<long>(
                    insertOrderQuery,
                    new SqlParameter("@OrderNo", (object)order.OrderNo ?? DBNull.Value),
                    new SqlParameter("@CustomerID", (object)order.CustomerID ?? DBNull.Value),
                    new SqlParameter("@PMethod", (object)order.PMethod ?? DBNull.Value),
                    new SqlParameter("@GTotal", (object)order.GTotal ?? DBNull.Value)
                ).FirstOrDefault();

                // Har item ko direct insert karein bina kisi EF Key conflict ke
                if (order.OrderItems != null && order.OrderItems.Any())
                {
                    foreach (var item in order.OrderItems)
                    {
                        string insertItemQuery = @"
                            INSERT INTO [OrderItems] (OrderID, ItemID, Quantity) 
                            VALUES (@OrderID, @ItemID, @Quantity);";

                        db.Database.ExecuteSqlCommand(
                            insertItemQuery,
                            new SqlParameter("@OrderID", newOrderId),
                            new SqlParameter("@ItemID", item.ItemID),
                            new SqlParameter("@Quantity", item.Quantity)
                        );
                    }
                }
            }
            else
            {
                // Existing order update
                string updateOrderQuery = @"
                    UPDATE [Order] 
                    SET OrderNo = @OrderNo, CustomerID = @CustomerID, PMethod = @PMethod, GTotal = @GTotal 
                    WHERE OrderID = @OrderID";

                db.Database.ExecuteSqlCommand(
                    updateOrderQuery,
                    new SqlParameter("@OrderNo", (object)order.OrderNo ?? DBNull.Value),
                    new SqlParameter("@CustomerID", (object)order.CustomerID ?? DBNull.Value),
                    new SqlParameter("@PMethod", (object)order.PMethod ?? DBNull.Value),
                    new SqlParameter("@GTotal", (object)order.GTotal ?? DBNull.Value),
                    new SqlParameter("@OrderID", order.OrderID)
                );

                // Deleted items remove karein
                if (!string.IsNullOrEmpty(order.DeletedOrderItemIDs))
                {
                    var idsToDelete = order.DeletedOrderItemIDs
                        .Split(new char[] { ',' }, StringSplitOptions.RemoveEmptyEntries)
                        .Select(long.Parse)
                        .ToList();

                    foreach (var id in idsToDelete)
                    {
                        db.Database.ExecuteSqlCommand("DELETE FROM [OrderItems] WHERE OrderItemID = @ID", new SqlParameter("@ID", id));
                    }
                }

                // Line items insert ya update
                if (order.OrderItems != null)
                {
                    foreach (var item in order.OrderItems)
                    {
                        if (item.OrderItemID == 0)
                        {
                            string insertItemQuery = @"
                                INSERT INTO [OrderItems] (OrderID, ItemID, Quantity) 
                                VALUES (@OrderID, @ItemID, @Quantity);";

                            db.Database.ExecuteSqlCommand(
                                insertItemQuery,
                                new SqlParameter("@OrderID", order.OrderID),
                                new SqlParameter("@ItemID", item.ItemID),
                                new SqlParameter("@Quantity", item.Quantity)
                            );
                        }
                        else
                        {
                            string updateItemQuery = @"
                                UPDATE [OrderItems] 
                                SET ItemID = @ItemID, Quantity = @Quantity 
                                WHERE OrderItemID = @OrderItemID";

                            db.Database.ExecuteSqlCommand(
                                updateItemQuery,
                                new SqlParameter("@ItemID", item.ItemID),
                                new SqlParameter("@Quantity", item.Quantity),
                                new SqlParameter("@OrderItemID", item.OrderItemID)
                            );
                        }
                    }
                }
            }
        }

        // 4. Delete Order
        public void DeleteOrder(long id)
        {
            db.Database.ExecuteSqlCommand("DELETE FROM [OrderItems] WHERE OrderID = @OrderID", new SqlParameter("@OrderID", id));
            db.Database.ExecuteSqlCommand("DELETE FROM [Order] WHERE OrderID = @OrderID", new SqlParameter("@OrderID", id));
        }

        // 5. Sales Report via Stored Procedure
        public SalesReportViewModel GetSalesReportData(DateTime? fromDate, DateTime? toDate)
        {
            var pFromDate = new SqlParameter("@FromDate", (object)fromDate ?? DBNull.Value);
            var pToDate = new SqlParameter("@ToDate", (object)toDate ?? DBNull.Value);

            var rawDetails = db.Database.SqlQuery<SalesReportDetailDto>(
                "EXEC sp_GetSalesReport @FromDate, @ToDate",
                pFromDate,
                pToDate
            ).ToList() ?? new List<SalesReportDetailDto>();

            if (!rawDetails.Any())
            {
                return new SalesReportViewModel
                {
                    TotalOrders = 0,
                    TotalRevenue = 0,
                    TopSellingItems = new List<TopSellingItemDto>(),
                    ReportDetails = new List<SalesReportDetailDto>()
                };
            }

            int totalOrders = rawDetails.Select(x => x.OrderNo).Distinct().Count();
            decimal totalRevenue = rawDetails.Sum(x => x.ItemTotal);

            var topItems = rawDetails
                .GroupBy(x => x.ItemName)
                .Select(g => new TopSellingItemDto
                {
                    ItemName = g.Key,
                    QuantitySold = g.Sum(x => x.Quantity),
                    TotalSales = g.Sum(x => x.ItemTotal)
                })
                .OrderByDescending(x => x.QuantitySold)
                .Take(5)
                .ToList();

            return new SalesReportViewModel
            {
                TotalOrders = totalOrders,
                TotalRevenue = totalRevenue,
                TopSellingItems = topItems,
                ReportDetails = rawDetails
            };
        }

        public void Dispose()
        {
            if (db != null)
            {
                db.Dispose();
            }
        }
    }
}