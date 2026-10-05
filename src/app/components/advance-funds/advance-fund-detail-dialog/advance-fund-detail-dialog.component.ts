import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdvanceFundEntry } from '../../../models/advance-fund.model';
import { AdvanceFundService } from '../../../services/advance-fund.service';
import { AdvanceFundPayoutDialogComponent } from '../advance-fund-payout-dialog/advance-fund-payout-dialog.component';

@Component({
  selector: 'app-advance-fund-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatDividerModule,
    MatSnackBarModule,
  ],
  templateUrl: './advance-fund-detail-dialog.component.html',
  styleUrls: ['./advance-fund-detail-dialog.component.css'],
})
export class AdvanceFundDetailDialogComponent implements OnInit {
  private advanceService = inject(AdvanceFundService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<AdvanceFundDetailDialogComponent>);

  fund: AdvanceFundEntry;
  displayedColumns: string[] = [
    'payoutId',
    'payoutDate',
    'type',
    'amount',
    'mode',
    'ref',
    'notes',
    'actions',
  ];
  hasModified = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: AdvanceFundEntry) {
    this.fund = data;
  }

  ngOnInit(): void {
    if (this.fund._id) {
      this.refreshFundData();
    }
  }

  refreshFundData(): void {
    if (!this.fund._id) return;
    this.advanceService.getAdvanceFundById(this.fund._id).subscribe({
      next: (updated) => {
        this.fund = updated;
      },
      error: (err) => console.error('Error refreshing details:', err),
    });
  }

  openRecordPayout(): void {
    const dialogRef = this.dialog.open(AdvanceFundPayoutDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      disableClose: true,
      data: this.fund,
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.hasModified = true;
        this.refreshFundData();
        this.snackBar.open('Payout recorded to ledger!', 'OK', { duration: 3000 });
      }
    });
  }

  deletePayout(payoutId: string): void {
    if (!this.fund._id || !payoutId) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this payout entry? The balances will be recalculated automatically.'
    );
    if (!confirmed) return;

    this.advanceService.deletePayout(this.fund._id, payoutId).subscribe({
      next: (updatedFund) => {
        this.fund = updatedFund;
        this.hasModified = true;
        this.snackBar.open('Payout transaction removed.', 'OK', { duration: 3000 });
      },
      error: (err) => {
        console.error('Delete payout error:', err);
        this.snackBar.open('Failed to remove payout transaction.', 'Close', { duration: 3000 });
      },
    });
  }

  printLedger(): void {
    window.print();
  }

  close(): void {
    this.dialogRef.close(this.hasModified);
  }
}
