import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { UserProfile } from '../models/customer.model';

const STORAGE_KEY = 'dd_finserve_user_profile';

const DEFAULT_PROFILE: UserProfile = {
  name: 'Vaibhav Bodara',
  email: 'vaibhav@ddfinserve.com',
  phone: '+91 98765 43210',
  role: 'Branch Manager & Administrator',
  branch: 'Surat Main Branch',
  employeeId: 'DDF-MGR-001',
  avatarColor: '#2563eb',
  status: 'Online',
  dailyTarget: 50000,
};

@Injectable({
  providedIn: 'root',
})
export class UserProfileService {
  private profileSubject = new BehaviorSubject<UserProfile>(this.loadInitialProfile());
  public profile$: Observable<UserProfile> = this.profileSubject.asObservable();

  constructor() {}

  get currentProfile(): UserProfile {
    return this.profileSubject.getValue();
  }

  private loadInitialProfile(): UserProfile {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PROFILE, ...JSON.parse(stored) };
      }
    } catch {
      // Ignore storage errors
    }
    return { ...DEFAULT_PROFILE };
  }

  updateProfile(updates: Partial<UserProfile>): void {
    const updated: UserProfile = {
      ...this.profileSubject.getValue(),
      ...updates,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
    this.profileSubject.next(updated);
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
}
