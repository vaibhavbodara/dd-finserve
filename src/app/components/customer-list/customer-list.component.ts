import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CustomerEntry } from '../../models/customer.model';
import { CustomerService } from '../../services/customer.service';
import { CustomerDialogComponent } from '../customer-dialog/customer-dialog.component';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  templateUrl: './customer-list.component.html',
  styleUrls: ['./customer-list.component.css'],
})
export class CustomerListComponent implements OnInit {
  private customerService = inject(CustomerService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  customers: CustomerEntry[] = [];
  filteredCustomers: CustomerEntry[] = [];
  isLoading = false;

  // Filter properties
  searchTerm = '';
  selectedStatus = 'All';
  selectedCollector = 'All';

  // Collectors list
  collectors: string[] = ['All', 'Agent Rahul', 'Agent Suresh', 'Agent Priya', 'Agent Amit', 'Office Branch'];

  // Table columns
  displayedColumns: string[] = [
    'customerId',
    'name',
    'mobileNumber',
    'address',
    'loanAmount',
    'dailyEMI',
    'totalEMI',
    'dates',
    'collectorName',
    'kycDocument',
    'status',
    'actions',
  ];

  // Metrics
  get totalCustomers(): number {
    return this.customers.length;
  }
  get activeLoansCount(): number {
    return this.customers.filter((c) => c.status === 'Active').length;
  }
  get totalDisbursedAmount(): number {
    return this.customers.reduce((sum, c) => sum + (c.loanAmount || 0), 0);
  }
  get overdueCount(): number {
    return this.customers.filter((c) => c.status === 'Overdue').length;
  }

  ngOnInit() {
    this.loadCustomers();
  }

  loadCustomers() {
    this.isLoading = true;
    this.customerService.getCustomers().subscribe({
      next: (data) => {
        this.customers = data;
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('Error loading customers from server', 'Close', { duration: 3000 });
      },
    });
  }

  applyFilters() {
    let list = [...this.customers];

    if (this.selectedStatus && this.selectedStatus !== 'All') {
      list = list.filter((c) => c.status === this.selectedStatus);
    }

    if (this.selectedCollector && this.selectedCollector !== 'All') {
      list = list.filter((c) => c.collectorName === this.selectedCollector);
    }

    if (this.searchTerm && this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.customerId.toLowerCase().includes(term) ||
          c.mobileNumber.includes(term) ||
          c.address.toLowerCase().includes(term) ||
          c.collectorName.toLowerCase().includes(term)
      );
    }

    this.filteredCustomers = list;
  }

  openAddCustomerDialog() {
    const dialogRef = this.dialog.open(CustomerDialogComponent, {
      width: '800px',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result: Partial<CustomerEntry> | undefined) => {
      if (result) {
        this.customerService.createCustomer(result).subscribe({
          next: () => {
            this.snackBar.open('Customer Entry created successfully!', 'OK', { duration: 3500 });
            this.loadCustomers();
          },
          error: (err) => {
            this.snackBar.open(err.error?.message || 'Failed to save customer', 'Close', { duration: 4000 });
          },
        });
      }
    });
  }

  editCustomer(customer: CustomerEntry) {
    const dialogRef = this.dialog.open(CustomerDialogComponent, {
      width: '800px',
      data: { ...customer },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result: Partial<CustomerEntry> | undefined) => {
      if (result && customer._id) {
        this.customerService.updateCustomer(customer._id, result).subscribe({
          next: () => {
            this.snackBar.open('Customer details updated successfully', 'OK', { duration: 3000 });
            this.loadCustomers();
          },
        });
      }
    });
  }

  deleteCustomer(customer: CustomerEntry) {
    if (confirm(`Are you sure you want to delete customer "${customer.name}" (${customer.customerId})?`)) {
      if (customer._id) {
        this.customerService.deleteCustomer(customer._id).subscribe({
          next: () => {
            this.snackBar.open(`Customer ${customer.name} deleted`, 'OK', { duration: 3000 });
            this.loadCustomers();
          },
        });
      }
    }
  }

  viewKyc(customer: CustomerEntry) {
    if (!customer.kycDocument || !customer.kycDocument.fileData) {
      if (customer.kycDocument?.fileName) {
        this.snackBar.open(`Document: ${customer.kycDocument.fileName} (Uploaded)`, 'OK', { duration: 3000 });
      } else {
        this.snackBar.open('No KYC document uploaded for this customer', 'OK', { duration: 2500 });
      }
      return;
    }

    // Open image or PDF in new tab if base64 data available
    const win = window.open();
    if (win) {
      if (customer.kycDocument.fileType.includes('pdf')) {
        win.document.write(
          `<iframe src="${customer.kycDocument.fileData}" frameborder="0" style="border:0; top:0; left:0; bottom:0; right:0; width:100%; height:100%;" allowfullscreen></iframe>`
        );
      } else {
        win.document.write(
          `<div style="display:flex; justify-content:center; align-items:center; height:100vh; background:#0f172a;"><img src="${customer.kycDocument.fileData}" style="max-width:90%; max-height:90vh; border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.5);" alt="KYC Document" /></div>`
        );
      }
    }
  }
}
