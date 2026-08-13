import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { emailValidator } from '../../../shared/validators/email.validator';
import { phoneIndiaValidator } from '../../../shared/validators/phone.validator';
import { strongPasswordValidator } from '../../../shared/validators/password-strength.validator';

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return password && confirmPassword && password !== confirmPassword ? { passwordMismatch: true } : null;
}

function minAge18Validator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const dob = new Date(control.value);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age--;
  return age >= 18 ? null : { underage: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly showPassword = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.group(
    {
      firstName: ['', [Validators.required, Validators.pattern(/^[A-Za-z ]{2,80}$/)]],
      lastName: ['', [Validators.required, Validators.pattern(/^[A-Za-z ]{1,80}$/)]],
      dateOfBirth: ['', [Validators.required, minAge18Validator]],
      email: ['', [Validators.required, emailValidator]],
      phone: ['', [Validators.required, phoneIndiaValidator]],
      password: ['', [Validators.required, strongPasswordValidator]],
      confirmPassword: ['', Validators.required],
      agreePolicies: [false, Validators.requiredTrue],
    },
    { validators: passwordsMatchValidator }
  );

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  submit(): void {
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { firstName, lastName, dateOfBirth, email, phone, password } = this.form.getRawValue();
    this.submitting.set(true);

    this.auth
      .register({
        firstName: firstName!,
        lastName: lastName!,
        dateOfBirth: dateOfBirth!,
        email: email!.trim().toLowerCase(),
        phone: phone!,
        password: password!,
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          if (!res.data) {
            this.errorMessage.set(res.message || 'Email is already registered.');
            return;
          }
          this.router.navigate(['/verify-email'], { queryParams: { email: res.data.email } });
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(err?.error?.message ?? 'Something went wrong. Please try again.');
        },
      });
  }
}
