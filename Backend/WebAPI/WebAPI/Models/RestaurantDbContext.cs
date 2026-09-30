using System.Data.Entity;

namespace WebAPI.Models
{
    public class RestaurantDbContext : DbContext
    {
        public RestaurantDbContext() : base("name=RestaurentDBEntities2")
        {
            this.Configuration.ProxyCreationEnabled = false;
        }

        public virtual DbSet<Customer> Customers { get; set; }
        public virtual DbSet<Item> Items { get; set; }
        public virtual DbSet<Order> Orders { get; set; }
        public virtual DbSet<OrderItem> OrderItems { get; set; }
        public virtual DbSet<Users> Users { get; set; }
    }
}