import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { emailValidator } from '../../../shared/validators/email.validator';
import { strongPasswordValidator } from '../../../shared/validators/password-strength.validator';

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return password && confirmPassword && password !== confirmPassword ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly otpSent = signal(false);
  readonly sendingOtp = signal(false);
  readonly resetting = signal(false);
  readonly showPassword = signal(false);
  readonly statusMessage = signal<{ type: 'success' | 'danger'; text: string } | null>(null);

  readonly emailForm = this.fb.group({
    email: ['', [Validators.required, emailValidator]],
  });

  readonly resetForm = this.fb.group(
    {
      otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      oldPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, strongPasswordValidator]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatchValidator }
  );

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  sendOtp(): void {
    this.statusMessage.set(null);
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    this.sendingOtp.set(true);
    this.auth.forgotPassword({ email: this.emailForm.value.email!.trim().toLowerCase() }).subscribe({
      next: (res) => {
        this.sendingOtp.set(false);
        this.otpSent.set(true);
        this.statusMessage.set({ type: 'success', text: res.message });
      },
      error: () => {
        this.sendingOtp.set(false);
        // Deliberately treated as success: the backend also returns Ok here to avoid email enumeration.
        this.otpSent.set(true);
        this.statusMessage.set({ type: 'success', text: 'If the email is registered, a password reset OTP has been sent.' });
      },
    });
  }

  submitReset(): void {
    this.statusMessage.set(null);
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    const { otp, oldPassword, newPassword, confirmPassword } = this.resetForm.getRawValue();
    this.resetting.set(true);

    this.auth
      .resetPassword({
        email: this.emailForm.value.email!.trim().toLowerCase(),
        token: otp!,
        oldPassword: oldPassword!,
        newPassword: newPassword!,
        confirmNewPassword: confirmPassword!,
      })
      .subscribe({
        next: (res) => {
          this.resetting.set(false);
          if (!res.success) {
            this.statusMessage.set({ type: 'danger', text: res.message });
            return;
          }
          sessionStorage.setItem('resetSuccessMsg', res.message);
          this.router.navigateByUrl('/login');
        },
        error: (err) => {
          this.resetting.set(false);
          this.statusMessage.set({
            type: 'danger',
            text: err?.error?.message ?? 'Reset OTP is invalid or has expired. Please request a new one.',
          });
        },
      });
  }
}
