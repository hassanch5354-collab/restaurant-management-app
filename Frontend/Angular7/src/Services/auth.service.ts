import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

export interface PermissionItem {
  Permission_id?: number | string;
  Pemmission_id?: number | string;
  PermissionId?: number | string;
  id?: number | string;
  Id?: number | string;
  Permission_Name?: string;
  PermissionName?: string;
  name?: string;
  Role_Status?: number | boolean;
  Status?: number | boolean;
  Permission_Status?: number | boolean;
}

export interface AuthResponse {
  token?: string;
  Token?: string;
  userToken?: string;
  role?: string;
  Role?: string;
  userRole?: string;
  userName?: string;
  UserName?: string;
  username?: string;
  permissions?: PermissionItem[] | string;
  Permissions?: PermissionItem[] | string;
  userPermissions?: PermissionItem[] | string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  readonly rootURL = 'https://localhost:44309/api';

  // --- Public Flags (Default: false / Disabled) ---
  public canOrderListView: boolean = false;    // ID = 1 (Order List)
  public canSalesReportView: boolean = false;  // ID = 2 (Sale Order Report)
  public canNewOrderView: boolean = false;     // ID = 3 (New Order)
  public canEditOrderView: boolean = false;    // ID = 4 (Edit Order)
  public canDeleteOrderView: boolean = false;  // ID = 5 (Delete Order)

  constructor(private http: HttpClient, private router: Router) {
    // Synchronize permission flags when application loads or refreshes
    this.refreshUserPermissions();
  }

  login(formData: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.rootURL}/Auth/Login`, formData);
  }

  saveUserData(res: AuthResponse): void {
    if (!res) return;

    // 1. Save Token
    const token = res.Token || res.token || res.userToken;
    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('userToken', token);
    }

    // 2. Save Role
    const role = res.Role || res.role || res.userRole;
    if (role) {
      localStorage.setItem('role', role);
      localStorage.setItem('userRole', role);
    }

    // 3. Save Username
    const username = res.UserName || res.userName || res.username;
    if (username) {
      localStorage.setItem('username', username);
    }

    // 4. Save Permissions (array received from database stored procedure)
    const rawPerms = res.Permissions ?? res.permissions ?? res.userPermissions;
    if (rawPerms) {
      const permsToSave = typeof rawPerms === 'string' ? rawPerms : JSON.stringify(rawPerms);
      localStorage.setItem('permissions', permsToSave);
      localStorage.setItem('userPermissions', permsToSave);
    }

    // Update permissions immediately upon login
    this.refreshUserPermissions();
  }

  refreshUserPermissions(): void {
    // Step 1: Reset all flags to false by default
    this.canOrderListView = false;
    this.canSalesReportView = false;
    this.canNewOrderView = false;
    this.canEditOrderView = false;
    this.canDeleteOrderView = false;

    // Step 2: Evaluate permissions strictly against stored database records
    this.canOrderListView   = this.hasPermission(1, 'Order List');
    this.canSalesReportView = this.hasPermission(2, 'Sale Order Report');
    this.canNewOrderView    = this.hasPermission(3, 'New Order');
    this.canEditOrderView   = this.hasPermission(4, 'Edit Order');
    this.canDeleteOrderView = this.hasPermission(5, 'Delete Order');
  }

  // Permission checker supporting both ID and Name matching
  hasPermission(targetId: number, targetName?: string): boolean {
    const rawData = localStorage.getItem('permissions') || localStorage.getItem('userPermissions');
    if (!rawData) return false;

    try {
      const perms = JSON.parse(rawData);
      if (Array.isArray(perms)) {
        return perms.some((p: any) => {
          if (typeof p === 'object' && p !== null) {
            // Normalize column names based on potential DB schema variations
            const id = p.Permission_id ?? p.Pemmission_id ?? p.PermissionId ?? p.id ?? p.Id;
            const name = (p.Permission_Name ?? p.PermissionName ?? p.name ?? '').toString().trim().toLowerCase();

            // Status verification (if status flag exists in DB payload)
            const status = p.Role_Status ?? p.Status ?? p.Permission_Status;
            const isActive = status === undefined || status === 1 || status === true;

            // Match by target ID or name
            const isIdMatch = id !== undefined && Number(id) === targetId;
            const isNameMatch = targetName ? name === targetName.trim().toLowerCase() : false;

            return (isIdMatch || isNameMatch) && isActive;
          }

          // Direct primitive array checks (e.g., number[] or string[])
          if (typeof p === 'number') return p === targetId;
          if (typeof p === 'string' && targetName) return p.trim().toLowerCase() === targetName.trim().toLowerCase();
          return false;
        });
      }
      return false;
    } catch {
      return false;
    }
  }

  isLoggedIn(): boolean {
    return !!(localStorage.getItem('token') || localStorage.getItem('userToken'));
  }

  getUserRole(): string {
    return localStorage.getItem('role') || localStorage.getItem('userRole') || '';
  }

  logout(): void {
    localStorage.clear();
    this.canOrderListView = false;
    this.canSalesReportView = false;
    this.canNewOrderView = false;
    this.canEditOrderView = false;
    this.canDeleteOrderView = false;
    this.router.navigate(['/login']);
  }
}