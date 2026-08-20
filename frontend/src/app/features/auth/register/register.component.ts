import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ApiResponse } from '../../../core/models/api-response.model';

/** Mirrors backend Common/Constants/ValidationRegexConstants.cs exactly. */
const NAME_RE = /^[a-zA-Z\s.\-]{2,80}$/;
const LASTNAME_RE = /^[a-zA-Z\s.\-]{1,80}$/;
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
const PHONE_RE = /^[6-9]\d{9}$/;
const PASSWORD_RE = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;
const OTP_RE = /^\d{6}$/;

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  // Registration form fields
  firstName = '';
  lastName = '';
  dob = '';
  email = '';
  phone = '';
  password = '';
  confirmPassword = '';
  showPassword = false;
  agreePolicies = false;

  isSubmitting = false;

  dobMin = '';
  dobMax = '';

  errors: Record<string, string> = {};

  statusAlert: { message: string; type: 'success' | 'danger' } | null = null;

  // Post-registration email verification step
  view: 'register' | 'verifyEmail' = 'register';
  otp = '';
  otpError = '';
  otpInvalid = false;
  isVerifying = false;
  isResending = false;
  resendCooldownMsg = '';

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const today = new Date();
    this.dobMax = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()).toISOString().split('T')[0];
    this.dobMin = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate()).toISOString().split('T')[0];
  }

  get passwordType(): string {
    return this.showPassword ? 'text' : 'password';
  }

  private setError(field: string, message: string): void {
    this.errors[field] = message;
  }

  private clearError(field: string): void {
    delete this.errors[field];
  }

  hasError(field: string): boolean {
    return !!this.errors[field];
  }

  validateFirstName(): boolean {
    const val = this.firstName.trim();
    if (!val) {
      this.setError('firstName', 'First name is required.');
      return false;
    }
    if (!NAME_RE.test(val)) {
      this.setError('firstName', 'First name must be 2-80 characters (letters, spaces, . or - only).');
      return false;
    }
    this.clearError('firstName');
    return true;
  }

  validateLastName(): boolean {
    const val = this.lastName.trim();
    if (!val) {
      this.setError('lastName', 'Last name is required.');
      return false;
    }
    if (!LASTNAME_RE.test(val)) {
      this.setError('lastName', 'Last name must be 1-80 characters (letters, spaces, . or - only).');
      return false;
    }
    this.clearError('lastName');
    return true;
  }

  private computeAge(dobVal: string): number {
    const dob = new Date(dobVal);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }

  validateDob(): boolean {
    const val = this.dob;
    if (!val) {
      this.setError('dob', 'Date of Birth is required.');
      return false;
    }
    const dob = new Date(val);
    if (isNaN(dob.getTime())) {
      this.setError('dob', 'Please enter a valid date.');
      return false;
    }
    const today = new Date();
    const age = this.computeAge(val);

    if (age > 120) {
      this.setError('dob', 'Please enter a valid date of birth.');
      return false;
    }

    if (age < 18) {
      if (dob > today) {
        this.setError('dob', 'Date of birth cannot be in the future.');
      } else {
        this.setError('dob', 'You must be at least 18 years old to register.');
      }
      return false;
    }
    this.clearError('dob');
    return true;
  }

  validateEmail(): boolean {
    const val = this.email.trim();
    if (!val) {
      this.setError('email', 'Email address is required.');
      return false;
    }
    if (!EMAIL_RE.test(val)) {
      this.setError('email', 'Please enter a valid email address (e.g., name@example.com).');
      return false;
    }
    this.clearError('email');
    return true;
  }

  validatePhone(): boolean {
    const val = this.phone.trim();
    if (!val) {
      this.setError('phone', 'Phone number is required.');
      return false;
    }
    if (!PHONE_RE.test(val)) {
      this.setError('phone', 'Enter a valid 10-digit Indian mobile number starting with 6-9 (e.g., 9876543210).');
      return false;
    }
    this.clearError('phone');
    return true;
  }

  validatePassword(): boolean {
    const val = this.password;
    if (!val) {
      this.setError('password', 'Password is required.');
      return false;
    }
    if (!PASSWORD_RE.test(val)) {
      this.setError('password', 'Minimum 8 characters, at least 1 digit and 1 special character (!@#$%^&*).');
      return false;
    }
    this.clearError('password');
    return true;
  }

  validateConfirmPassword(): boolean {
    const val = this.confirmPassword;
    if (!val) {
      this.setError('confirmPassword', 'Please confirm your password.');
      return false;
    }
    if (val !== this.password) {
      this.setError('confirmPassword', 'Passwords do not match.');
      return false;
    }
    this.clearError('confirmPassword');
    return true;
  }

  validatePolicies(): boolean {
    if (!this.agreePolicies) {
      this.setError('agreePolicies', 'You must accept the registration policies to continue.');
      return false;
    }
    this.clearError('agreePolicies');
    return true;
  }

  onPasswordInput(): void {
    if (this.confirmPassword) {
      this.validateConfirmPassword();
    }
  }

  get isFormValid(): boolean {
    const isFirstNameValid = NAME_RE.test(this.firstName.trim());
    const isLastNameValid = LASTNAME_RE.test(this.lastName.trim());
    let isDobValid = false;
    if (this.dob) {
      const dob = new Date(this.dob);
      if (!isNaN(dob.getTime())) {
        const age = this.computeAge(this.dob);
        isDobValid = age >= 18 && age <= 120;
      }
    }
    const isEmailValid = EMAIL_RE.test(this.email.trim());
    const isPhoneValid = PHONE_RE.test(this.phone.trim());
    const isPasswordValid = PASSWORD_RE.test(this.password);
    const isConfirmPasswordValid = this.confirmPassword === this.password && this.confirmPassword !== '';
    const isPoliciesValid = this.agreePolicies;

    return isFirstNameValid && isLastNameValid && isDobValid && isEmailValid && isPhoneValid &&
      isPasswordValid && isConfirmPasswordValid && isPoliciesValid;
  }

  private showAlert(msg: string, type: 'success' | 'danger' = 'success'): void {
    this.statusAlert = { message: msg, type };
  }

  onSubmit(): void {
    const v1 = this.validateFirstName();
    const v2 = this.validateLastName();
    const vDob = this.validateDob();
    const v3 = this.validateEmail();
    const v4 = this.validatePhone();
    const v5 = this.validatePassword();
    const v6 = this.validateConfirmPassword();
    const v7 = this.validatePolicies();

    if (!(v1 && v2 && vDob && v3 && v4 && v5 && v6 && v7)) {
      return;
    }

    this.isSubmitting = true;
    this.statusAlert = null;

    this.auth.register({
      firstName: this.firstName.trim(),
      lastName: this.lastName.trim(),
      dateOfBirth: this.dob,
      email: this.email.trim().toLowerCase(),
      password: this.password,
      confirmPassword: this.confirmPassword,
      phone: this.phone.trim()
    }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.view = 'verifyEmail';
        this.showAlert('Registration successful. Please check your email for a 6-digit verification code.', 'success');
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting = false;
        this.handleRegisterError(err);
      }
    });
  }

  private handleRegisterError(err: HttpErrorResponse): void {
    const body = err.error as ApiResponse<null> | undefined;
    const serverErrors = body?.errors ?? [];
    const serverMessage = body?.message ?? '';
    const combined = (serverErrors.length ? serverErrors.join(' ') : serverMessage).toLowerCase();

    if (combined.includes('email')) {
      this.setError('email', serverErrors[0] || serverMessage || 'This email is already registered.');
    } else if (combined.includes('phone')) {
      this.setError('phone', serverErrors[0] || serverMessage || 'This phone number is already registered.');
    } else if (combined.includes('password')) {
      this.setError('password', serverErrors[0] || serverMessage);
    } else if (combined.includes('18 years') || combined.includes('date of birth')) {
      this.setError('dob', serverErrors[0] || serverMessage);
    } else {
      this.showAlert(serverErrors[0] || serverMessage || 'Registration failed. Please check your details and try again.', 'danger');
    }
  }

  // ---- Email verification step ----

  validateOtp(): boolean {
    const val = this.otp.trim();
    this.otpInvalid = false;
    this.otpError = '';
    if (!val) {
      this.otpInvalid = true;
      this.otpError = 'OTP is required.';
      return false;
    }
    if (!OTP_RE.test(val)) {
      this.otpInvalid = true;
      this.otpError = 'OTP must be exactly 6 digits.';
      return false;
    }
    return true;
  }

  onVerifyEmail(): void {
    if (!this.validateOtp()) {
      return;
    }

    this.isVerifying = true;
    this.statusAlert = null;

    this.auth.verifyEmail({ email: this.email.trim().toLowerCase(), token: this.otp.trim() }).subscribe({
      next: () => {
        this.isVerifying = false;
        sessionStorage.setItem('resetSuccessMsg', 'Email verified successfully. You can now log in.');
        this.router.navigate(['/auth/login']);
      },
      error: (err: HttpErrorResponse) => {
        this.isVerifying = false;
        const body = err.error as ApiResponse<null> | undefined;
        this.otpInvalid = true;
        this.otpError = body?.message || 'Invalid or expired OTP. Please try again.';
      }
    });
  }

  onResendCode(): void {
    this.isResending = true;
    this.resendCooldownMsg = '';
    this.statusAlert = null;

    this.auth.resendVerification({ email: this.email.trim().toLowerCase() }).subscribe({
      next: () => {
        this.isResending = false;
        this.showAlert('A new verification code has been sent to your email.', 'success');
      },
      error: () => {
        this.isResending = false;
        this.showAlert('Could not resend the code right now. Please try again shortly.', 'danger');
      }
    });
  }
}
