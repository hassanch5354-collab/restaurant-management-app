import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../Services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent implements OnInit {
  formModel = {
    UserName: '',
    Password: ''
  };

  isLoading: boolean = false;
  errorMessage: string = '';
  showPassword: boolean = false;

  constructor(
    public authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}
  ngOnInit(): void {
    // Redirect already authenticated users to their designated landing page
    if (this.authService.isLoggedIn()) {
      this.redirectBasedOnRole();
    }
  }
/**
   * Submits user credentials, stores session data upon success, and routes by role.
   */
  onSubmit(form: NgForm): void {
    if (form.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.formModel).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.authService.saveUserData(res);
        this.redirectBasedOnRole();
        this.cdr.detectChanges(); // Trigger change detection on successful login
      },
      error: (err: any) => {
        this.isLoading = false;

        if (err.status === 400 || err.status === 401) {
          this.errorMessage = 'Incorrect Username or Password.';
        } else {
          this.errorMessage = 'Server connection error. Please try again.';
          console.error('Login error:', err);
        }

        this.cdr.detectChanges(); // Force UI update to show error immediately
      }
    });
  }
 /**
   * Navigates users to role-specific routes.
   */
  redirectBasedOnRole(): void {
    const role = (this.authService.getUserRole() || '').toLowerCase();

    if (role === 'admin') {
      this.router.navigateByUrl('/sales-report');
    } else if (role === 'waiter') {
      this.router.navigateByUrl('/order');
    } else {
      this.router.navigateByUrl('/orders');
    }
  }
}