import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdvanceFundEntry } from '../../../models/advance-fund.model';
import { AdvanceFundService } from '../../../services/advance-fund.service';

@Component({
  selector: 'app-advance-fund-payout-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  templateUrl: './advance-fund-payout-dialog.component.html',
  styleUrls: ['./advance-fund-payout-dialog.component.css'],
})
export class AdvanceFundPayoutDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<AdvanceFundPayoutDialogComponent>);
  private advanceService = inject(AdvanceFundService);
  private snackBar = inject(MatSnackBar);

  form!: FormGroup;
  isSaving = false;

  constructor(@Inject(MAT_DIALOG_DATA) public fund: AdvanceFundEntry) {}

  ngOnInit(): void {
    const today = new Date().toISOString().slice(0, 10);
    const defaultAmount = this.fund.monthlyInterestAmount || 0;

    this.form = this.fb.group({
      amount: [defaultAmount, [Validators.required, Validators.min(1)]],
      payoutType: ['Interest', Validators.required],
      payoutDate: [today, Validators.required],
      paymentMode: ['Bank Transfer', Validators.required],
      transactionRef: [''],
      notes: [''],
    });

    // Auto-update amount when payoutType changes
    this.form.get('payoutType')?.valueChanges.subscribe((type) => {
      if (type === 'Interest') {
        this.form.patchValue({ amount: this.fund.monthlyInterestAmount || 0 });
      } else if (type === 'Settlement' || type === 'Principal') {
        this.form.patchValue({ amount: this.fund.remainingPrincipal || 0 });
      }
    });
  }

  setMonthlyInterest(): void {
    this.form.patchValue({
      payoutType: 'Interest',
      amount: this.fund.monthlyInterestAmount || 0,
      notes: `Monthly interest payment of ₹${this.fund.monthlyInterestAmount}`,
    });
  }

  setFullSettlement(): void {
    this.form.patchValue({
      payoutType: 'Settlement',
      amount: this.fund.remainingPrincipal || 0,
      notes: `Full principal closure of ₹${this.fund.remainingPrincipal}`,
    });
  }

  save(): void {
    if (this.form.invalid || !this.fund._id) {
      this.snackBar.open('Please provide a valid amount and payout date.', 'Close', {
        duration: 3000,
      });
      return;
    }

    this.isSaving = true;
    const val = this.form.value;

    this.advanceService.recordPayout(this.fund._id, val).subscribe({
      next: (res) => {
        this.isSaving = false;
        this.dialogRef.close(res.payout || val);
      },
      error: (err) => {
        console.error('Payout record error:', err);
        this.isSaving = false;
        this.snackBar.open('Failed to record payout transaction.', 'Close', {
          duration: 3000,
        });
      },
    });
  }

  close(): void {
    this.dialogRef.close(null);
  }
}
