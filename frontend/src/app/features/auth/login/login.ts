import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { emailValidator } from '../../../shared/validators/email.validator';

const REMEMBERED_EMAIL_KEY = 'hbs_remembered_email';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly passwordVisible = signal(false);
  readonly submitting = signal(false);
  readonly loginFailed = signal(false);

  readonly form = this.fb.group({
    email: [localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? '', [Validators.required, emailValidator]],
    password: ['', Validators.required],
    rememberMe: [!!localStorage.getItem(REMEMBERED_EMAIL_KEY)],
  });

  togglePassword(): void {
    this.passwordVisible.update((v) => !v);
  }

  submit(): void {
    this.loginFailed.set(false);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password, rememberMe } = this.form.getRawValue();
    this.submitting.set(true);

    this.auth.login({ email: email!.trim().toLowerCase(), password: password! }).subscribe({
      next: (res) => {
        this.submitting.set(false);
        if (!res.data) {
          this.loginFailed.set(true);
          return;
        }

        if (rememberMe) {
          localStorage.setItem(REMEMBERED_EMAIL_KEY, res.data.email);
        } else {
          localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        }

        switch (res.data.role) {
          case 'Customer':
            this.router.navigateByUrl('/my-bookings');
            break;
          case 'Manager':
            this.router.navigateByUrl('/manager/dashboard');
            break;
          case 'Admin':
            this.router.navigateByUrl('/admin/dashboard');
            break;
        }
      },
      error: () => {
        this.submitting.set(false);
        this.loginFailed.set(true);
      },
    });
  }
}
