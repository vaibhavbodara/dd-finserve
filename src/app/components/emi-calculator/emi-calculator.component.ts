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

export type InterestRateType = 'reduced' | 'fixed' | 'flat_tenure';

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
  totalInterest: number;
  totalPayable: number;
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
  interestRate: number = 10.5; // % per annum by default
  interestRateType: InterestRateType = 'fixed'; // 'reduced' (emicalculatorapp default) | 'fixed' | 'flat_tenure'
  emiType: EmiFrequency = 'Daily';
  tenure: number = 100;
  tenureUnit: 'days' | 'weeks' | 'months' | 'years' = 'days';
  startDate: string = new Date().toISOString().split('T')[0];

  // Presets
  loanPresets: number[] = [5000, 10000, 20000, 50000, 100000, 500000];
  ratePresets: number[] = [8.5, 10.5, 12, 14, 18, 24];

  // UI state
  showAllSchedule: boolean = false;
  customerNameQuote: string = '';

  ngOnInit() {
    this.syncTenureDefaults('Daily');
    this.calculateAll();
  }

  // Frequency Periods per Year (matching emicalculatorapp.com)
  get periodsPerYear(): number {
    if (this.emiType === 'Daily') return 365;
    if (this.emiType === 'Weekly') return 52;
    return 12; // Monthly
  }

  // Tenure in Years
  get tenureYears(): number {
    const t = Number(this.tenure) || 1;
    if (this.tenureUnit === 'days') return t / 365;
    if (this.tenureUnit === 'weeks') return t / 52;
    if (this.tenureUnit === 'months') return t / 12;
    return t; // years
  }

  // Total Installment Count / Periods
  get totalPeriods(): number {
    const p = Math.round(this.tenureYears * this.periodsPerYear);
    return Math.max(1, p);
  }

  // Period Interest Rate
  get periodRate(): number {
    return (Number(this.interestRate) || 0) / this.periodsPerYear / 100;
  }

  // Calculated Installment Payment (matching emicalculatorapp.com)
  get emiAmount(): number {
    const P = Number(this.loanAmount) || 0;
    const N = this.totalPeriods;
    const r = this.periodRate;
    const R = Number(this.interestRate) || 0;

    if (P <= 0 || N <= 0) return 0;

    if (this.interestRateType === 'fixed') {
      // Fixed Interest Rate (% per annum on original principal)
      const totalInt = (P * R * this.tenureYears) / 100;
      return Math.round(((P + totalInt) / N) * 100) / 100;
    } else if (this.interestRateType === 'flat_tenure') {
      // Flat Microfinance Fee (% on Principal for entire loan)
      const totalInt = (P * R) / 100;
      return Math.round(((P + totalInt) / N) * 100) / 100;
    } else {
      // Reduced Balance (standard reducing balance formula)
      if (r === 0) return Math.round((P / N) * 100) / 100;
      const factor = Math.pow(1 + r, N);
      const emi = (P * r * factor) / (factor - 1);
      return Math.round(emi * 100) / 100;
    }
  }

  // Total Repayment Amount
  get totalPayable(): number {
    if (this.interestRateType === 'fixed') {
      const P = Number(this.loanAmount) || 0;
      const R = Number(this.interestRate) || 0;
      return Math.round(P + (P * R * this.tenureYears) / 100);
    } else if (this.interestRateType === 'flat_tenure') {
      const P = Number(this.loanAmount) || 0;
      const R = Number(this.interestRate) || 0;
      return Math.round(P + (P * R) / 100);
    } else {
      return Math.round(this.emiAmount * this.totalPeriods);
    }
  }

  // Total Interest Cost
  get totalInterest(): number {
    const P = Number(this.loanAmount) || 0;
    return Math.max(0, Math.round(this.totalPayable - P));
  }

  // Interest to Principal Ratio (%)
  get interestRatio(): number {
    const P = Number(this.loanAmount) || 0;
    if (P <= 0) return 0;
    return Math.round((this.totalInterest / P) * 1000) / 10;
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

  get tenureUnitLabel(): string {
    if (this.tenureUnit === 'days') return 'Days';
    if (this.tenureUnit === 'weeks') return 'Weeks';
    if (this.tenureUnit === 'months') return 'Months';
    return 'Years';
  }

  get hindiFrequencyText(): string {
    if (this.emiType === 'Weekly') return 'प्रति सप्ताह (Weekly)';
    if (this.emiType === 'Monthly') return 'प्रति माह (Monthly)';
    return 'प्रति दिन (Daily)';
  }

  get calculatedEndDate(): Date {
    const start = new Date(this.startDate || new Date());
    const end = new Date(start);

    if (this.tenureUnit === 'days') {
      end.setDate(end.getDate() + Number(this.tenure));
    } else if (this.tenureUnit === 'weeks') {
      end.setDate(end.getDate() + Number(this.tenure) * 7);
    } else if (this.tenureUnit === 'months') {
      end.setMonth(end.getMonth() + Number(this.tenure));
    } else {
      end.setFullYear(end.getFullYear() + Number(this.tenure));
    }
    return end;
  }

  // Amount in Words (Indian Format)
  get amountInWords(): string {
    return this.convertNumberToWordsIndian(Number(this.loanAmount) || 0);
  }

  convertNumberToWordsIndian(num: number): string {
    if (num <= 0) return '';
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const numToWords = (n: number): string => {
      if (n === 0) return '';
      if (n < 20) return ones[n] + ' ';
      if (n < 100) return tens[Math.floor(n / 10)] + ' ' + ones[n % 10] + (ones[n % 10] ? ' ' : '');
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred ' + numToWords(n % 100);
      if (n < 100000) return numToWords(Math.floor(n / 1000)) + 'Thousand ' + numToWords(n % 1000);
      if (n < 10000000) return numToWords(Math.floor(n / 100000)) + 'Lakh ' + numToWords(n % 100000);
      return numToWords(Math.floor(n / 10000000)) + 'Crore ' + numToWords(n % 10000000);
    };

    return numToWords(Math.floor(num)).trim() + ' Rupees';
  }

  // Multi-frequency comparison cards
  get planComparisons(): PlanComparison[] {
    const P = Number(this.loanAmount) || 0;
    const R = Number(this.interestRate) || 0;
    const type = this.interestRateType;

    const calcPlan = (freq: EmiFrequency, t: number, u: 'days' | 'weeks' | 'months'): PlanComparison => {
      const ppy = freq === 'Daily' ? 365 : (freq === 'Weekly' ? 52 : 12);
      const ty = u === 'days' ? t / 365 : (u === 'weeks' ? t / 52 : t / 12);
      const periods = Math.round(ty * ppy);
      const pr = R / ppy / 100;
      let inst = 0;
      let totPay = 0;

      if (type === 'fixed') {
        const intAmt = (P * R * ty) / 100;
        totPay = P + intAmt;
        inst = totPay / periods;
      } else if (type === 'flat_tenure') {
        const intAmt = (P * R) / 100;
        totPay = P + intAmt;
        inst = totPay / periods;
      } else {
        if (pr === 0) inst = P / periods;
        else {
          const factor = Math.pow(1 + pr, periods);
          inst = (P * pr * factor) / (factor - 1);
        }
        totPay = inst * periods;
      }

      return {
        frequency: freq,
        title: freq === 'Daily' ? 'Daily Collection' : (freq === 'Weekly' ? 'Weekly Collection' : 'Monthly Collection'),
        hindiTitle: freq === 'Daily' ? 'दैनिक किश्त' : (freq === 'Weekly' ? 'साप्ताहिक किश्त' : 'मासिक किश्त'),
        tenure: t,
        tenureUnit: u === 'days' ? 'Days' : (u === 'weeks' ? 'Weeks' : 'Months'),
        emiAmount: Math.round(inst * 100) / 100,
        emiUnit: freq === 'Daily' ? 'per Day' : (freq === 'Weekly' ? 'per Week' : 'per Month'),
        totalInterest: Math.round(totPay - P),
        totalPayable: Math.round(totPay),
        icon: freq === 'Daily' ? 'today' : (freq === 'Weekly' ? 'date_range' : 'calendar_month'),
      };
    };

    return [
      calcPlan('Daily', 100, 'days'),
      calcPlan('Weekly', 12, 'weeks'),
      calcPlan('Monthly', 6, 'months'),
    ];
  }

  // Detailed Amortization Schedule (matching emicalculatorapp.com)
  get schedule(): ScheduleItem[] {
    const list: ScheduleItem[] = [];
    const P = Number(this.loanAmount) || 0;
    const totalP = this.totalPeriods;
    const emi = this.emiAmount;
    const pr = this.periodRate;
    const R = Number(this.interestRate) || 0;
    const type = this.interestRateType;

    let balance = P;
    const baseDate = new Date(this.startDate || new Date());
    const fixedIntPerPeriod = type === 'fixed'
      ? (P * R * this.tenureYears) / 100 / totalP
      : (P * R) / 100 / totalP;

    // Cap at 365 periods to prevent browser slowdown
    const count = Math.min(totalP, 365);

    for (let i = 1; i <= count; i++) {
      const curDate = new Date(baseDate);
      if (this.emiType === 'Weekly') {
        curDate.setDate(curDate.getDate() + i * 7);
      } else if (this.emiType === 'Monthly') {
        curDate.setMonth(curDate.getMonth() + i);
      } else {
        curDate.setDate(curDate.getDate() + i);
      }

      let interestPart = 0;
      let principalPart = 0;

      if (type === 'fixed' || type === 'flat_tenure') {
        interestPart = fixedIntPerPeriod;
        principalPart = emi - interestPart;
      } else {
        // Reduced Balance
        interestPart = balance * pr;
        principalPart = emi - interestPart;
      }

      balance = balance - principalPart;
      if (balance < 0 || i === count) {
        if (i === count && balance !== 0) {
          principalPart += balance;
        }
        balance = 0;
      }

      list.push({
        installmentNo: i,
        dueDate: curDate,
        emiAmount: Math.round(emi * 100) / 100,
        principalPortion: Math.max(0, Math.round(principalPart * 100) / 100),
        interestPortion: Math.max(0, Math.round(interestPart * 100) / 100),
        remainingBalance: Math.max(0, Math.round(balance * 100) / 100),
      });

      if (balance <= 0) break;
    }

    return list;
  }

  get displayedSchedule(): ScheduleItem[] {
    if (this.showAllSchedule) {
      return this.schedule;
    }
    return this.schedule.slice(0, 10);
  }

  // Frequency change handler
  setFrequency(freq: EmiFrequency) {
    this.emiType = freq;
    this.syncTenureDefaults(freq);
    this.calculateAll();
  }

  syncTenureDefaults(freq: EmiFrequency) {
    if (freq === 'Daily') {
      this.tenureUnit = 'days';
      this.tenure = 100;
    } else if (freq === 'Weekly') {
      this.tenureUnit = 'weeks';
      this.tenure = 12;
    } else if (freq === 'Monthly') {
      this.tenureUnit = 'months';
      this.tenure = 6;
    }
  }

  setInterestRateType(type: InterestRateType) {
    this.interestRateType = type;
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
    this.tenureUnit = plan.frequency === 'Daily' ? 'days' : (plan.frequency === 'Weekly' ? 'weeks' : 'months');
    this.calculateAll();
    this.snackBar.open(`Switched to ${plan.title} (${plan.tenure} ${plan.tenureUnit})`, 'OK', {
      duration: 2500,
    });
  }

  // Export Amortization Schedule to CSV / Excel (matching emicalculatorapp.com)
  exportScheduleToCsv() {
    const rows = [
      ['Installment #', 'Due Date', 'Payment (EMI)', 'Principal Paid', 'Interest Paid', 'Remaining Balance'],
      ...this.schedule.map((s) => [
        s.installmentNo,
        s.dueDate.toISOString().split('T')[0],
        s.emiAmount,
        s.principalPortion,
        s.interestPortion,
        s.remainingBalance,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DD_Finserve_EMI_Schedule_${this.loanAmount}_${this.emiType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.snackBar.open('Amortization Schedule exported to Excel / CSV!', 'OK', { duration: 3000 });
  }

  copyQuotationText() {
    const customerPrefix = this.customerNameQuote ? `Customer: ${this.customerNameQuote}\n` : '';
    const rateTypeLabel = this.interestRateType === 'reduced'
      ? 'Reduced Balance (% p.a.)'
      : (this.interestRateType === 'fixed' ? 'Fixed Rate (% p.a.)' : 'Flat Microfinance Fee');

    const text =
      `*DD FINSERVE - LOAN & EMI QUOTATION*\n` +
      `───────────────────────────────\n` +
      customerPrefix +
      `💰 Loan Principal Amount: ₹${this.loanAmount.toLocaleString('en-IN')}\n` +
      `📝 Amount in Words: ${this.amountInWords}\n` +
      `📊 Interest Rate: ${this.interestRate}% (${rateTypeLabel})\n` +
      `➕ Total Interest Cost: ₹${this.totalInterest.toLocaleString('en-IN')}\n` +
      `💳 Total Amount to Repay: ₹${this.totalPayable.toLocaleString('en-IN')}\n` +
      `───────────────\n` +
      `⏱️ Repayment Plan: ${this.emiType} (${this.tenure} ${this.tenureUnitLabel})\n` +
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
        this.snackBar.open('Could not copy automatically.', 'Close', { duration: 3000 });
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
      totalEMI: this.totalPeriods,
      dailyEMI: Math.ceil(this.emiAmount),
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
