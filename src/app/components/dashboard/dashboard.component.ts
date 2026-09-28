import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CustomerService } from '../../services/customer.service';
import { DashboardMetrics, CustomerEntry } from '../../models/customer.model';
import { CustomerDialogComponent } from '../customer-dialog/customer-dialog.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  private customerService = inject(CustomerService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  metrics: DashboardMetrics = {
    totalCustomers: 0,
    todaysTotalEmi: 0,
    todaysReceived: 0,
    pendingEmi: 0,
    overdueCustomers: 0,
    activeLoansCount: 0,
    completedLoansCount: 0,
    efficiencyPercentage: 0,
    totalDisbursed: 0,
    totalOutstanding: 0,
    totalCollected: 0,
    planStats: {
      daily: 0,
      weekly: 0,
      monthly: 0,
    },
  };

  isLoading = true;
  currentDate = new Date();

  ngOnInit() {
    this.loadMetrics();
  }

  loadMetrics() {
    this.isLoading = true;
    this.cdr.markForCheck();
    this.customerService.getDashboardMetrics().subscribe({
      next: (data) => {
        if (data) {
          this.metrics = { ...data };
        }
        this.isLoading = false;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading dashboard metrics:', err);
        this.isLoading = false;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
    });
  }

  navigateToCustomers(statusFilter?: string) {
    if (statusFilter) {
      this.router.navigate(['/customers'], { queryParams: { status: statusFilter } });
    } else {
      this.router.navigate(['/customers']);
    }
  }

  navigateToCalculator() {
    this.router.navigate(['/calculator']);
  }

  openAddCustomerDialog() {
    const dialogRef = this.dialog.open(CustomerDialogComponent, {
      width: '800px',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result: Partial<CustomerEntry> | undefined) => {
      if (result) {
        this.customerService.createCustomer(result).subscribe({
          next: (saved) => {
            this.snackBar.open(`Customer "${saved.name}" added successfully!`, 'OK', { duration: 3500 });
            this.loadMetrics();
          },
          error: (err) => {
            this.snackBar.open(err.error?.message || 'Failed to add customer', 'Close', { duration: 4000 });
          },
        });
      }
    });
  }
}
