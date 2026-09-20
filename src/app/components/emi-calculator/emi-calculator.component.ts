import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CustomerDialogComponent } from '../customer-dialog/customer-dialog.component';
import { CustomerService } from '../../services/customer.service';
import { CustomerEntry, EmiFrequency } from '../../models/customer.model';

export interface ScheduleItem {
  installmentNo: number;
  dueDate: Date;
  emiAmount: number;
  principalPortion: number;
  interestPortion: number;
  remainingBalance: number;
}

export interface PlanComparison {
  frequency: EmiFrequency;
  title: string;
  hindiTitle: string;
  tenure: number;
  tenureUnit: string;
  emiAmount: number;
  emiUnit: string;
  icon: string;
}

@Component({
  selector: 'app-emi-calculator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  templateUrl: './emi-calculator.component.html',
  styleUrls: ['./emi-calculator.component.css'],
})
export class EmiCalculatorComponent implements OnInit {
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private customerService = inject(CustomerService);
  private router = inject(Router);

  // Inputs
  loanAmount: number = 10000;
  interestRate: number = 10;
  emiType: EmiFrequency = 'Daily';
  tenure: number = 100;
  startDate: string = new Date().toISOString().split('T')[0];

  // Preset values
  loanPresets: number[] = [5000, 10000, 20000, 30000, 50000, 100000];
  ratePresets: number[] = [5, 8, 10, 12, 15, 20];

  // Frequency specific tenure presets
  dailyTenurePresets = [
    { label: '30 Days (1 Mo)', value: 30 },
    { label: '50 Days', value: 50 },
    { label: '60 Days (2 Mo)', value: 60 },
    { label: '100 Days (Standard)', value: 100 },
    { label: '120 Days (4 Mo)', value: 120 },
  ];

  weeklyTenurePresets = [
    { label: '8 Weeks (~2 Mo)', value: 8 },
    { label: '12 Weeks (~3 Mo)', value: 12 },
    { label: '16 Weeks (~4 Mo)', value: 16 },
    { label: '24 Weeks (~6 Mo)', value: 24 },
    { label: '52 Weeks (1 Year)', value: 52 },
  ];

  monthlyTenurePresets = [
    { label: '3 Months', value: 3 },
    { label: '6 Months', value: 6 },
    { label: '9 Months', value: 9 },
    { label: '12 Months (1 Year)', value: 12 },
    { label: '24 Months (2 Years)', value: 24 },
  ];

  // Display Schedule toggle
  showAllSchedule: boolean = false;

  // Active comparison modal or tab
  customerNameQuote: string = '';

  ngOnInit() {
    this.calculateAll();
  }

  // Calculated getters
  get totalInterest(): number {
    return Math.round((Number(this.loanAmount) * Number(this.interestRate)) / 100);
  }

  get totalPayable(): number {
    return Number(this.loanAmount) + this.totalInterest;
  }

  get emiAmount(): number {
    const t = Number(this.tenure) || 1;
    return Math.ceil(this.totalPayable / t);
  }

  get principalPercentage(): number {
    if (!this.totalPayable) return 0;
    return Math.round((Number(this.loanAmount) / this.totalPayable) * 100);
  }

  get interestPercentage(): number {
    if (!this.totalPayable) return 0;
    return 100 - this.principalPercentage;
  }

  get frequencyUnit(): string {
    if (this.emiType === 'Weekly') return 'Week';
    if (this.emiType === 'Monthly') return 'Month';
    return 'Day';
  }

  get tenureUnit(): string {
    if (this.emiType === 'Weekly') return 'Weeks';
    if (this.emiType === 'Monthly') return 'Months';
    return 'Days';
  }

  get hindiFrequencyText(): string {
    if (this.emiType === 'Weekly') return 'प्रति सप्ताह (Weekly)';
    if (this.emiType === 'Monthly') return 'प्रति माह (Monthly)';
    return 'प्रति दिन (Daily)';
  }

  get calculatedEndDate(): Date {
    const start = new Date(this.startDate || new Date());
    const count = Number(this.tenure) || 1;
    const end = new Date(start);

    if (this.emiType === 'Weekly') {
      end.setDate(end.getDate() + count * 7);
    } else if (this.emiType === 'Monthly') {
      end.setMonth(end.getMonth() + count);
    } else {
      end.setDate(end.getDate() + count);
    }
    return end;
  }

  get activeTenurePresets() {
    if (this.emiType === 'Weekly') return this.weeklyTenurePresets;
    if (this.emiType === 'Monthly') return this.monthlyTenurePresets;
    return this.dailyTenurePresets;
  }

  // Cross Frequency Comparisons
  get planComparisons(): PlanComparison[] {
    const principal = Number(this.loanAmount) || 0;
    const rate = Number(this.interestRate) || 0;
    const payable = principal + Math.round((principal * rate) / 100);

    return [
      {
        frequency: 'Daily',
        title: 'Daily Collection',
        hindiTitle: 'दैनिक किश्त',
        tenure: 100,
        tenureUnit: 'Days',
        emiAmount: Math.ceil(payable / 100),
        emiUnit: 'per Day',
        icon: 'today',
      },
      {
        frequency: 'Weekly',
        title: 'Weekly Collection',
        hindiTitle: 'साप्ताहिक किश्त',
        tenure: 12,
        tenureUnit: 'Weeks',
        emiAmount: Math.ceil(payable / 12),
        emiUnit: 'per Week',
        icon: 'date_range',
      },
      {
        frequency: 'Monthly',
        title: 'Monthly Collection',
        hindiTitle: 'मासिक किश्त',
        tenure: 6,
        tenureUnit: 'Months',
        emiAmount: Math.ceil(payable / 6),
        emiUnit: 'per Month',
        icon: 'calendar_month',
      },
    ];
  }

  // Schedule list
  get schedule(): ScheduleItem[] {
    const list: ScheduleItem[] = [];
    const count = Math.min(Number(this.tenure) || 1, 365); // Cap to 365 for memory
    const emi = this.emiAmount;
    const principalPerEmi = Math.round(Number(this.loanAmount) / count);
    const interestPerEmi = emi - principalPerEmi;
    let balance = this.totalPayable;
    const baseDate = new Date(this.startDate || new Date());

    for (let i = 1; i <= count; i++) {
      const curDate = new Date(baseDate);
      if (this.emiType === 'Weekly') {
        curDate.setDate(curDate.getDate() + i * 7);
      } else if (this.emiType === 'Monthly') {
        curDate.setMonth(curDate.getMonth() + i);
      } else {
        curDate.setDate(curDate.getDate() + i);
      }

      const installmentEmi = i === count ? balance : emi;
      balance = Math.max(0, balance - installmentEmi);

      list.push({
        installmentNo: i,
        dueDate: curDate,
        emiAmount: installmentEmi,
        principalPortion: principalPerEmi,
        interestPortion: interestPerEmi,
        remainingBalance: balance,
      });
    }

    return list;
  }

  get displayedSchedule(): ScheduleItem[] {
    if (this.showAllSchedule) {
      return this.schedule;
    }
    return this.schedule.slice(0, 10);
  }

  // Action methods
  setFrequency(freq: EmiFrequency) {
    this.emiType = freq;
    if (freq === 'Daily') {
      this.tenure = 100;
    } else if (freq === 'Weekly') {
      this.tenure = 12;
    } else if (freq === 'Monthly') {
      this.tenure = 6;
    }
    this.calculateAll();
  }

  setLoanAmount(amount: number) {
    this.loanAmount = amount;
    this.calculateAll();
  }

  setInterestRate(rate: number) {
    this.interestRate = rate;
    this.calculateAll();
  }

  setTenure(tenure: number) {
    this.tenure = tenure;
    this.calculateAll();
  }

  calculateAll() {
    if (this.loanAmount < 0) this.loanAmount = 0;
    if (this.interestRate < 0) this.interestRate = 0;
    if (this.tenure < 1) this.tenure = 1;
  }

  applyPlan(plan: PlanComparison) {
    this.emiType = plan.frequency;
    this.tenure = plan.tenure;
    this.calculateAll();
    this.snackBar.open(`Switched calculation to ${plan.title} (${plan.tenure} ${plan.tenureUnit})`, 'OK', {
      duration: 2500,
    });
  }

  copyQuotationText() {
    const customerPrefix = this.customerNameQuote ? `Customer: ${this.customerNameQuote}\n` : '';
    const text =
      `*DD FINSERVE - LOAN & EMI QUOTATION*\n` +
      `───────────────────────────────\n` +
      customerPrefix +
      `💰 Loan Principal Amount: ₹${this.loanAmount.toLocaleString('en-IN')}\n` +
      `📊 Flat Interest Rate: ${this.interestRate}%\n` +
      `➕ Total Flat Interest: ₹${this.totalInterest.toLocaleString('en-IN')}\n` +
      `💳 Total Amount to Repay: ₹${this.totalPayable.toLocaleString('en-IN')}\n` +
      `───────────────\n` +
      `⏱️ Repayment Plan: ${this.emiType} (${this.tenure} ${this.tenureUnit})\n` +
      `💵 EMI per ${this.frequencyUnit}: ₹${this.emiAmount.toLocaleString('en-IN')}\n` +
      `📅 Loan Start Date: ${new Date(this.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}\n` +
      `🏁 Maturity Date: ${this.calculatedEndDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}\n` +
      `───────────────────────────────\n` +
      `DD Finserve Microfinance Solutions`;

    navigator.clipboard
      .writeText(text)
      .then(() => {
        this.snackBar.open('Quotation copied to clipboard! Ready to share via WhatsApp / SMS.', 'OK', {
          duration: 3500,
        });
      })
      .catch(() => {
        this.snackBar.open('Could not copy automatically. You can copy the quote summary directly.', 'Close', {
          duration: 3000,
        });
      });
  }

  printQuotation() {
    window.print();
  }

  openOnboardDialogWithCurrentValues() {
    const prefillData: Partial<CustomerEntry> = {
      name: this.customerNameQuote || '',
      loanAmount: this.loanAmount,
      interestRate: this.interestRate,
      totalAmount: this.totalPayable,
      emiType: this.emiType,
      totalEMI: this.tenure,
      dailyEMI: this.emiAmount,
      loanStartDate: new Date(this.startDate),
      loanEndDate: this.calculatedEndDate,
      status: 'Active',
    };

    const dialogRef = this.dialog.open(CustomerDialogComponent, {
      width: '800px',
      disableClose: true,
      data: prefillData as CustomerEntry,
    });

    dialogRef.afterClosed().subscribe((result: Partial<CustomerEntry> | undefined) => {
      if (result) {
        this.customerService.createCustomer(result).subscribe({
          next: (saved) => {
            this.snackBar.open(`Customer "${saved.name}" onboarded successfully!`, 'View Customers', {
              duration: 4000,
            }).onAction().subscribe(() => {
              this.router.navigate(['/customers']);
            });
          },
          error: (err) => {
            this.snackBar.open(err.error?.message || 'Failed to onboard customer', 'Close', { duration: 4000 });
          },
        });
      }
    });
  }
}
