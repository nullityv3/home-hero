/**
 * Edge Functions Service
 * Wrapper for calling Supabase Edge Functions
 */

import { supabase } from './supabase';

export interface JobData {
  title: string;
  description?: string;
  category?: string;
  location: {
    lat: number;
    lng: number;
    text?: string;
  };
  scheduled_date?: string;
  estimated_duration?: number;
  budget_range?: {
    min: number;
    max: number;
  };
}

export interface EdgeFunctionError {
  error: string | object;
}

export interface EdgeFunctionResponse<T> {
  data: T | null;
  error: EdgeFunctionError | null;
}

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
}

/**
 * Sanitize user input to prevent XSS attacks
 */
function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Log errors without exposing sensitive information
 */
function logError(error: Error, context: string, metadata?: Record<string, any>) {
  // In production, this would send to error tracking service (Sentry, etc.)
  if (__DEV__) {
    console.error(`[${context}]`, error.message, metadata);
  }
  // In production: send to monitoring service without sensitive data
}

/**
 * Retry helper with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, initialDelay = 1000, maxDelay = 10000 } = options;
  
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries - 1) {
        const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

/**
 * Create a new job (Civilian only)
 */
export async function createJob(jobData: JobData) {
  // Ensure user is authenticated
  await ensureAuthenticated();
  
  // Validate required fields
  if (!jobData.title?.trim()) {
    throw new Error('Job title is required');
  }
  
  if (!jobData.location?.lat || !jobData.location?.lng) {
    throw new Error('Valid location is required');
  }
  
  if (jobData.budget_range) {
    if (jobData.budget_range.min < 0 || jobData.budget_range.max < 0) {
      throw new Error('Budget cannot be negative');
    }
    if (jobData.budget_range.min > jobData.budget_range.max) {
      throw new Error('Minimum budget cannot exceed maximum');
    }
  }
  
  // Sanitize text inputs to prevent XSS
  const sanitizedData = {
    ...jobData,
    title: sanitizeInput(jobData.title),
    description: jobData.description ? sanitizeInput(jobData.description) : undefined,
  };
  
  return retryWithBackoff(async () => {
    const { data, error } = await supabase.functions.invoke('create-job', {
      body: sanitizedData
    });

    if (error) {
      logError(
        new Error('Failed to create job'),
        'EdgeFunctions.createJob',
        { action: 'create_job' }
      );
      throw new Error('Failed to create job. Please try again.');
    }
    
    if (!data?.job) {
      throw new Error('Invalid response from server');
    }

    return data.job;
  });
}

/**
 * List available jobs (Hero only)
 */
export async function listAvailableJobs() {
  await ensureAuthenticated();
  
  return retryWithBackoff(async () => {
    const { data, error } = await supabase.functions.invoke('list-jobs', {
      method: 'GET'
    });

    if (error) {
      logError(
        new Error('Failed to list jobs'),
        'EdgeFunctions.listAvailableJobs'
      );
      throw new Error('Failed to load available jobs. Please try again.');
    }
    
    if (!data?.jobs) {
      throw new Error('Invalid response from server');
    }

    return data.jobs;
  });
}

/**
 * Express interest in a job (Hero only)
 */
export async function expressInterest(jobId: string) {
  await ensureAuthenticated();
  
  if (!jobId?.trim()) {
    throw new Error('Job ID is required');
  }
  
  return retryWithBackoff(async () => {
    const { data, error } = await supabase.functions.invoke('express-interest', {
      body: { job_id: jobId }
    });

    if (error) {
      logError(
        new Error('Failed to express interest'),
        'EdgeFunctions.expressInterest',
        { job_id: jobId }
      );
      throw new Error('Failed to express interest. Please try again.');
    }
    
    if (!data?.interest) {
      throw new Error('Invalid response from server');
    }

    return data.interest;
  });
}

/**
 * Choose a hero for a job (Civilian only, job owner)
 */
export async function chooseHero(jobId: string, heroUserId: string) {
  await ensureAuthenticated();
  
  if (!jobId?.trim()) {
    throw new Error('Job ID is required');
  }
  
  if (!heroUserId?.trim()) {
    throw new Error('Hero ID is required');
  }
  
  return retryWithBackoff(async () => {
    const { data, error } = await supabase.functions.invoke('choose-hero', {
      body: {
        job_id: jobId,
        hero_user_id: heroUserId
      }
    });

    if (error) {
      logError(
        new Error('Failed to choose hero'),
        'EdgeFunctions.chooseHero',
        { job_id: jobId }
      );
      throw new Error('Failed to assign hero. Please try again.');
    }
    
    if (data?.success === undefined) {
      throw new Error('Invalid response from server');
    }

    return data.success;
  });
}

/**
 * Send a chat message
 */
export async function sendChatMessage(requestId: string, message: string) {
  await ensureAuthenticated();
  
  if (!requestId?.trim()) {
    throw new Error('Request ID is required');
  }
  
  if (!message?.trim()) {
    throw new Error('Message cannot be empty');
  }
  
  if (message.length > 1000) {
    throw new Error('Message is too long (max 1000 characters)');
  }
  
  // Sanitize message to prevent XSS
  const sanitizedMessage = sanitizeInput(message);
  
  return retryWithBackoff(async () => {
    const { data, error } = await supabase.functions.invoke('send-chat', {
      body: {
        request_id: requestId,
        message: sanitizedMessage
      }
    });

    if (error) {
      logError(
        new Error('Failed to send message'),
        'EdgeFunctions.sendChatMessage',
        { request_id: requestId }
      );
      throw new Error('Failed to send message. Please try again.');
    }
    
    if (!data?.message) {
      throw new Error('Invalid response from server');
    }

    return data.message;
  });
}

/**
 * Check if user is authenticated before calling edge functions
 */
export async function ensureAuthenticated() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('User must be logged in to perform this action');
  }
  
  return session;
}

// Export all functions as a single object for convenience
export const EdgeFunctions = {
  createJob,
  listAvailableJobs,
  expressInterest,
  chooseHero,
  sendChatMessage,
  ensureAuthenticated
};
