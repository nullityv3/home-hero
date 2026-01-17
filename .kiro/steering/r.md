---
inclusion: always
---
Always Modularize Functions

Structure code into reusable services:

services/
  heroes.js
  serviceRequests.js
  notifications.js
utils/
  validation.js
  formatting.js


Each function handles one task

No hard-coded logic in agent prompts

2. Explicit Inputs & Outputs

Every function must clearly define inputs and outputs.
Avoid passing untyped objects blindly.

/**
 * Create a new service request
 * @param {string} user_id
 * @param {string} category
 * @param {string} description
 * @param {string} location
 * @returns {Promise<{status: string, data: object}>}
 */
async function createServiceRequest({user_id, category, description, location}) { ... }

3. Error Handling

Never ignore errors from Supabase:

if (error) {
  console.error("Supabase insert error:", error.message);
  return { status: "error", message: error.message };
}

4. Always Validate Inputs

Required fields

Type checking

Enum validation

String trimming / sanitization

Example:

if (!['plumbing','painting','electrical'].includes(category)) {
  return { status: 'error', message: 'Invalid category' };
}

5. Avoid Kiro Hallucinations

Never let Kiro guess table names or columns

Provide exact schema in prompts

Include expected return type

6. Logging

Use a consistent logging format:

logger.info(`[ServiceRequest] Created request ${request.id} for hero ${hero.id}`);
logger.error(`[ServiceRequest] Failed to create: ${error.message}`);


Useful for debugging online workflows

7. Online-Specific Naming

Functions: sendOnlineRequest, notifyHeroOnline, handleRealtimeInsert

Tables: service_requests, online_queue