import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../Services/auth.service';

export const AuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  // 1. Verify that the user is logged in
  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }
  // 2. Grant unrestricted access if user has the Admin role
  const userRole = (authService.getUserRole() || '').toLowerCase();
  if (userRole === 'admin') {
    return true;
  }
  // 3. Enforce specific permission requirements on protected routes
  const expectedPermission = route.data ? (route.data as any)['permission'] : null;
  if (expectedPermission) {
    const hasRight = authService.hasPermission(expectedPermission);
    if (!hasRight) {
      alert('Access Denied: You do not have permission to access this page.');
      router.navigate(['/orders']);
      return false;
    }
  }
  return true;
};