import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ValidationService } from '../../../core/services/validation.service';
import { AuthService } from '../../../core/services/auth.service';
import { GoogleSigninButtonComponent } from '../../../shared/components/google-signin-button/google-signin-button.component';

const REMEMBERED_EMAIL_KEY = 'hbs_remembered_email';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, GoogleSigninButtonComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  rememberMe = false;
  passwordVisible = false;
  isSubmitting = false;
  googleError = '';

  emailError = '';
  passwordError = '';
  emailInvalid = false;
  passwordInvalid = false;

  private returnUrl: string | null = null;

  constructor(
    private validation: ValidationService,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Check for redirect password reset success message
    const successMsg = sessionStorage.getItem('resetSuccessMsg');
    if (successMsg) {
      alert(successMsg);
      sessionStorage.removeItem('resetSuccessMsg');
    }

    // Pre-fill email if remembered
    const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (rememberedEmail) {
      this.email = rememberedEmail;
      this.rememberMe = true;
    }

    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  private resetErrors(): void {
    this.emailInvalid = false;
    this.passwordInvalid = false;
    this.emailError = '';
    this.passwordError = '';
  }

  private validateForm(): boolean {
    let isValid = true;
    this.resetErrors();

    if (!this.email.trim()) {
      this.emailInvalid = true;
      this.emailError = 'Email Address is required.';
      isValid = false;
    } else if (!this.validation.isValidEmail(this.email)) {
      this.emailInvalid = true;
      this.emailError = 'Please enter a valid email address.';
      isValid = false;
    }

    if (!this.password.trim()) {
      this.passwordInvalid = true;
      this.passwordError = 'Password is required.';
      isValid = false;
    }

    return isValid;
  }

  onSubmit(): void {
    if (!this.validateForm()) {
      return;
    }

    const enteredEmail = this.email.trim().toLowerCase();
    this.isSubmitting = true;

    this.auth.login({ email: enteredEmail, password: this.password }).subscribe({
      next: (res) => {
        this.isSubmitting = false;

        if (this.rememberMe) {
          localStorage.setItem(REMEMBERED_EMAIL_KEY, enteredEmail);
        } else {
          localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        }

        const role = res.data.role;

        if (res.data.forcePasswordChange) {
          // Backend requires a password change before anything else can be done.
          this.router.navigate(['/auth/forgot-password'], { queryParams: { forced: 1, email: enteredEmail } });
          return;
        }

        this.router.navigateByUrl(this.returnUrl || this.auth.homeRouteForRole(role));
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting = false;
        this.emailInvalid = true;
        this.passwordInvalid = true;

        if (err.status === 423) {
          this.emailError = 'Account temporarily locked after too many failed attempts. Please try again in 30 minutes, or reset your password.';
        } else if (err.status === 401 || err.status === 400) {
          this.emailError = 'Invalid email or password. Please try again.';
        } else if (err.status === 403) {
          this.emailError = 'Your account is not active. Please contact support.';
        } else {
          this.emailError = (err as any).friendlyMessage || 'Something went wrong. Please try again.';
        }
      }
    });
  }

  onGoogleLogin(idToken: string): void {
    this.googleError = '';
    this.isSubmitting = true;

    this.auth.googleLogin(idToken).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        const role = res.data.role;
        this.router.navigateByUrl(this.returnUrl || this.auth.homeRouteForRole(role));
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting = false;
        this.googleError = (err.error?.message) || 'Google sign-in failed. Please try again.';
      }
    });
  }
}
