import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { getHttpErrorMessage } from '../../core/http-error-message';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly form = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set('');
    this.isSubmitting.set(true);
    this.authService.login(this.form.getRawValue())
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          void this.router.navigateByUrl(this.getSafeReturnUrl());
        },
        error: (error: unknown) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(getHttpErrorMessage(error, 'We could not sign you in. Check your details and try again.'));
        }
      });
  }

  private getSafeReturnUrl(): string {
    const returnUrl = this.activatedRoute.snapshot.queryParamMap.get('returnUrl');
    return returnUrl?.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/dashboard';
  }
}
