import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  loginForm!: FormGroup;
  hidePassword = true;
  isLoading = false;
  errorMessage = '';
  returnUrl = '/dashboard';

  demoAccounts = [
    {
      label: 'Branch Manager / Admin',
      email: 'admin@ddfinserve.com',
      password: 'admin123',
      icon: 'admin_panel_settings',
      badgeClass: 'badge-admin',
    },
    {
      label: 'Senior Loan Officer',
      email: 'officer@ddfinserve.com',
      password: 'officer123',
      icon: 'badge',
      badgeClass: 'badge-officer',
    },
    {
      label: 'Field Collection Agent',
      email: 'agent@ddfinserve.com',
      password: 'agent123',
      icon: 'directions_bike',
      badgeClass: 'badge-agent',
    },
  ];

  ngOnInit() {
    // If already logged in, redirect straight to dashboard
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';

    this.loginForm = this.fb.group({
      email: ['admin@ddfinserve.com', [Validators.required, Validators.email]],
      password: ['admin123', [Validators.required, Validators.minLength(4)]],
      rememberMe: [true],
    });
  }

  fillDemo(account: { email: string; password: string }) {
    this.loginForm.patchValue({
      email: account.email,
      password: account.password,
    });
    this.errorMessage = '';
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;

    this.authService.login({ email, password }).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.snackBar.open(res.message || 'Login successful!', 'OK', {
          duration: 3500,
        });
        this.router.navigateByUrl(this.returnUrl);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Invalid email or password. Please try again.';
      },
    });
  }
}
