import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { OrdersComponent } from './orders/orders';
import { OrderComponent } from './orders/order/order';
import { OrderItemsComponent } from './orders/order-items/order-items';
import { SalesReportComponent } from './orders/sales-report/sales-report';
import { DashboardComponent } from './dashboard/dashboard';
import { LoginComponent } from './login/login';
import { AuthGuard } from './Guards/auth-guard';
import { AuthService } from '../Services/auth.service';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: () => {
      const auth = inject(AuthService);
      if (!auth.isLoggedIn()) return 'login';
      const role = (auth.getUserRole() || '').toLowerCase();
      if (role === 'admin') return 'dashboard';
      if (role === 'waiter') return 'order';
      return 'orders';
    }
  },

  { path: 'login', component: LoginComponent },

  { 
    path: 'dashboard', 
    component: DashboardComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'orders', 
    component: OrdersComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'order', 
    component: OrderComponent, 
    canActivate: [AuthGuard]
  },
  { 
    path: 'order/edit/:id', 
    component: OrderComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'order/order-item/:id/:orderID', 
    component: OrderItemsComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'sales-report', 
    component: SalesReportComponent, 
    canActivate: [AuthGuard],
    data: { permission: 'CanViewReports' }
  },

  { path: '**', redirectTo: 'dashboard' }
];