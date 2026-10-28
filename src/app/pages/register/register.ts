import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { getHttpErrorMessage } from '../../core/http-error-message';

const matchingPasswordsValidator: ValidatorFn = (control): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (!confirmPassword) {
    return null;
  }

  return password === confirmPassword ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class Register {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);

  readonly isSubmitting = signal(false);
  readonly registrationComplete = signal(false);
  readonly errorMessage = signal('');
  readonly form = this.formBuilder.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required]
  }, { validators: matchingPasswordsValidator });

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set('');
    this.isSubmitting.set(true);

    const { name, email, password } = this.form.getRawValue();
    this.authService.register({
      fullName: name.trim(),
      email: email.trim(),
      password
    }).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.registrationComplete.set(true);
          this.form.reset();
        },
        error: (error: unknown) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(getHttpErrorMessage(error, 'We could not create your account. Please try again.'));
        }
      });
  }
}
