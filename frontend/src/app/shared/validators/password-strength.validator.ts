import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Mirrors HBSValidation.isStrongPassword from Shared/UtilityClass/validation.js
export const strongPasswordValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  if (!control.value) return null;
  const pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return pattern.test(control.value) ? null : { weakPassword: true };
};
