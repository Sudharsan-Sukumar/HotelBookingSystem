// Shared/UtilityClass/validation.js
class HBSValidation {
  static isNumeric(str) {
    return /^\d+$/.test(str);
  }

  static isValidPhone(phone) {
    // Basic 10-15 digits, optional + prefix, spaces allowed but filtered for length check
    const clean = phone.replace(/[\s\-\+]/g, '');
    return /^\d{10,15}$/.test(clean);
  }

  static isStrongPassword(pwd) {
    // Minimum 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(pwd);
  }

  static isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  static isValidLuhn(cardNumber) {
    const clean = cardNumber.replace(/\D/g, '');
    if (clean.length < 13 || clean.length > 19) return false;
    let sum = 0;
    let shouldDouble = false;
    for (let i = clean.length - 1; i >= 0; i--) {
        let digit = parseInt(clean.charAt(i));
        if (shouldDouble) {
            if ((digit *= 2) > 9) digit -= 9;
        }
        sum += digit;
        shouldDouble = !shouldDouble;
    }
    return (sum % 10) == 0;
  }

  static isValidExpiry(expStr) { 
    // Format MM/YY
    if (!/^\d{2}\/\d{2}$/.test(expStr)) return false;
    const parts = expStr.split('/');
    const month = parseInt(parts[0], 10);
    const year = parseInt('20' + parts[1], 10);
    if (month < 1 || month > 12) return false;
    
    const now = new Date();
    // Expiry date is effectively end of that month, but we compare year and month directly
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed

    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;
    
    return true;
  }

  static isValidCVV(cvv) {
    return /^\d{3,4}$/.test(cvv);
  }
}

window.HBSValidation = HBSValidation;
