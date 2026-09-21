import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CustomerEntry, PaymentRecord, EmiFrequency } from '../../models/customer.model';
import { CustomerService } from '../../services/customer.service';

export type PaymentFilterTab = 'all' | 'paid' | 'pending' | 'overdue';

@Component({
  selector: 'app-customer-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  templateUrl: './customer-detail-dialog.component.html',
  styleUrls: ['./customer-detail-dialog.component.css'],
})
export class CustomerDetailDialogComponent implements OnInit {
  private snackBar = inject(MatSnackBar);
  private customerService = inject(CustomerService);
  dialogRef = inject(MatDialogRef<CustomerDetailDialogComponent>);

  customer: CustomerEntry;
  schedule: PaymentRecord[] = [];
  filteredSchedule: PaymentRecord[] = [];

  activeTab: PaymentFilterTab = 'all';
  searchQuery = '';
  isSaving = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: CustomerEntry) {
    this.customer = { ...data };
  }

  ngOnInit() {
    this.initSchedule();
    this.applyFilter();
  }

  // Generate or initialize date-wise schedule
  initSchedule() {
    const totalCount = Number(this.customer.totalEMI) || 100;
    const emi = Number(this.customer.dailyEMI) || Number(this.customer.emiAmount) || 100;
    const freq: EmiFrequency = this.customer.emiType || 'Daily';
    const startDate = new Date(this.customer.loanStartDate || this.customer.createdAt || new Date());
    const paidCount = Number(this.customer.paidEMI) || 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // If customer already has saved paymentRecords, use them as base
    const existingRecordsMap = new Map<number, PaymentRecord>();
    if (this.customer.paymentRecords && this.customer.paymentRecords.length > 0) {
      this.customer.paymentRecords.forEach((r) => existingRecordsMap.set(r.installmentNo, r));
    }

    const list: PaymentRecord[] = [];

    for (let i = 1; i <= totalCount; i++) {
      const dueDate = new Date(startDate);
      if (freq === 'Weekly') {
        dueDate.setDate(dueDate.getDate() + i * 7);
      } else if (freq === 'Monthly') {
        dueDate.setMonth(dueDate.getMonth() + i);
      } else {
        dueDate.setDate(dueDate.getDate() + i);
      }

      const dueDateMidnight = new Date(dueDate);
      dueDateMidnight.setHours(0, 0, 0, 0);

      const existing = existingRecordsMap.get(i);

      if (existing) {
        list.push({ ...existing, scheduledDate: dueDate });
      } else {
        // Compute default status based on paidCount and calendar date
        const isPaid = i <= paidCount;
        let status: 'Paid' | 'Pending' | 'Overdue' | 'Upcoming' = 'Upcoming';

        if (isPaid) {
          status = 'Paid';
        } else if (dueDateMidnight.getTime() < today.getTime()) {
          status = 'Overdue';
        } else if (dueDateMidnight.getTime() === today.getTime()) {
          status = 'Pending';
        } else {
          status = 'Upcoming';
        }

        list.push({
          installmentNo: i,
          scheduledDate: dueDate,
          amount: emi,
          status,
          paidDate: isPaid ? dueDate : undefined,
          paidAmount: isPaid ? emi : 0,
          paymentMode: isPaid ? 'Cash' : undefined,
          collectorName: isPaid ? (this.customer.collectorName || 'Agent Rahul') : undefined,
        });
      }
    }

    this.schedule = list;
  }

  // Summary Metrics Getters
  get paidInstallmentsCount(): number {
    return this.schedule.filter((s) => s.status === 'Paid').length;
  }

  get pendingInstallmentsCount(): number {
    return this.schedule.filter((s) => s.status === 'Pending' || s.status === 'Upcoming').length;
  }

  get overdueInstallmentsCount(): number {
    return this.schedule.filter((s) => s.status === 'Overdue').length;
  }

  get totalAmountCalculated(): number {
    return Number(this.customer.totalAmount) || this.customer.loanAmount || 0;
  }

  get totalPaidCalculated(): number {
    return this.schedule.reduce((acc, curr) => acc + (curr.paidAmount || (curr.status === 'Paid' ? curr.amount : 0)), 0);
  }

  get remainingBalanceCalculated(): number {
    return Math.max(0, this.totalAmountCalculated - this.totalPaidCalculated);
  }

  get collectionProgressPercentage(): number {
    if (this.schedule.length === 0) return 0;
    return Math.min(100, Math.round((this.paidInstallmentsCount / this.schedule.length) * 100));
  }

  get nextDueRecord(): PaymentRecord | undefined {
    return this.schedule.find((s) => s.status === 'Pending' || s.status === 'Overdue' || s.status === 'Upcoming');
  }

  // Filtering
  setTab(tab: PaymentFilterTab) {
    this.activeTab = tab;
    this.applyFilter();
  }

  applyFilter() {
    let result = [...this.schedule];

    if (this.activeTab === 'paid') {
      result = result.filter((s) => s.status === 'Paid');
    } else if (this.activeTab === 'pending') {
      result = result.filter((s) => s.status === 'Pending' || s.status === 'Upcoming');
    } else if (this.activeTab === 'overdue') {
      result = result.filter((s) => s.status === 'Overdue');
    }

    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      result = result.filter((s) => {
        const dStr = new Date(s.scheduledDate).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          weekday: 'short',
        }).toLowerCase();
        return (
          s.installmentNo.toString().includes(q) ||
          dStr.includes(q) ||
          s.status.toLowerCase().includes(q) ||
          s.amount.toString().includes(q)
        );
      });
    }

    this.filteredSchedule = result;
  }

  // Action: Mark an installment as Received
  markAsReceived(record: PaymentRecord, event?: Event) {
    if (event) event.stopPropagation();
    const emi = Number(this.customer.dailyEMI) || Number(this.customer.emiAmount) || record.amount;

    record.status = 'Paid';
    record.paidAmount = emi;
    record.paidDate = new Date();
    record.paymentMode = 'Cash';
    record.collectorName = this.customer.collectorName || 'Agent Rahul';

    this.syncCustomerStateAndSave(`Installment #${record.installmentNo} marked as Received (₹${emi})`);
  }

  // Action: Undo / Mark installment as Unpaid
  markAsUnpaid(record: PaymentRecord, event?: Event) {
    if (event) event.stopPropagation();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(record.scheduledDate);
    due.setHours(0, 0, 0, 0);

    record.status = due.getTime() < today.getTime() ? 'Overdue' : 'Pending';
    record.paidAmount = 0;
    record.paidDate = undefined;
    record.paymentMode = undefined;

    this.syncCustomerStateAndSave(`Installment #${record.installmentNo} reverted to ${record.status}`);
  }

  // Quick Action: Collect Next Due Installment
  collectNextDue() {
    const next = this.nextDueRecord;
    if (next) {
      this.markAsReceived(next);
    } else {
      this.snackBar.open('All installments for this customer are already paid!', 'OK', { duration: 3000 });
    }
  }

  // Persist updated records and customer totals
  private syncCustomerStateAndSave(successMessage: string) {
    const paidCount = this.paidInstallmentsCount;
    const totalPaid = this.totalPaidCalculated;
    const remaining = this.remainingBalanceCalculated;
    const isCompleted = remaining <= 0 || paidCount >= this.schedule.length;
    const isOverdue = this.overdueInstallmentsCount > 0 && !isCompleted;

    const newStatus: 'Active' | 'Completed' | 'Overdue' = isCompleted
      ? 'Completed'
      : (isOverdue ? 'Overdue' : 'Active');

    this.customer.paidEMI = paidCount;
    this.customer.totalPaid = totalPaid;
    this.customer.remainingBalance = remaining;
    this.customer.status = newStatus;
    this.customer.paymentRecords = this.schedule;

    this.applyFilter();

    if (!this.customer._id) {
      this.snackBar.open(successMessage, 'OK', { duration: 2500 });
      return;
    }

    this.isSaving = true;
    const updatePayload: Partial<CustomerEntry> = {
      paidEMI: paidCount,
      totalPaid,
      remainingBalance: remaining,
      status: newStatus,
      paymentRecords: this.schedule,
    };

    this.customerService.updateCustomer(this.customer._id, updatePayload).subscribe({
      next: () => {
        this.isSaving = false;
        this.snackBar.open(successMessage, 'OK', { duration: 3000 });
      },
      error: (err) => {
        this.isSaving = false;
        this.snackBar.open(err.error?.message || 'Could not save payment status', 'Close', { duration: 3000 });
      },
    });
  }

  // Export Date-wise Schedule to CSV/Excel
  exportToCsv() {
    const headers = ['Installment No', 'Due Date', 'Expected EMI (INR)', 'Status', 'Paid Amount (INR)', 'Received Date', 'Collector', 'Mode'];
    const rows = this.schedule.map((s) => [
      s.installmentNo,
      new Date(s.scheduledDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      s.amount,
      s.status,
      s.paidAmount || 0,
      s.paidDate ? new Date(s.paidDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
      s.collectorName || '—',
      s.paymentMode || '—',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DD_Finserve_Statement_${this.customer.customerId}_${this.customer.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.snackBar.open('Customer payment statement exported to Excel / CSV!', 'OK', { duration: 3000 });
  }

  printStatement() {
    window.print();
  }

  close() {
    this.dialogRef.close(this.customer);
  }
}
