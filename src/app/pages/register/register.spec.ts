import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { Register } from './register';

describe('Register', () => {
  let component: Register;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });

    const fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('prevents registration when the passwords do not match', () => {
    component.form.setValue({
      name: 'Taylor Example',
      email: 'taylor@example.com',
      password: 'secure-password',
      confirmPassword: 'different-password'
    });

    expect(component.form.hasError('passwordMismatch')).toBe(true);

    component.submit();

    expect(component.form.invalid).toBe(true);
    expect(component.form.controls.confirmPassword.touched).toBe(true);
    httpTestingController.expectNone(`${environment.apiBaseUrl}/api/auth/register`);
  });

  it('submits the registration request without sending the confirmation password', () => {
    component.form.setValue({
      name: ' Taylor Example ',
      email: 'taylor@example.com',
      password: 'secure-password',
      confirmPassword: 'secure-password'
    });

    component.submit();

    const request = httpTestingController.expectOne(`${environment.apiBaseUrl}/api/auth/register`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      fullName: 'Taylor Example',
      email: 'taylor@example.com',
      password: 'secure-password'
    });
    expect(request.request.body.confirmPassword).toBeUndefined();
    request.flush(null);

    expect(component.registrationComplete()).toBe(true);
    expect(component.isSubmitting()).toBe(false);
  });
});
