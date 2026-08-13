import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Mirrors HBSValidation.isValidPhone from Shared/UtilityClass/validation.js
export const phoneValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  if (!control.value) return null;
  const clean = String(control.value).replace(/[\s\-+]/g, '');
  return /^\d{10,15}$/.test(clean) ? null : { phone: true };
};

// Mirrors RegisterDto's server-side PhoneIndia regex (10 digits, starts with 6-9)
export const phoneIndiaValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  if (!control.value) return null;
  return /^[6-9]\d{9}$/.test(control.value) ? null : { phoneIndia: true };
};
