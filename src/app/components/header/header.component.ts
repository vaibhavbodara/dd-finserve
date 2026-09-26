import { Component, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { CustomerService } from '../../services/customer.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, MatToolbarModule, MatButtonModule, MatIconModule, MatBadgeModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit {
  @Output() addCustomerClicked = new EventEmitter<void>();

  private customerService = inject(CustomerService);
  backendOnline = false;
  databaseStatus = 'connecting...';

  ngOnInit() {
    this.checkHealth();
  }

  checkHealth() {
    this.customerService.checkHealth().subscribe((res) => {
      this.backendOnline = res.online;
      this.databaseStatus = res.database;
    });
  }

  onAddCustomer() {
    this.addCustomerClicked.emit();
  }
}
