import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Mirrors HBSValidation.isValidCVV from Shared/UtilityClass/validation.js
export const cvvValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  if (!control.value) return null;
  return /^\d{3,4}$/.test(control.value) ? null : { cvv: true };
};
