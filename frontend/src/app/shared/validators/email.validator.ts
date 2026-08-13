import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Mirrors HBSValidation.isValidEmail from Shared/UtilityClass/validation.js
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const emailValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  if (!control.value) return null;
  return EMAIL_PATTERN.test(control.value) ? null : { email: true };
};
