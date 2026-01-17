// Schema validation utilities

export const validateServiceRequest = (request: any) => {
  const errors: string[] = [];
  
  // Required field validation with type checking
  if (!request.civilian_id || typeof request.civilian_id !== 'string') {
    errors.push('civilian_id is required and must be a string');
  }
  if (!request.title || typeof request.title !== 'string' || request.title.trim().length < 3) {
    errors.push('title is required and must be at least 3 characters');
  }
  if (!request.description || typeof request.description !== 'string' || request.description.trim().length < 10) {
    errors.push('description is required and must be at least 10 characters');
  }
  
  // Category validation
  const validCategories = ['cleaning', 'repairs', 'delivery', 'tutoring', 'other'];
  if (!request.category || !validCategories.includes(request.category)) {
    errors.push('category must be one of: ' + validCategories.join(', '));
  }
  
  // Location validation
  if (!request.location || typeof request.location !== 'object') {
    errors.push('location is required and must be an object');
  } else {
    if (!request.location.address || typeof request.location.address !== 'string') {
      errors.push('location.address is required');
    }
    if (!request.location.town || typeof request.location.town !== 'string') {
      errors.push('location.town is required');
    }
    // Validate coordinates if provided
    if (request.location.latitude !== undefined && (typeof request.location.latitude !== 'number' || isNaN(request.location.latitude))) {
      errors.push('location.latitude must be a valid number');
    }
    if (request.location.longitude !== undefined && (typeof request.location.longitude !== 'number' || isNaN(request.location.longitude))) {
      errors.push('location.longitude must be a valid number');
    }
  }
  
  // Date validation
  if (!request.scheduled_date) {
    errors.push('scheduled_date is required');
  } else {
    const scheduledDate = new Date(request.scheduled_date);
    if (isNaN(scheduledDate.getTime())) {
      errors.push('scheduled_date must be a valid date');
    } else if (scheduledDate < new Date()) {
      errors.push('scheduled_date must be in the future');
    }
  }
  
  // Duration validation
  if (!request.estimated_duration || typeof request.estimated_duration !== 'number' || request.estimated_duration <= 0) {
    errors.push('estimated_duration is required and must be a positive number');
  }
  
  // Budget validation
  if (!request.budget_range || typeof request.budget_range !== 'object') {
    errors.push('budget_range is required and must be an object');
  } else {
    if (typeof request.budget_range.min !== 'number' || request.budget_range.min < 0) {
      errors.push('budget_range.min must be a non-negative number');
    }
    if (typeof request.budget_range.max !== 'number' || request.budget_range.max < 0) {
      errors.push('budget_range.max must be a non-negative number');
    }
    if (request.budget_range.min > request.budget_range.max) {
      errors.push('budget_range.min cannot be greater than budget_range.max');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const sanitizeServiceRequest = (request: any) => {
  return {
    civilian_id: request.civilian_id?.toString().trim(),
    title: request.title?.toString().trim().substring(0, 200), // Limit title length
    description: request.description?.toString().trim().substring(0, 2000), // Limit description length
    category: request.category,
    location: typeof request.location === 'object' ? {
      address: request.location.address?.toString().trim().substring(0, 200),
      town: request.location.town?.toString().trim().substring(0, 100),
      latitude: typeof request.location.latitude === 'number' ? request.location.latitude : 0,
      longitude: typeof request.location.longitude === 'number' ? request.location.longitude : 0,
    } : null,
    scheduled_date: request.scheduled_date,
    estimated_duration: Math.max(1, Math.min(24, Number(request.estimated_duration) || 1)), // Clamp between 1-24 hours
    budget_range: {
      min: Math.max(0, Number(request.budget_range?.min) || 0),
      max: Math.max(0, Number(request.budget_range?.max) || 0),
      currency: request.budget_range?.currency || 'USD'
    }
  };
};