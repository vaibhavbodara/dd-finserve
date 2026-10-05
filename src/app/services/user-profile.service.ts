import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { UserProfile } from '../models/customer.model';
import { environment } from '../../environments/environment';

const STORAGE_KEY = 'dd_finserve_user_profile';

@Injectable({
  providedIn: 'root',
})
export class UserProfileService {
  private http = inject(HttpClient);
  private profileUrl = `${environment.apiUrl}/auth/profile`;
  private meUrl = `${environment.apiUrl}/auth/me`;

  private profileSubject = new BehaviorSubject<UserProfile>(this.loadInitialProfile());
  public profile$: Observable<UserProfile> = this.profileSubject.asObservable();

  constructor() {
    this.refreshFromDatabase();
  }

  get currentProfile(): UserProfile {
    return this.profileSubject.getValue();
  }

  private loadInitialProfile(): UserProfile {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore parse error
    }
    return {
      name: '',
      email: '',
      phone: '',
      role: '',
      branch: '',
      employeeId: '',
      avatarColor: '#2563eb',
      status: 'Online',
      dailyTarget: 50000,
    };
  }

  refreshFromDatabase(): void {
    const token = localStorage.getItem('dd_finserve_auth_token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    this.http.get<{ success: boolean; user: UserProfile }>(this.meUrl, { headers }).subscribe({
      next: (res: { success: boolean; user: UserProfile }) => {
        if (res && res.success && res.user) {
          this.setProfile(res.user);
        }
      },
      error: () => {},
    });
  }

  setProfile(profile: UserProfile): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // Ignore storage errors
    }
    this.profileSubject.next(profile);
  }

  updateProfile(updates: Partial<UserProfile>): void {
    const current = this.profileSubject.getValue();
    const updated: UserProfile = {
      ...current,
      ...updates,
    };
    this.setProfile(updated);

    if (updated.email) {
      this.http.put(this.profileUrl, updated).subscribe({
        error: (err) => console.warn('Could not sync profile to MongoDB:', err.message),
      });
    }
  }

  setStatus(status: 'Online' | 'Away' | 'On Field'): void {
    this.updateProfile({ status });
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  isAdmin(): boolean {
    const profile = this.currentProfile;
    if (!profile) return false;
    const role = (profile.role || '').toLowerCase();
    const email = (profile.email || '').toLowerCase();
    return (
      role.includes('admin') ||
      role.includes('manager') ||
      role === 'admin' ||
      email.includes('admin')
    );
  }
}

