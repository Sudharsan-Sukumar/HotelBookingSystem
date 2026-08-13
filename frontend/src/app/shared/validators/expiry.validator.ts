import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Mirrors HBSValidation.isValidExpiry from Shared/UtilityClass/validation.js (format MM/YY)
export const expiryValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value: string = control.value ?? '';
  if (!/^\d{2}\/\d{2}$/.test(value)) return { expiry: true };

  const [monthStr, yearStr] = value.split('/');
  const month = parseInt(monthStr, 10);
  const year = parseInt(`20${yearStr}`, 10);
  if (month < 1 || month > 12) return { expiry: true };

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (year < currentYear) return { expiry: true };
  if (year === currentYear && month < currentMonth) return { expiry: true };

  return null;
};
