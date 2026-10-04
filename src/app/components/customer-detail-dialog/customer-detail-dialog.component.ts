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

      const existing = existingRecordsMap.get(i);

      if (existing) {
        list.push({
          ...existing,
          scheduledDate: dueDate,
        });
      } else {
        const isPaid = i <= paidCount;
        list.push({
          installmentNo: i,
          scheduledDate: dueDate,
          amount: emi,
          status: isPaid ? 'Paid' : 'Upcoming',
          paidDate: isPaid ? dueDate : undefined,
          paidAmount: isPaid ? emi : 0,
          paymentMode: isPaid ? 'Cash' : undefined,
          collectorName: isPaid ? (this.customer.collectorName || 'Agent Rahul') : undefined,
        });
      }
    }

    this.schedule = list;
    this.recalculateRollingPayable();
  }

  // Recalculate rolling cumulative payable for each installment
  // Formula:
  // If customer misses day 1 (23 Sep), next day (24 Sep) payable = 24 Sep EMI + 200 penalty + 23 Sep EMI = 405.76
  // If customer misses 24 Sep, next day (25 Sep) payable = 25 Sep EMI + 200 penalty + 24 Sep payable = 708.64
  recalculateRollingPayable() {
    const penaltyPerDay = this.penaltyPerDay;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let runningUnpaidCount = 0;
    let runningUnpaidEmi = 0;
    let runningPenalty = 0;

    for (let i = 0; i < this.schedule.length; i++) {
      const rec = this.schedule[i];
      const dueDate = new Date(rec.scheduledDate);
      dueDate.setHours(0, 0, 0, 0);

      if (rec.status === 'Paid') {
        // Streak is reset once an installment is paid
        runningUnpaidCount = 0;
        runningUnpaidEmi = 0;
        runningPenalty = 0;
        rec.unpaidPreviousCount = 0;
        rec.previousUnpaidEmi = 0;
        rec.previousPenaltyAmount = 0;
        rec.cumulativePayable = rec.paidAmount || rec.amount;
        rec.totalPayable = rec.cumulativePayable;
        continue;
      }

      // Record preceding unpaid counts and penalties carried forward to this date
      rec.unpaidPreviousCount = runningUnpaidCount;
      rec.previousUnpaidEmi = Number(runningUnpaidEmi.toFixed(2));
      rec.previousPenaltyAmount = runningPenalty;

      // Cumulative payable for this date
      rec.cumulativePayable = Number((rec.amount + runningUnpaidEmi + runningPenalty).toFixed(2));
      rec.totalPayable = rec.cumulativePayable;

      // Determine date status
      if (dueDate.getTime() < today.getTime()) {
        rec.status = 'Overdue';
        // Missed this day: carries forward to the NEXT day with +₹200 penalty
        runningUnpaidCount += 1;
        runningUnpaidEmi += rec.amount;
        runningPenalty += penaltyPerDay;
        rec.penaltyAmount = runningPenalty;
      } else if (dueDate.getTime() === today.getTime()) {
        rec.status = 'Pending';
      } else {
        rec.status = 'Upcoming';
      }
    }
  }

  // Penalty & Overdue Getters
  get penaltyPerDay(): number {
    return Number(this.customer.penaltyPerDay) || 200;
  }

  get paidInstallmentsCount(): number {
    return this.schedule.filter((s) => s.status === 'Paid').length;
  }

  get pendingInstallmentsCount(): number {
    return this.schedule.filter((s) => s.status === 'Pending' || s.status === 'Upcoming').length;
  }

  get overdueInstallmentsCount(): number {
    return this.schedule.filter((s) => s.status === 'Overdue').length;
  }

  get overdueInstallments(): PaymentRecord[] {
    return this.schedule.filter((s) => s.status === 'Overdue');
  }

  get totalOverduePenalty(): number {
    return this.overdueInstallmentsCount * this.penaltyPerDay;
  }

  get totalOverdueEmiAmount(): number {
    return Number(this.overdueInstallments.reduce((acc, curr) => acc + curr.amount, 0).toFixed(2));
  }

  get totalOverduePayable(): number {
    return Number((this.totalOverdueEmiAmount + this.totalOverduePenalty).toFixed(2));
  }

  get todayDueRecord(): PaymentRecord | undefined {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.schedule.find((s) => {
      if (s.status === 'Paid') return false;
      const d = new Date(s.scheduledDate);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });
  }

  get todayEmiAmount(): number {
    if (this.todayDueRecord) return this.todayDueRecord.amount;
    return Number(this.customer.dailyEMI) || Number(this.customer.emiAmount) || 0;
  }

  get totalDueTodayWithPenalty(): number {
    // If today is scheduled, its cumulativePayable already reflects all previous overdue EMIs + penalties + today's EMI
    if (this.todayDueRecord && this.todayDueRecord.cumulativePayable) {
      return this.todayDueRecord.cumulativePayable;
    }
    if (this.overdueInstallmentsCount > 0) {
      return Number((this.totalOverduePayable + this.todayEmiAmount).toFixed(2));
    }
    return this.todayDueRecord ? this.todayDueRecord.amount : 0;
  }

  get totalAmountCalculated(): number {
    return Number(this.customer.totalAmount) || this.customer.loanAmount || 0;
  }

  get totalPaidCalculated(): number {
    return this.schedule.reduce((acc, curr) => acc + (curr.paidAmount || (curr.status === 'Paid' ? curr.amount : 0)), 0);
  }

  get totalPenaltyPaidCalculated(): number {
    return this.schedule.reduce((acc, curr) => {
      if (curr.status === 'Paid' && curr.isPenaltyPaid && curr.penaltyAmount) {
        return acc + curr.penaltyAmount;
      }
      return acc;
    }, 0);
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

    const targetNo = record.installmentNo;
    const now = new Date();
    const penaltyPerDay = this.penaltyPerDay;

    // Find all unpaid installments up to and including this one
    const toPay = this.schedule.filter((s) => s.status !== 'Paid' && s.installmentNo <= targetNo);
    if (toPay.length === 0) {
      toPay.push(record);
    }

    let totalCollectedAmount = 0;
    toPay.forEach((rec, idx) => {
      rec.status = 'Paid';
      rec.paidDate = now;
      rec.paymentMode = 'Cash';
      rec.collectorName = this.customer.collectorName || 'Agent Rahul';

      // For any preceding overdue installment in the streak, it was missed, so late fee of ₹200 was incurred
      if (idx < toPay.length - 1) {
        rec.isPenaltyPaid = true;
        rec.penaltyAmount = penaltyPerDay;
        rec.paidAmount = Number((rec.amount + penaltyPerDay).toFixed(2));
      } else {
        // The target installment itself
        rec.paidAmount = rec.amount;
        rec.penaltyAmount = 0;
        rec.isPenaltyPaid = false;
      }
      totalCollectedAmount += rec.paidAmount;
    });

    this.recalculateRollingPayable();

    const msg = toPay.length > 1
      ? `Collected installments up to #${targetNo} (Cleared ${toPay.length} installments with late penalties). Total: ₹${totalCollectedAmount.toFixed(2)}`
      : `Installment #${record.installmentNo} marked as Received (₹${record.amount})`;

    this.syncCustomerStateAndSave(msg);
  }

  // Action: Undo / Mark installment as Unpaid
  markAsUnpaid(record: PaymentRecord, event?: Event) {
    if (event) event.stopPropagation();

    record.paidAmount = 0;
    record.paidDate = undefined;
    record.paymentMode = undefined;
    record.isPenaltyPaid = false;
    record.penaltyAmount = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(record.scheduledDate);
    due.setHours(0, 0, 0, 0);

    record.status = due.getTime() < today.getTime() ? 'Overdue' : (due.getTime() === today.getTime() ? 'Pending' : 'Upcoming');

    this.recalculateRollingPayable();
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

  // Quick Action: Collect Oldest Overdue Installment
  collectNextOverdue() {
    const nextOverdue = this.schedule.find((s) => s.status === 'Overdue');
    if (nextOverdue) {
      this.markAsReceived(nextOverdue);
    } else {
      this.snackBar.open('No overdue installments remaining!', 'OK', { duration: 3000 });
    }
  }

  // Quick Action: Clear all Overdue installments + Today's EMI in one single step
  collectAllOverdueAndToday() {
    const overdueList = this.schedule.filter((s) => s.status === 'Overdue');
    const todayRec = this.todayDueRecord;
    const maxInstallmentNo = todayRec
      ? todayRec.installmentNo
      : (overdueList.length > 0 ? overdueList[overdueList.length - 1].installmentNo : 0);

    if (maxInstallmentNo === 0) {
      this.snackBar.open('No overdue or pending installments to collect today!', 'OK', { duration: 3000 });
      return;
    }

    const targetRec = this.schedule.find((s) => s.installmentNo === maxInstallmentNo);
    if (targetRec) {
      this.markAsReceived(targetRec);
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
    this.customer.overdueCount = this.overdueInstallmentsCount;
    this.customer.totalPenalty = this.totalOverduePenalty;
    this.customer.totalPenaltyPaid = this.totalPenaltyPaidCalculated;
    this.customer.totalDueToday = this.totalDueTodayWithPenalty;

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
      totalPenaltyPaid: this.customer.totalPenaltyPaid,
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
    const headers = [
      'Installment No',
      'Due Date',
      'Base EMI (INR)',
      'Previous Overdue EMIs (INR)',
      'Late Penalty (INR)',
      'Total Payable for Date (INR)',
      'Status',
      'Received Amount (INR)',
      'Received Date',
      'Collector',
      'Mode',
    ];
    const rows = this.schedule.map((s) => [
      s.installmentNo,
      new Date(s.scheduledDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      s.amount,
      s.previousUnpaidEmi || 0,
      s.previousPenaltyAmount || (s.status === 'Overdue' || s.isPenaltyPaid ? (s.penaltyAmount || this.penaltyPerDay) : 0),
      s.cumulativePayable || s.totalPayable || s.amount,
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
