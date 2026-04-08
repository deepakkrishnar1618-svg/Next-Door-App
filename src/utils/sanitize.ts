import DOMPurify from 'dompurify';

/**
 * Sanitize HTML to prevent XSS attacks
 * Removes all scripts, event handlers, and other potentially dangerous content
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true, // Keep text content but strip tags
  });
}

/**
 * Sanitize plain text for display
 * Escapes HTML entities to prevent XSS
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize user input before storing in database
 * This is an extra layer of defense
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');
  
  // Limit length to prevent DoS
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000);
  }
  
  // Remove any potential SQL injection attempts
  // (Though we use prepared statements, this is defense in depth)
  sanitized = sanitized.replace(/--/g, '');
  sanitized = sanitized.replace(/;(?=\s*(?:DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|GRANT|REVOKE)\s)/gi, '');
  
  return sanitized.trim();
}
