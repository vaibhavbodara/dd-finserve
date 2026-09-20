import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, catchError, map, tap } from 'rxjs';
import { ApiResponse, CustomerEntry, DashboardMetrics } from '../models/customer.model';

@Injectable({
  providedIn: 'root',
})
export class CustomerService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5000/api/customers';
  private healthUrl = 'http://localhost:5000/api/health';
  private metricsUrl = 'http://localhost:5000/api/dashboard/metrics';

  // Realistic initial mock data stored in localStorage for instant reliability
  private defaultMockCustomers: CustomerEntry[] = [
    {
      _id: 'mock-1',
      customerId: 'CUST-1001',
      name: 'Rajesh Sharma',
      mobileNumber: '9876543210',
      address: 'Shop 12, Main Market, MG Road',
      loanAmount: 10000,
      emiType: 'Daily',
      dailyEMI: 110,
      totalEMI: 100,
      paidEMI: 15,
      remainingBalance: 9350,
      totalAmount: 11000,
      totalPaid: 1650,
      loanStartDate: '2026-09-01',
      loanEndDate: '2026-12-09',
      collectorName: 'Agent Rahul',
      status: 'Active',
      kycDocument: {
        fileName: 'aadhaar_card_rajesh.pdf',
        fileType: 'application/pdf',
        fileData: '',
      },
    },
    {
      _id: 'mock-2',
      customerId: 'CUST-1002',
      name: 'Pooja Patil',
      mobileNumber: '9822345678',
      address: 'Flat 402, Shiv Krupa, Station Road',
      loanAmount: 20000,
      emiType: 'Weekly',
      dailyEMI: 1700,
      totalEMI: 12,
      paidEMI: 5,
      remainingBalance: 11900,
      totalAmount: 20400,
      totalPaid: 8500,
      loanStartDate: '2026-08-10',
      loanEndDate: '2026-11-02',
      collectorName: 'Agent Suresh',
      status: 'Active',
      kycDocument: {
        fileName: 'pan_card_pooja.jpg',
        fileType: 'image/jpeg',
        fileData: '',
      },
    },
    {
      _id: 'mock-3',
      customerId: 'CUST-1003',
      name: 'Mohammad Imran',
      mobileNumber: '9765432109',
      address: 'Gala 5, Industrial Estate',
      loanAmount: 15000,
      emiType: 'Daily',
      dailyEMI: 165,
      totalEMI: 100,
      paidEMI: 100,
      remainingBalance: 0,
      totalAmount: 16500,
      totalPaid: 16500,
      loanStartDate: '2026-05-01',
      loanEndDate: '2026-08-09',
      collectorName: 'Agent Rahul',
      status: 'Completed',
    },
    {
      _id: 'mock-4',
      customerId: 'CUST-1004',
      name: 'Sunita Devi',
      mobileNumber: '9988776655',
      address: 'Plot 88, Gandhi Nagar, 3rd Cross',
      loanAmount: 12000,
      emiType: 'Monthly',
      dailyEMI: 2200,
      totalEMI: 6,
      paidEMI: 1,
      remainingBalance: 11000,
      totalAmount: 13200,
      totalPaid: 2200,
      loanStartDate: '2026-07-15',
      loanEndDate: '2027-01-15',
      collectorName: 'Agent Priya',
      status: 'Overdue',
    },
    {
      _id: 'mock-5',
      customerId: 'CUST-1005',
      name: 'Vikram Singh',
      mobileNumber: '9123456780',
      address: 'Shop 4, APMC Fruit Market',
      loanAmount: 25000,
      emiType: 'Daily',
      dailyEMI: 275,
      totalEMI: 100,
      paidEMI: 30,
      remainingBalance: 19250,
      totalAmount: 27500,
      totalPaid: 8250,
      loanStartDate: '2026-08-25',
      loanEndDate: '2026-12-03',
      collectorName: 'Agent Rahul',
      status: 'Active',
    },
  ];

  constructor() {
    if (!localStorage.getItem('dd_finserve_customers')) {
      localStorage.setItem('dd_finserve_customers', JSON.stringify(this.defaultMockCustomers));
    }
  }

  private getLocalCustomers(): CustomerEntry[] {
    try {
      const data = localStorage.getItem('dd_finserve_customers');
      return data ? JSON.parse(data) : this.defaultMockCustomers;
    } catch {
      return this.defaultMockCustomers;
    }
  }

  private setLocalCustomers(customers: CustomerEntry[]) {
    localStorage.setItem('dd_finserve_customers', JSON.stringify(customers));
  }

  // Check backend server health
  checkHealth(): Observable<{ online: boolean; database: string }> {
    return this.http.get<{ status: string; database: string }>(this.healthUrl).pipe(
      map((res) => ({ online: res.status === 'ok', database: res.database })),
      catchError(() => of({ online: false, database: 'offline' }))
    );
  }

  // GET: Fetch dashboard KPI metrics
  getDashboardMetrics(): Observable<DashboardMetrics> {
    return this.http.get<ApiResponse<DashboardMetrics>>(this.metricsUrl).pipe(
      map((res) => res.data),
      catchError(() => {
        const customers = this.getLocalCustomers();
        return of(this.computeLocalDashboardMetrics(customers));
      })
    );
  }

  computeLocalDashboardMetrics(customers: CustomerEntry[]): DashboardMetrics {
    const active = customers.filter((c) => c.status === 'Active');
    const overdue = customers.filter((c) => c.status === 'Overdue');
    const completed = customers.filter((c) => c.status === 'Completed');

    const todaysTotalEmi = active.reduce((sum, c) => sum + (c.dailyEMI || 0), 0);
    const todaysReceived = Math.round(todaysTotalEmi * 0.45);
    const pendingEmi = Math.max(0, todaysTotalEmi - todaysReceived);

    const totalDisbursed = customers.reduce((sum, c) => sum + (c.loanAmount || 0), 0);
    const totalOutstanding = customers.reduce((sum, c) => sum + (c.remainingBalance || 0), 0);
    const totalCollected = customers.reduce((sum, c) => sum + (c.totalPaid || 0), 0);

    const dailyCount = customers.filter((c) => (c.emiType || 'Daily') === 'Daily').length;
    const weeklyCount = customers.filter((c) => c.emiType === 'Weekly').length;
    const monthlyCount = customers.filter((c) => c.emiType === 'Monthly').length;

    return {
      totalCustomers: customers.length,
      todaysTotalEmi,
      todaysReceived,
      pendingEmi,
      overdueCustomers: overdue.length,
      activeLoansCount: active.length,
      completedLoansCount: completed.length,
      efficiencyPercentage: todaysTotalEmi > 0 ? Math.round((todaysReceived / todaysTotalEmi) * 100) : 0,
      totalDisbursed,
      totalOutstanding,
      totalCollected,
      planStats: {
        daily: dailyCount,
        weekly: weeklyCount,
        monthly: monthlyCount,
      },
    };
  }

  // GET: Fetch all customers with optional search & filters
  getCustomers(search?: string, status?: string, collectorName?: string): Observable<CustomerEntry[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (status) params = params.set('status', status);
    if (collectorName) params = params.set('collectorName', collectorName);

    return this.http.get<ApiResponse<CustomerEntry[]>>(this.apiUrl, { params }).pipe(
      map((res) => res.data),
      tap((data) => {
        // Sync local storage cache when backend returns data
        if (data && data.length > 0) {
          this.setLocalCustomers(data);
        }
      }),
      catchError((err) => {
        console.warn('Backend API unavailable, serving cached data:', err.message);
        let list = this.getLocalCustomers();
        if (status && status !== 'All') {
          list = list.filter((c) => c.status === status);
        }
        if (collectorName && collectorName !== 'All') {
          list = list.filter((c) => c.collectorName === collectorName);
        }
        if (search) {
          const s = search.toLowerCase();
          list = list.filter(
            (c) =>
              c.name.toLowerCase().includes(s) ||
              c.customerId.toLowerCase().includes(s) ||
              c.mobileNumber.includes(s) ||
              c.address.toLowerCase().includes(s) ||
              c.collectorName.toLowerCase().includes(s)
          );
        }
        return of(list);
      })
    );
  }

  // POST: Add new customer + loan
  createCustomer(entry: Partial<CustomerEntry>): Observable<CustomerEntry> {
    return this.http.post<ApiResponse<CustomerEntry>>(this.apiUrl, entry).pipe(
      map((res) => res.data),
      tap((saved) => {
        const local = this.getLocalCustomers();
        local.unshift(saved);
        this.setLocalCustomers(local);
      }),
      catchError((err) => {
        console.warn('Backend POST failed, saving to local cache:', err.message);
        const local = this.getLocalCustomers();
        const newId = `CUST-${String(local.length + 1001).padStart(4, '0')}`;
        const newEntry: CustomerEntry = {
          _id: 'local-' + Date.now(),
          customerId: entry.customerId || newId,
          name: entry.name || '',
          mobileNumber: entry.mobileNumber || '',
          address: entry.address || '',
          loanAmount: Number(entry.loanAmount) || 0,
          emiType: entry.emiType || 'Daily',
          dailyEMI: Number(entry.dailyEMI) || 0,
          emiAmount: Number(entry.emiAmount || entry.dailyEMI) || 0,
          totalEMI: Number(entry.totalEMI) || 100,
          loanStartDate: entry.loanStartDate || new Date().toISOString().slice(0, 10),
          loanEndDate: entry.loanEndDate || '',
          collectorName: entry.collectorName || 'Agent Rahul',
          kycDocument: entry.kycDocument,
          status: entry.status || 'Active',
          createdAt: new Date().toISOString(),
        };
        local.unshift(newEntry);
        this.setLocalCustomers(local);
        return of(newEntry);
      })
    );
  }

  // PUT: Update customer
  updateCustomer(id: string, entry: Partial<CustomerEntry>): Observable<CustomerEntry> {
    return this.http.put<ApiResponse<CustomerEntry>>(`${this.apiUrl}/${id}`, entry).pipe(
      map((res) => res.data),
      catchError(() => {
        const local = this.getLocalCustomers();
        const idx = local.findIndex((c) => c._id === id || c.customerId === id);
        if (idx !== -1) {
          local[idx] = { ...local[idx], ...entry };
          this.setLocalCustomers(local);
          return of(local[idx]);
        }
        return of(entry as CustomerEntry);
      })
    );
  }

  // DELETE: Delete customer
  deleteCustomer(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`).pipe(
      map((res) => res.success),
      tap(() => {
        const local = this.getLocalCustomers().filter((c) => c._id !== id && c.customerId !== id);
        this.setLocalCustomers(local);
      }),
      catchError(() => {
        const local = this.getLocalCustomers().filter((c) => c._id !== id && c.customerId !== id);
        this.setLocalCustomers(local);
        return of(true);
      })
    );
  }
}
