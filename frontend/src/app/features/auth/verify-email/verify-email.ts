import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.scss',
})
export class VerifyEmail {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly verifying = signal(false);
  readonly resending = signal(false);
  readonly statusMessage = signal<{ type: 'success' | 'danger'; text: string } | null>(null);

  readonly form = this.fb.group({
    email: [this.route.snapshot.queryParamMap.get('email') ?? '', [Validators.required]],
    token: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  submit(): void {
    this.statusMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.verifying.set(true);
    const { email, token } = this.form.getRawValue();

    this.auth.verifyEmail({ email: email!, token: token! }).subscribe({
      next: () => {
        this.verifying.set(false);
        this.router.navigateByUrl('/login');
      },
      error: (err) => {
        this.verifying.set(false);
        this.statusMessage.set({
          type: 'danger',
          text: err?.error?.message ?? 'Verification link expired or invalid. Please request a new one.',
        });
      },
    });
  }

  resend(): void {
    const email = this.form.value.email;
    if (!email) {
      this.form.controls.email.markAsTouched();
      return;
    }

    this.resending.set(true);
    this.auth.resendVerification({ email }).subscribe({
      next: (res) => {
        this.resending.set(false);
        this.statusMessage.set({ type: 'success', text: res.message });
      },
      error: () => {
        this.resending.set(false);
        this.statusMessage.set({ type: 'success', text: 'If the email is registered and pending, a new verification OTP has been sent.' });
      },
    });
  }
}
