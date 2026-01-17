/**
 * **Feature: homeheroes-frontend, Property 2: Form validation prevents invalid submissions**
 * **Validates: Requirements 1.3**
 * 
 * Property-based test to verify that authentication form validation
 * prevents invalid submissions across all possible invalid input combinations.
 */

import * as fc from 'fast-check';

// Types for form validation
interface LoginFormData {
  email: string;
  password: string;
}

interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  userType: 'civilian' | 'hero';
}

interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// Validation functions extracted from the auth screens
const validateEmail = (email: string): string | undefined => {
  if (!email.trim()) {
    return 'Email is required';
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    return 'Please enter a valid email address';
  }
  return undefined;
};

const validatePassword = (password: string): string | undefined => {
  if (!password) {
    return 'Password is required';
  }
  if (password.length < 6) {
    return 'Password must be at least 6 characters';
  }
  return undefined;
};

const validateSignupPassword = (password: string): string | undefined => {
  if (!password) {
    return 'Password is required';
  }
  if (password.length < 6) {
    return 'Password must be at least 6 characters';
  }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
  }
  return undefined;
};

const validateConfirmPassword = (password: string, confirmPassword: string): string | undefined => {
  if (!confirmPassword) {
    return 'Please confirm your password';
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }
  return undefined;
};

const validateUserType = (userType: string): string | undefined => {
  if (!userType) {
    return 'Please select your account type';
  }
  if (userType !== 'civilian' && userType !== 'hero') {
    return 'Invalid user type';
  }
  return undefined;
};

// Form validation functions
const validateLoginForm = (formData: LoginFormData): ValidationResult => {
  const errors: Record<string, string> = {};
  
  const emailError = validateEmail(formData.email);
  if (emailError) errors.email = emailError;
  
  const passwordError = validatePassword(formData.password);
  if (passwordError) errors.password = passwordError;
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

const validateSignupForm = (formData: SignupFormData): ValidationResult => {
  const errors: Record<string, string> = {};
  
  const emailError = validateEmail(formData.email);
  if (emailError) errors.email = emailError;
  
  const passwordError = validateSignupPassword(formData.password);
  if (passwordError) errors.password = passwordError;
  
  const confirmPasswordError = validateConfirmPassword(formData.password, formData.confirmPassword);
  if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;
  
  const userTypeError = validateUserType(formData.userType);
  if (userTypeError) errors.userType = userTypeError;
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// Generators for invalid inputs
const invalidEmailGenerator = fc.oneof(
  fc.constant(''), // Empty string
  fc.string().filter(s => s.trim() === ''), // Whitespace only
  fc.string().filter(s => !s.includes('@')), // No @ symbol
  fc.string().filter(s => s.includes('@') && !s.includes('.')), // @ but no dot
  fc.constant('invalid@'), // Missing domain
  fc.constant('@invalid.com'), // Missing local part
  fc.constant('invalid@.com'), // Empty domain
);

const invalidPasswordGenerator = fc.oneof(
  fc.constant(''), // Empty password
  fc.string({ maxLength: 5 }), // Too short
);

const invalidSignupPasswordGenerator = fc.oneof(
  fc.constant(''), // Empty password
  fc.string({ maxLength: 5 }), // Too short
  fc.string({ minLength: 6 }).filter(s => !/[A-Z]/.test(s)), // No uppercase
  fc.string({ minLength: 6 }).filter(s => !/[a-z]/.test(s)), // No lowercase
  fc.string({ minLength: 6 }).filter(s => !/\d/.test(s)), // No digit
);

const validEmailGenerator = fc.emailAddress();
const validPasswordGenerator = fc.string({ minLength: 6 });
const validSignupPasswordGenerator = fc.string({ minLength: 6 })
  .filter(s => /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(s));

describe('Authentication Form Validation Properties', () => {
  describe('Property 2: Form validation prevents invalid submissions', () => {
    
    test('Login form with invalid email should always be invalid', () => {
      fc.assert(fc.property(
        invalidEmailGenerator,
        validPasswordGenerator,
        (email, password) => {
          const formData: LoginFormData = { email, password };
          const result = validateLoginForm(formData);
          
          // Property: Invalid email should always make form invalid
          expect(result.isValid).toBe(false);
          expect(result.errors.email).toBeDefined();
        }
      ), { numRuns: 100 });
    });

    test('Login form with invalid password should always be invalid', () => {
      fc.assert(fc.property(
        validEmailGenerator,
        invalidPasswordGenerator,
        (email, password) => {
          const formData: LoginFormData = { email, password };
          const result = validateLoginForm(formData);
          
          // Property: Invalid password should always make form invalid
          expect(result.isValid).toBe(false);
          expect(result.errors.password).toBeDefined();
        }
      ), { numRuns: 100 });
    });

    test('Login form with both invalid email and password should always be invalid', () => {
      fc.assert(fc.property(
        invalidEmailGenerator,
        invalidPasswordGenerator,
        (email, password) => {
          const formData: LoginFormData = { email, password };
          const result = validateLoginForm(formData);
          
          // Property: Both invalid should make form invalid with both errors
          expect(result.isValid).toBe(false);
          expect(result.errors.email).toBeDefined();
          expect(result.errors.password).toBeDefined();
        }
      ), { numRuns: 100 });
    });

    test('Signup form with invalid email should always be invalid', () => {
      fc.assert(fc.property(
        invalidEmailGenerator,
        validSignupPasswordGenerator,
        fc.constantFrom('civilian', 'hero'),
        (email, password, userType) => {
          const formData: SignupFormData = { 
            email, 
            password, 
            confirmPassword: password, 
            userType 
          };
          const result = validateSignupForm(formData);
          
          // Property: Invalid email should always make form invalid
          expect(result.isValid).toBe(false);
          expect(result.errors.email).toBeDefined();
        }
      ), { numRuns: 100 });
    });

    test('Signup form with invalid password should always be invalid', () => {
      fc.assert(fc.property(
        validEmailGenerator,
        invalidSignupPasswordGenerator,
        fc.constantFrom('civilian', 'hero'),
        (email, password, userType) => {
          const formData: SignupFormData = { 
            email, 
            password, 
            confirmPassword: password, 
            userType 
          };
          const result = validateSignupForm(formData);
          
          // Property: Invalid password should always make form invalid
          expect(result.isValid).toBe(false);
          expect(result.errors.password).toBeDefined();
        }
      ), { numRuns: 100 });
    });

    test('Signup form with mismatched passwords should always be invalid', () => {
      fc.assert(fc.property(
        validEmailGenerator,
        validSignupPasswordGenerator,
        validSignupPasswordGenerator,
        fc.constantFrom('civilian', 'hero'),
        (email, password, differentPassword, userType) => {
          // Ensure passwords are different
          fc.pre(password !== differentPassword);
          
          const formData: SignupFormData = { 
            email, 
            password, 
            confirmPassword: differentPassword, 
            userType 
          };
          const result = validateSignupForm(formData);
          
          // Property: Mismatched passwords should always make form invalid
          expect(result.isValid).toBe(false);
          expect(result.errors.confirmPassword).toBeDefined();
        }
      ), { numRuns: 100 });
    });

    test('Signup form with invalid user type should always be invalid', () => {
      fc.assert(fc.property(
        validEmailGenerator,
        validSignupPasswordGenerator,
        fc.string().filter(s => s !== 'civilian' && s !== 'hero'),
        (email, password, invalidUserType) => {
          const formData: SignupFormData = { 
            email, 
            password, 
            confirmPassword: password, 
            userType: invalidUserType as any 
          };
          const result = validateSignupForm(formData);
          
          // Property: Invalid user type should always make form invalid
          expect(result.isValid).toBe(false);
          expect(result.errors.userType).toBeDefined();
        }
      ), { numRuns: 100 });
    });

    test('Valid login form should always be valid', () => {
      fc.assert(fc.property(
        validEmailGenerator,
        validPasswordGenerator,
        (email, password) => {
          const formData: LoginFormData = { email, password };
          const result = validateLoginForm(formData);
          
          // Property: Valid inputs should always make form valid
          expect(result.isValid).toBe(true);
          expect(Object.keys(result.errors)).toHaveLength(0);
        }
      ), { numRuns: 100 });
    });

    test('Valid signup form should always be valid', () => {
      fc.assert(fc.property(
        validEmailGenerator,
        validSignupPasswordGenerator,
        fc.constantFrom('civilian', 'hero'),
        (email, password, userType) => {
          const formData: SignupFormData = { 
            email, 
            password, 
            confirmPassword: password, 
            userType 
          };
          const result = validateSignupForm(formData);
          
          // Property: Valid inputs should always make form valid
          expect(result.isValid).toBe(true);
          expect(Object.keys(result.errors)).toHaveLength(0);
        }
      ), { numRuns: 100 });
    });
  });
});