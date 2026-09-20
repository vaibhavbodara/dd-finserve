import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { CustomerDialogComponent } from './components/customer-dialog/customer-dialog.component';
import { CustomerService } from './services/customer.service';
import { AuthService } from './services/auth.service';
import { CustomerEntry } from './models/customer.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private dialog = inject(MatDialog);
  private customerService = inject(CustomerService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  public authService = inject(AuthService);

  isLoginPage = false;

  ngOnInit() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.isLoginPage = event.urlAfterRedirects.startsWith('/login') || event.url.startsWith('/login');
      });
  }

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
