import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { CustomerDialogComponent } from './components/customer-dialog/customer-dialog.component';
import { CustomerService } from './services/customer.service';
import { CustomerEntry } from './models/customer.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private dialog = inject(MatDialog);
  private customerService = inject(CustomerService);
  private snackBar = inject(MatSnackBar);

  openAddCustomer() {
    const dialogRef = this.dialog.open(CustomerDialogComponent, {
      width: '800px',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result: Partial<CustomerEntry> | undefined) => {
      if (result) {
        this.customerService.createCustomer(result).subscribe({
          next: (saved) => {
            this.snackBar.open(`Customer "${saved.name}" added successfully!`, 'OK', { duration: 3500 });
            // Reload window or notify if needed
            window.location.reload();
          },
          error: (err) => {
            this.snackBar.open(err.error?.message || 'Failed to add customer', 'Close', { duration: 4000 });
          },
        });
      }
    });
  }
}
