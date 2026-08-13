import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Mirrors HBSValidation.isValidLuhn from Shared/UtilityClass/validation.js
export const luhnValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const clean = String(control.value ?? '').replace(/\D/g, '');
  if (clean.length < 13 || clean.length > 19) return { luhn: true };

  let sum = 0;
  let shouldDouble = false;
  for (let i = clean.length - 1; i >= 0; i--) {
    let digit = parseInt(clean.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0 ? null : { luhn: true };
};
