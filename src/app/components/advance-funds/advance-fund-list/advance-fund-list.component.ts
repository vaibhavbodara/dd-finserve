import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
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
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import {
  AdvanceFundEntry,
  AdvanceFundSummary,
} from '../../../models/advance-fund.model';
import { AdvanceFundService } from '../../../services/advance-fund.service';
import { UserProfileService } from '../../../services/user-profile.service';
import { AdvanceFundDialogComponent } from '../advance-fund-dialog/advance-fund-dialog.component';
import { AdvanceFundPayoutDialogComponent } from '../advance-fund-payout-dialog/advance-fund-payout-dialog.component';
import { AdvanceFundDetailDialogComponent } from '../advance-fund-detail-dialog/advance-fund-detail-dialog.component';

@Component({
  selector: 'app-advance-fund-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
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
    MatMenuModule,
    MatDividerModule,
  ],
  templateUrl: './advance-fund-list.component.html',
  styleUrls: ['./advance-fund-list.component.css'],
})
export class AdvanceFundListComponent implements OnInit {
  private advanceService = inject(AdvanceFundService);
  private profileService = inject(UserProfileService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  funds: AdvanceFundEntry[] = [];
  filteredFunds: AdvanceFundEntry[] = [];
  isLoading = false;

  summary: AdvanceFundSummary = {
    totalAdvanceFunds: 0,
    activeInvestorsCount: 0,
    totalPrincipalRepaid: 0,
    totalInterestPaid: 0,
    totalPaid: 0,
    netOutstandingPrincipal: 0,
    monthlyInterestObligation: 0,
  };

  // Search & Filters
  searchTerm = '';
  selectedStatus = 'All';
  selectedFrequency = 'All';

  displayedColumns: string[] = [
    'fundCode',
    'investor',
    'amount',
    'interest',
    'tenure',
    'repayment',
    'remaining',
    'status',
    'actions',
  ];

  ngOnInit(): void {
    if (!this.profileService.isAdmin()) {
      this.snackBar.open('Access restricted: Admin privileges required.', 'Close', {
        duration: 3500,
      });
      this.router.navigate(['/dashboard']);
      return;
    }

    this.loadFunds();
  }

  loadFunds(): void {
    this.isLoading = true;
    this.advanceService.getAdvanceFunds().subscribe({
      next: (res) => {
        this.funds = res.data || [];
        if (res.summary) {
          this.summary = res.summary;
        }
        this.applyFilters();
        this.isLoading = false;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load advance funds:', err);
        this.snackBar.open('Failed to load market fund records.', 'Retry', {
          duration: 3000,
        });
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  applyFilters(): void {
    let result = [...this.funds];

    // Status filter
    if (this.selectedStatus && this.selectedStatus !== 'All') {
      result = result.filter((f) => f.status === this.selectedStatus);
    }

    // Payout frequency filter
    if (this.selectedFrequency && this.selectedFrequency !== 'All') {
      result = result.filter((f) => f.payoutFrequency === this.selectedFrequency);
    }

    // Text search
    if (this.searchTerm && this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      result = result.filter(
        (f) =>
          f.fundCode?.toLowerCase().includes(term) ||
          f.investorName?.toLowerCase().includes(term) ||
          f.mobileNumber?.toLowerCase().includes(term) ||
          f.panNumber?.toLowerCase().includes(term) ||
          f.address?.toLowerCase().includes(term)
      );
    }

    this.filteredFunds = result;
    this.cdr.markForCheck();
  }

  openAddFundDialog(): void {
    const dialogRef = this.dialog.open(AdvanceFundDialogComponent, {
      width: '740px',
      maxWidth: '95vw',
      disableClose: true,
      data: null,
    });

    dialogRef.afterClosed().subscribe((created) => {
      if (created) {
        this.snackBar.open('New advance loan / market fund added successfully!', 'OK', {
          duration: 3000,
        });
        this.loadFunds();
      }
    });
  }

  openEditFundDialog(fund: AdvanceFundEntry): void {
    const dialogRef = this.dialog.open(AdvanceFundDialogComponent, {
      width: '740px',
      maxWidth: '95vw',
      disableClose: true,
      data: fund,
    });

    dialogRef.afterClosed().subscribe((updated) => {
      if (updated) {
        this.snackBar.open('Investor record updated successfully!', 'OK', {
          duration: 3000,
        });
        this.loadFunds();
      }
    });
  }

  openRecordPayoutDialog(fund: AdvanceFundEntry): void {
    const dialogRef = this.dialog.open(AdvanceFundPayoutDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      disableClose: true,
      data: fund,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackBar.open(
          `Payout of ₹${result.amount || ''} recorded successfully!`,
          'OK',
          { duration: 3000 }
        );
        this.loadFunds();
      }
    });
  }

  openDetailDialog(fund: AdvanceFundEntry): void {
    const dialogRef = this.dialog.open(AdvanceFundDetailDialogComponent, {
      width: '840px',
      maxWidth: '96vw',
      data: fund,
    });

    dialogRef.afterClosed().subscribe((needRefresh) => {
      if (needRefresh) {
        this.loadFunds();
      }
    });
  }

  deleteFund(fund: AdvanceFundEntry): void {
    if (!fund._id) return;

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete Advance Fund ${fund.fundCode} (${fund.investorName})? This action cannot be undone.`
    );

    if (!confirmed) return;

    this.advanceService.deleteAdvanceFund(fund._id).subscribe({
      next: () => {
        this.snackBar.open(`Advance fund ${fund.fundCode} removed.`, 'OK', {
          duration: 3000,
        });
        this.loadFunds();
      },
      error: (err) => {
        console.error('Delete error:', err);
        this.snackBar.open('Failed to delete advance fund record.', 'Close', {
          duration: 3000,
        });
      },
    });
  }
}
