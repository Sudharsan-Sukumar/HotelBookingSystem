import { Injectable } from '@angular/core';

/** Direct port of Shared/UtilityClass/validation.js (HBSValidation). */
@Injectable({ providedIn: 'root' })
export class ValidationService {
  isNumeric(str: string): boolean {
    return /^\d+$/.test(str);
  }

  isValidPhone(phone: string): boolean {
    const clean = phone.replace(/[\s\-\+]/g, '');
    return /^\d{10,15}$/.test(clean);
  }

  isStrongPassword(pwd: string): boolean {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(pwd);
  }

  isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  isValidLuhn(cardNumber: string): boolean {
    const clean = cardNumber.replace(/\D/g, '');
    if (clean.length < 13 || clean.length > 19) return false;
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
    return sum % 10 === 0;
  }

  isValidExpiry(expStr: string): boolean {
    if (!/^\d{2}\/\d{2}$/.test(expStr)) return false;
    const parts = expStr.split('/');
    const month = parseInt(parts[0], 10);
    const year = parseInt('20' + parts[1], 10);
    if (month < 1 || month > 12) return false;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;

    return true;
  }

  isValidCVV(cvv: string): boolean {
    return /^\d{3,4}$/.test(cvv);
  }
}
