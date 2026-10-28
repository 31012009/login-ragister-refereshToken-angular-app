import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { getHttpErrorMessage } from '../../core/http-error-message';
import { AuthUser } from '../../core/auth/auth.models';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentUser = this.authService.currentUser;
  readonly displayName = computed(() => {
    const  userData = this.currentUser();
    return userData?.fullName || userData?.email || 'there';
  });
  readonly isRefreshingProfile = signal(false);
  readonly isSigningOut = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  refreshProfile(): void {
    if (this.isRefreshingProfile()) {
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');
    this.isRefreshingProfile.set(true);
    this.authService.loadCurrentUser()
      .subscribe({
        next: () => {
          this.isRefreshingProfile.set(false);
          this.successMessage.set('Your profile is up to date.');
        },
        error: (error: unknown) => {
          this.isRefreshingProfile.set(false);
          this.errorMessage.set(getHttpErrorMessage(error, 'We could not refresh your profile.'));
        }
      });
  }

  signOutFromCurrentSession(): void {
    this.signOut(false);
  }

  signOutFromAllSessions(): void {
    this.signOut(true);
  }

  private signOut(allSessions: boolean): void {
    if (this.isSigningOut()) {
      return;
    }

    this.errorMessage.set('');
    this.isSigningOut.set(true);
    const logoutRequest = allSessions
      ? this.authService.logoutAll()
      : this.authService.logout();

    logoutRequest.subscribe({
      next: () => {
        this.isSigningOut.set(false);
        void this.router.navigate(['/login']);
      },
      error: (error: unknown) => {
        this.isSigningOut.set(false);
        this.errorMessage.set(getHttpErrorMessage(error, 'We could not complete sign out. Please try again.'));
      }
    });
  }
}
