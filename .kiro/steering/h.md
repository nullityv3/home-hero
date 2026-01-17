---
inclusion: always
---
1. Structure Every Kiro Task with a Clear “Intent → Steps → Output” Format

Kiro works best when you explicitly define the workflow structure.

Good structure:
# Task: Create a new service request
# Intent:
The agent must take user input and create a new row in Supabase.

# Steps:
1. Validate required fields
2. Construct the payload
3. Insert into Supabase
4. Return the created row or typed feedback

# Output:
JSON response with status and created data.

Why?

Kiro uses this structure to reason cleanly

It reduces errors in generated code

Makes Supabase interactions predictable

2. Always Use Supabase Client with Typed Definitions

Use supabase.from('table').insert({...}) consistently and never write SQL inside Kiro unless necessary.

Example (clean Kiro-compatible code):
const { data, error } = await supabase
  .from('service_requests')
  .insert({
    user_id,
    title,
    description,
    category,
    location
  })
  .select()
  .single();

Best practices:

Always .select().single() for single-row operations

Always check error immediately

Keep queries short and readable

3. Never Let Kiro Guess Table Names or Column Names

Always provide:

Exact table name

Exact column names

Expected return object shape

Example prompt you should always use:
Use the table: service_requests
With columns: id, user_id, category, description, status, created_at
Return the full row after insert.


This prevents Kiro from hallucinating schema.

4. Always Validate Inputs Before Supabase Operations

Tell Kiro to always validate:

- required fields
- types (string/number)
- formats (phone numbers, emails)
- allowed enum values

Example:
if (!title || !description || !user_id) {
  return { error: "Missing required fields" };
}


This avoids:

broken rows

null inserts

corrupted data

5. Use Strict Error Handling with Clear Messages

Never allow Kiro to return raw Supabase errors without context.

Good pattern:
if (error) {
  console.error("Supabase error:", error.message);
  return {
    status: "error",
    message: "Failed to create service request",
    details: error.message
  };
}

6. Keep Integration Code Modular
Recommended structure:
services/
    serviceRequests.js
    users.js
    heroes.js
    offlineRequests.js
utils/
    validation.js
    formatting.js
    roleCheck.js


Kiro can then call:

await ServiceRequests.create({...})


This avoids:

duplicated queries

messy repeating logic

inconsistent formats

7. Use Kiro "memory notes" inside tasks

Kiro supports embedding persistent instructions.

Example:
# Agent Behavior Notes:
- Always return structured JSON
- Never modify schema names
- Validate all data before calling Supabase
- Use the shared logger for errors


This dramatically improves consistency.

8. For Online / Offline Logic Keep Branching Explicit
Bad (ambiguous):

"Kiro decide online/offline automatically."

Good (explicit):
If hero.is_online:
    send Firebase notification
Else:
    send SMS via offline queue table


Kiro agents must be given clean branching rules.

9. Always Use RLS-Friendly Queries

Since Supabase uses Row Level Security:

Safe pattern:
const { data, error } = await supabase
  .from('service_requests')
  .select('*')
  .eq('hero_id', hero_id);


Avoid:

queries without filters

selecting entire tables

admin-like behaviors

10. Document Every Supabase Function Clearly

Kiro relies heavily on description fields.

Example doc:
Function: createServiceRequest
Inputs:
- user_id: string
- category: enum
- description: string
- location: string

Logic:
1. Validate fields
2. Insert row into service_requests
3. Return inserted row

Returns:
- { status: "success", data: {...} }


This prevents mistakes and supports long-term stability.