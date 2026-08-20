import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ApiResponse } from '../../../core/models/api-response.model';

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
const PASSWORD_RE = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;
const OTP_RE = /^\d{6}$/;

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit {
  email = '';
  otp = '';
  oldPassword = '';
  newPassword = '';
  confirmPassword = '';
  showPassword = false;

  step: 1 | 2 | 3 = 1;
  resetComplete = false;
  isSubmitting = false;

  emailInvalid = false;
  emailError = '';
  otpInvalid = false;
  otpError = '';
  oldPasswordInvalid = false;
  oldPasswordError = '';
  newPasswordInvalid = false;
  newPasswordError = '';
  confirmPasswordInvalid = false;
  confirmPasswordError = '';

  statusAlert: { message: string; type: 'success' | 'danger' } | null = null;

  /** True when we arrived here via login's forced-password-change redirect. */
  forced = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const forcedParam = params.get('forced');
    const emailParam = params.get('email');

    if (forcedParam === '1' && emailParam) {
      this.forced = true;
      this.email = emailParam;
      this.showAlert('Your password must be changed before you can continue. We\'ve sent an OTP to your email.', 'success');
      // Kick off a fresh OTP automatically so the user can go straight to step 2.
      this.requestOtp(true);
    }
  }

  get passwordType(): string {
    return this.showPassword ? 'text' : 'password';
  }

  private showAlert(msg: string, type: 'success' | 'danger' = 'danger'): void {
    this.statusAlert = { message: msg, type };
  }

  private hideAlert(): void {
    this.statusAlert = null;
  }

  private validateEmailField(): boolean {
    this.emailInvalid = false;
    this.emailError = '';

    const emailValue = this.email.trim();
    if (!emailValue) {
      this.emailInvalid = true;
      this.emailError = 'Registered Email is required.';
      return false;
    }
    if (!EMAIL_RE.test(emailValue)) {
      this.emailInvalid = true;
      this.emailError = 'Please enter a valid email address.';
      return false;
    }
    return true;
  }

  private requestOtp(silent = false): void {
    const emailValue = this.email.trim().toLowerCase();
    this.isSubmitting = true;

    this.auth.forgotPassword({ email: emailValue }).subscribe({
      next: () => {
        this.isSubmitting = false;
        if (!silent) {
          this.showAlert('If this email is registered, an OTP has been sent. Please check your inbox.', 'success');
        }
        this.step = 2;
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting = false;
        const body = err.error as ApiResponse<null> | undefined;
        this.showAlert(body?.message || 'Something went wrong. Please try again.', 'danger');
      }
    });
  }

  onSendOtpOrVerify(): void {
    this.hideAlert();

    if (this.step === 1) {
      if (!this.validateEmailField()) {
        return;
      }
      this.requestOtp();
    } else if (this.step === 2) {
      this.otpInvalid = false;
      this.otpError = '';

      const otpValue = this.otp.trim();
      if (!otpValue) {
        this.otpInvalid = true;
        this.otpError = 'OTP is required.';
        return;
      }
      if (!OTP_RE.test(otpValue)) {
        this.otpInvalid = true;
        this.otpError = 'OTP must be exactly 6 digits.';
        return;
      }

      // The OTP itself is verified server-side on the reset-password call; move to step 3
      // where the user supplies old + new password alongside it.
      this.step = 3;
    }
  }

  private validateResetForm(): boolean {
    let isValid = true;

    this.otpInvalid = false;
    this.otpError = '';
    this.oldPasswordInvalid = false;
    this.oldPasswordError = '';
    this.newPasswordInvalid = false;
    this.newPasswordError = '';
    this.confirmPasswordInvalid = false;
    this.confirmPasswordError = '';
    this.hideAlert();

    const otpValue = this.otp.trim();
    if (!otpValue || !OTP_RE.test(otpValue)) {
      this.otpInvalid = true;
      this.otpError = 'OTP must be exactly 6 digits.';
      isValid = false;
    }

    if (!this.oldPassword) {
      this.oldPasswordInvalid = true;
      this.oldPasswordError = 'Current Password is required.';
      isValid = false;
    }

    const newPwd = this.newPassword;
    const confirmPwd = this.confirmPassword;

    if (!newPwd) {
      this.newPasswordInvalid = true;
      this.newPasswordError = 'New Password is required.';
      isValid = false;
    } else if (!PASSWORD_RE.test(newPwd)) {
      this.newPasswordInvalid = true;
      this.newPasswordError = 'Minimum 8 characters, at least 1 digit and 1 special character (!@#$%^&*).';
      isValid = false;
    } else if (newPwd === this.oldPassword) {
      this.newPasswordInvalid = true;
      this.newPasswordError = 'New password must be different from the old password.';
      isValid = false;
    }

    if (!confirmPwd) {
      this.confirmPasswordInvalid = true;
      this.confirmPasswordError = 'Please confirm your new password.';
      isValid = false;
    } else if (newPwd !== confirmPwd) {
      this.confirmPasswordInvalid = true;
      this.confirmPasswordError = 'Passwords do not match.';
      isValid = false;
    }

    return isValid;
  }

  onSubmit(): void {
    if (this.step !== 3) {
      return;
    }

    if (!this.validateResetForm()) {
      return;
    }

    this.isSubmitting = true;

    this.auth.resetPassword({
      email: this.email.trim().toLowerCase(),
      token: this.otp.trim(),
      oldPassword: this.oldPassword,
      newPassword: this.newPassword,
      confirmNewPassword: this.confirmPassword
    }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.showAlert('Password reset successfully. Redirecting to login...', 'success');
        this.resetComplete = true;

        sessionStorage.setItem('resetSuccessMsg', 'Password reset successfully. Please log in with your new password.');
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2500);
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting = false;
        this.handleResetError(err);
      }
    });
  }

  private handleResetError(err: HttpErrorResponse): void {
    const body = err.error as ApiResponse<null> | undefined;
    const serverErrors = body?.errors ?? [];
    const serverMessage = body?.message ?? '';
    const combined = (serverErrors.length ? serverErrors.join(' ') : serverMessage).toLowerCase();

    if (combined.includes('otp') || combined.includes('expired') || combined.includes('invalid')) {
      this.otpInvalid = true;
      this.otpError = serverErrors[0] || serverMessage || 'Invalid or expired OTP.';
    } else if (combined.includes('old password') || combined.includes('current password') || combined.includes('incorrect password')) {
      this.oldPasswordInvalid = true;
      this.oldPasswordError = serverErrors[0] || serverMessage || 'Current password is incorrect.';
    } else if (combined.includes('different from the old') || combined.includes('new password must be different')) {
      this.newPasswordInvalid = true;
      this.newPasswordError = serverErrors[0] || serverMessage;
    } else if (combined.includes('match')) {
      this.confirmPasswordInvalid = true;
      this.confirmPasswordError = serverErrors[0] || serverMessage;
    } else {
      this.showAlert(serverErrors[0] || serverMessage || 'Could not reset password. Please try again.', 'danger');
    }
  }
}
