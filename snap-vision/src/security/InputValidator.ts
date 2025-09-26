// src/security/InputValidator.ts

export class InputValidator {
  /**
   * Validate and sanitize user ID
   */
  static validateUserId(userId: unknown): string | null {
    if (!userId || typeof userId !== 'string') {
      return null;
    }

    // Firebase Auth UIDs are exactly 28 characters alphanumeric
    const sanitized = userId.trim();
    if (!/^[a-zA-Z0-9]{20,128}$/.test(sanitized)) {
      return null;
    }

    return sanitized;
  }

  /**
   * Validate and sanitize document ID
   */
  static validateDocumentId(id: unknown): string | null {
    if (!id || typeof id !== 'string') {
      return null;
    }

    const sanitized = id.trim();
    
    // Firestore document ID validation
    if (sanitized.length === 0 || sanitized.length > 1500) {
      return null;
    }

    // Check for invalid characters
    if (/[\/\x00-\x1f\x7f-\x9f]/.test(sanitized)) {
      return null;
    }

    return sanitized;
  }

  /**
   * Validate email address
   */
  static validateEmail(email: unknown): string | null {
    if (!email || typeof email !== 'string') {
      return null;
    }

    const sanitized = email.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(sanitized) || sanitized.length > 254) {
      return null;
    }

    return sanitized;
  }

  /**
   * Validate and sanitize text input
   */
  static validateText(text: unknown, maxLength: number = 1000): string | null {
    if (!text || typeof text !== 'string') {
      return null;
    }

    const sanitized = text
      .replace(/[<>\"'&]/g, '') // Remove XSS characters
      .replace(/[\x00-\x1f\x7f-\x9f]/g, '') // Remove control characters
      .trim();

    if (sanitized.length === 0 || sanitized.length > maxLength) {
      return null;
    }

    return sanitized;
  }

  /**
   * Validate numeric input
   */
  static validateNumber(value: unknown, min?: number, max?: number): number | null {
    const num = Number(value);
    
    if (isNaN(num) || !isFinite(num)) {
      return null;
    }

    if (min !== undefined && num < min) {
      return null;
    }

    if (max !== undefined && num > max) {
      return null;
    }

    return num;
  }

  /**
   * Validate coordinates
   */
  static validateCoordinate(coord: unknown): number | null {
    const num = this.validateNumber(coord, -180, 180);
    return num;
  }

  /**
   * Validate role
   */
  static validateRole(role: unknown): 'admin' | 'editor' | 'user' | null {
    if (!role || typeof role !== 'string') {
      return null;
    }

    const sanitized = role.trim().toLowerCase();
    const validRoles = ['admin', 'editor', 'user'];
    
    return validRoles.includes(sanitized) ? (sanitized as 'admin' | 'editor' | 'user') : null;
  }

  /**
   * Validate array of strings (like adminLocations)
   */
  static validateStringArray(arr: unknown, maxItems: number = 100): string[] | null {
    if (!Array.isArray(arr)) {
      return null;
    }

    if (arr.length > maxItems) {
      return null;
    }

    const validated: string[] = [];
    for (const item of arr) {
      const validItem = this.validateDocumentId(item);
      if (!validItem) {
        return null;
      }
      validated.push(validItem);
    }

    return validated;
  }

  /**
   * Validate search query
   */
  static validateSearchQuery(query: unknown): string | null {
    if (!query || typeof query !== 'string') {
      return '';
    }

    const sanitized = query
      .replace(/[<>\"'&]/g, '')
      .replace(/[\x00-\x1f\x7f-\x9f]/g, '')
      .trim();

    // Limit search query length
    if (sanitized.length > 200) {
      return null;
    }

    return sanitized;
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(limit?: unknown, offset?: unknown) {
    const validLimit = this.validateNumber(limit, 1, 100) || 10;
    const validOffset = this.validateNumber(offset, 0) || 0;
    
    return { limit: validLimit, offset: validOffset };
  }

  /**
   * Validate URL format
   */
  static validateUrl(url: unknown): string | null {
    if (!url || typeof url !== 'string') {
      return null;
    }

    const sanitized = url.trim();
    
    try {
      const urlObj = new URL(sanitized);
      // Only allow https and http protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return null;
      }
      return sanitized;
    } catch {
      return null;
    }
  }
}

export default InputValidator;