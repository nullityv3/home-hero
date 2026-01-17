# HomeHeroes Backend Technical Specification

**Document Version:** 1.0  
**Date:** December 5, 2025  
**Prepared For:** Senior Backend Engineer  
**Purpose:** Complete technical breakdown for production-grade Supabase backend design

---

## 1. APP OVERVIEW

### Core Description
HomeHeroes is a two-sided marketplace mobile application connecting service providers ("Heroes") with customers ("Civilians") for on-demand home services. The platform facilitates service discovery, booking, real-time communication, payment processing, and performance tracking.

### Problem Solved
- Civilians struggle to find reliable, vetted service providers for home tasks
- Heroes need a platform to find consistent work and manage their service business
- Both parties need transparent pricing, secure payments, and accountability through ratings

### Target Users
1. **Civilians** - Homeowners/renters needing services (cleaning, repairs, delivery, tutoring, etc.)
2. **Heroes** - Service providers offering skills and availability for hire

### Key Workflows
1. **Civilian Journey**: Sign up → Browse heroes → Create service request → Select hero → Chat → Pay → Review
2. **Hero Journey**: Sign up → Set availability/skills → Browse requests → Accept job → Complete work → Receive payment → Build reputation

### Value Proposition
- **For Civilians**: Vetted providers, transparent pricing, secure payments, accountability
- **For Heroes**: Steady income, flexible scheduling, reputation building, direct client relationships

---

## 2. USER ROLES & PERMISSIONS

### Role: Civilian
**Capabilities:**
- Create, view, edit, cancel own service requests
- Browse and filter available heroes
- View hero profiles (public information)
- Chat with assigned heroes
- Make payments for completed services
- Rate and review heroes
- Manage personal profile and payment methods
- View request history

**Screens Accessible:**
- Home/Dashboard
- Heroes Browse & Search
- Hero Details (read-only)
- Create Request Form
- My Requests (Active & History)
- Request Detail Modal
- Chat Conversations
- Profile Settings
- Payment Methods

**Restrictions:**
- Cannot view other civilians' requests
- Cannot access hero-specific features (earnings, availability management)
- Cannot modify hero profiles
- Can only chat with heroes assigned to their requests

### Role: Hero
**Capabilities:**
- View available service requests (pending)
- Accept/reject service requests
- Mark jobs as complete
- Chat with assigned civilians
- Manage availability schedule
- Update skills and hourly rate
- View earnings and analytics
- Manage professional profile

**Screens Accessible:**
- Dashboard (stats overview)
- Available Requests
- My Jobs (Assigned & Active)
- Request Details
- Chat Conversations
- Earnings & Analytics
- Profile Settings (Hero-specific)

**Restrictions:**
- Cannot create service requests
- Cannot view other heroes' profiles or earnings
- Cannot access civilian-specific features
- Can only chat with civilians for assigned requests
- Cannot modify completed request details

---

## 3. AUTHENTICATION REQUIREMENTS

### Login/Signup Flow

**Method:** Email/Password (primary)
**Social Login:** Not currently implemented (future consideration)
**Magic Link:** Not currently implemented

**Signup Process:**
1. User provides email, password, and selects user_type (civilian/hero)
2. Password validation requirements:
   - Minimum 12 characters
   - Must contain uppercase, lowercase, number, and special character
   - Cannot be common weak password
3. User record created in `auth.users` table
4. User metadata includes `user_type` field
5. Corresponding profile record auto-created via database trigger
6. Session token generated and returned
7. User redirected to appropriate dashboard based on role

**Login Process:**
1. User provides email and password
2. Rate limiting: Max 5 attempts per 15 minutes per email
3. Credentials validated against Supabase Auth
4. Session token generated
5. User profile loaded based on user_type
6. Redirect to role-specific home screen

**Role Selection Logic:**
- Selected during signup (cannot be changed post-registration)
- Stored in `auth.users.user_metadata.user_type`
- Determines which profile table is populated (civilian_profiles vs hero_profiles)

**Onboarding Flows:**

*Civilian Onboarding:*
1. Email verification (optional but recommended)
2. Complete profile: full_name, phone, address
3. Add payment method (can be skipped initially)
4. Browse heroes or create first request

*Hero Onboarding:*
1. Email verification (required for payment eligibility)
2. Complete profile: full_name, phone, skills, hourly_rate
3. Set availability schedule
4. Add payout method (required before accepting jobs)
5. Browse available requests

**Required User Fields:**

*All Users:*
- email (unique, validated)
- password (hashed, strong requirements)
- user_type (civilian | hero)
- created_at, updated_at

*Civilian Profile:*
- full_name (required)
- phone (optional, recommended)
- address (optional)
- emergency_contact (optional)
- notification_preferences (JSON)

*Hero Profile:*
- full_name (required)
- phone (required for job acceptance)
- skills (array, required, min 1)
- hourly_rate (required, min $10)
- bio (optional)
- availability (JSON schedule)
- rating (calculated, default 0)
- completed_jobs (calculated, default 0)

**Profile Completion:**
- Not mandatory for account creation
- Certain actions require complete profile:
  - Civilians: Must have full_name to create requests
  - Heroes: Must have full_name, skills, hourly_rate, phone to accept jobs

**Phone Verification:**
- Not currently required
- Recommended for heroes (trust signal)
- Future: SMS verification for high-value transactions

---

## 4. SCREEN-BY-SCREEN BREAKDOWN

### CIVILIAN SCREENS

#### Screen: Civilian Home/Dashboard
**Purpose:** Landing page after login, quick access to main actions
**Inputs:** None (displays user-specific data)
**Outputs:** Navigation to other screens
**User Actions:**
- Create new service request
- View active requests
- Browse heroes
**Data from Backend:**
- User profile summary
- Count of active requests
- Recent activity
**Data to Backend:** None
**Validation:** User must be authenticated
**Navigation:** 
- → Create Request screen
- → My Requests screen
- → Heroes Browse screen

#### Screen: Heroes Browse & Search
**Purpose:** Discover and filter available service providers
**Inputs:**
- Search query (text)
- Filters: min_rating, max_price, skills, sort_by
**Outputs:** List of hero profiles
**User Actions:**
- Search by name/skill
- Apply filters (rating, price, skills)
- Sort (default, rating, price)
- Select hero to view details
**Data from Backend:**
- GET /hero_profiles with filters
- Fields: id, full_name, rating, completed_jobs, hourly_rate, skills, profile_image_url, availability
**Data to Backend:**
- Query parameters for filtering/sorting
**Validation:**
- Search query max 100 characters
- Rating filter 0-5
- Price filter positive numbers
**Navigation:** → Hero Details screen

#### Screen: Hero Details
**Purpose:** View detailed hero profile before selection
**Inputs:** heroId (from navigation params)
**Outputs:** Complete hero profile
**User Actions:**
- View profile details
- Start chat (if request assigned)
- Assign to request (if requestId provided)
**Data from Backend:**
- GET /hero_profiles/:id
- GET /reviews (future feature)
**Data to Backend:**
- PUT /service_requests/:requestId (assign hero)
**Validation:**
- Hero must exist
- If assigning: request must be in 'pending' status
**Navigation:**
- → Chat screen
- ← Back to Heroes Browse


#### Screen: Create Service Request
**Purpose:** Multi-step form to create new service request
**Inputs:**
- Step 1: category (cleaning|repairs|delivery|tutoring|other)
- Step 2: title, description, estimated_duration
- Step 3: location (address, city, state, zipCode), scheduled_date, budget_range (min, max)
**Outputs:** Created service request
**User Actions:**
- Navigate between steps
- Fill form fields
- Submit request
**Data from Backend:** None (form only)
**Data to Backend:**
- POST /service_requests
- Payload: All form fields + civilian_id, status='pending'
**Validation:**
- Title: required, max 100 chars
- Description: required, max 1000 chars
- Category: required, enum
- Duration: required, 1-5+ hours
- Location: all fields required, zipCode format validation
- Scheduled date: required, must be future date
- Budget: min > 0, max >= min
**Navigation:** → My Requests (on success)

#### Screen: My Requests (Active & History)
**Purpose:** View and manage all service requests
**Inputs:** Tab selection (active | history)
**Outputs:** Filtered list of requests
**User Actions:**
- Switch tabs
- Sort by date/status
- Select request for details
- Refresh list
**Data from Backend:**
- GET /service_requests?civilian_id={userId}&status=in(pending,assigned,active) (active tab)
- GET /service_requests?civilian_id={userId}&status=in(completed,cancelled) (history tab)
**Data to Backend:** None (read-only)
**Validation:** User must own requests
**Navigation:** → Request Detail Modal

#### Screen: Request Detail Modal
**Purpose:** View full request details and take actions
**Inputs:** requestId
**Outputs:** Complete request information
**User Actions:**
- View all request details
- Cancel request (if pending/assigned/active)
- Contact hero (if assigned)
**Data from Backend:**
- GET /service_requests/:id
**Data to Backend:**
- PUT /service_requests/:id (cancel: status='cancelled')
**Validation:**
- Can only cancel own requests
- Cannot cancel completed requests
**Navigation:** → Chat (if hero assigned)

#### Screen: Chat Conversations
**Purpose:** Real-time messaging with assigned heroes
**Inputs:** requestId (determines conversation)
**Outputs:** Message history and send capability
**User Actions:**
- View message history
- Send text messages
- See delivery status
**Data from Backend:**
- GET /chat_messages?request_id={requestId}
- Real-time subscription to new messages
**Data to Backend:**
- POST /chat_messages
- Payload: request_id, sender_id, message (content)
**Validation:**
- Message max 1000 characters
- XSS sanitization
- Can only chat for own requests with assigned hero
**Navigation:** None (modal/screen)

#### Screen: Civilian Profile Settings
**Purpose:** Manage personal information and preferences
**Inputs:** Profile fields, notification preferences
**Outputs:** Updated profile
**User Actions:**
- Edit personal info
- Toggle notification preferences
- Add/manage payment methods
- Sign out
**Data from Backend:**
- GET /civilian_profiles?user_id={userId}
**Data to Backend:**
- PUT /civilian_profiles/:id
- Payload: full_name, phone, address, notification_preferences
**Validation:**
- Full name required
- Phone format validation
- Notification preferences boolean flags
**Navigation:** None (settings screen)

---

### HERO SCREENS

#### Screen: Hero Dashboard
**Purpose:** Overview of hero's business metrics and active jobs
**Inputs:** None
**Outputs:** Statistics and request lists
**User Actions:**
- View stats (pending, active, completed, earnings)
- Select request for details
- Refresh data
**Data from Backend:**
- GET /service_requests?hero_id={userId}
- Aggregated stats calculated from requests
**Data to Backend:** None (read-only)
**Validation:** User must be hero role
**Navigation:** → Request Details

#### Screen: Available Requests (Hero)
**Purpose:** Browse and accept pending service requests
**Inputs:** None (shows all pending requests)
**Outputs:** List of available jobs
**User Actions:**
- View request details
- Accept request
- Reject/skip request
**Data from Backend:**
- GET /service_requests?status=pending
- Optional filters by skills, location, budget
**Data to Backend:**
- PUT /service_requests/:id (accept: hero_id={userId}, status='assigned')
**Validation:**
- Hero can only accept one job at a time (business rule)
- Request must be in 'pending' status
**Navigation:** → Request Detail Modal

#### Screen: My Jobs (Hero)
**Purpose:** Manage assigned and active jobs
**Inputs:** Tab selection (assigned | active)
**Outputs:** Filtered job list
**User Actions:**
- View job details
- Mark as complete
- Contact civilian
**Data from Backend:**
- GET /service_requests?hero_id={userId}&status=assigned
- GET /service_requests?hero_id={userId}&status=active
**Data to Backend:**
- PUT /service_requests/:id (complete: status='completed')
**Validation:**
- Can only complete own assigned jobs
- Completion triggers payment processing
**Navigation:** → Chat, → Request Details


#### Screen: Earnings & Analytics
**Purpose:** Track income and performance metrics
**Inputs:** Date range filter, timeframe (daily/weekly/monthly)
**Outputs:** Earnings data and charts
**User Actions:**
- Select date range
- Switch timeframe view
- View detailed breakdown
**Data from Backend:**
- GET /service_requests?hero_id={userId}&status=completed&updated_at=gte.{startDate}&updated_at=lte.{endDate}
- Calculate earnings from budget_range
**Data to Backend:** None (read-only)
**Validation:** User must be hero
**Navigation:** None (analytics screen)

#### Screen: Hero Profile Settings
**Purpose:** Manage professional profile and availability
**Inputs:** Profile fields, skills, availability schedule
**Outputs:** Updated hero profile
**User Actions:**
- Edit personal/professional info
- Add/remove skills
- Set hourly rate
- Configure weekly availability
- Sign out
**Data from Backend:**
- GET /hero_profiles?user_id={userId}
**Data to Backend:**
- PUT /hero_profiles/:id
- Payload: full_name, phone, skills[], hourly_rate, availability (JSON)
**Validation:**
- Full name, phone required
- Hourly rate min $10, max $500
- Skills array min 1 item
- Availability JSON schema validation
**Navigation:** None (settings screen)

---

## 5. CORE FEATURES (DEEP DETAIL)

### Feature: Service Request Creation

**User Flow:**
1. Civilian clicks "Create Request"
2. Step 1: Select service category
3. Step 2: Enter title, description, duration
4. Step 3: Set location, date/time, budget
5. Step 4: Review all details
6. Submit → Request created with status='pending'

**Data Inputs:**
- civilian_id (from auth session)
- title (string, max 100)
- description (string, max 1000)
- category (enum)
- location (object: address, city, state, zipCode, lat, lng)
- scheduled_date (ISO timestamp)
- estimated_duration (integer, hours)
- budget_range (object: min, max, currency='USD')

**Data Outputs:**
- Created service_request record with generated ID
- Timestamp fields auto-populated

**API Operations:**
- POST /service_requests
- Rate limit: 5 requests per minute per user

**Real-time Requirements:**
- None for creation
- After creation: notify available heroes (future feature)

**Edge Cases:**
- Duplicate submission: Prevent with client-side debouncing + server-side idempotency
- Invalid location: Geocoding validation
- Past date: Reject with error
- Budget min > max: Validation error
- Network failure: Queue for offline sync

**Security Considerations:**
- Validate civilian_id matches authenticated user
- Sanitize all text inputs (XSS prevention)
- Rate limiting per user
- Input validation on all fields

**Failure States:**
- Validation error: Return 400 with specific field errors
- Rate limit exceeded: Return 429 with retry-after
- Server error: Return 500, log for monitoring

**Success States:**
- 201 Created with full request object
- Client navigates to "My Requests"
- Request appears in pending list

---

### Feature: Hero Discovery & Selection

**User Flow:**
1. Civilian navigates to "Find Heroes"
2. Browse list of available heroes
3. Apply filters (rating, price, skills)
4. Search by name or skill
5. Select hero to view profile
6. Assign hero to existing request OR save for later

**Data Inputs:**
- Search query (optional)
- Filters: min_rating, max_price, skills[]
- Sort: rating | price | default

**Data Outputs:**
- Paginated list of hero profiles
- Each hero: id, full_name, rating, completed_jobs, hourly_rate, skills, profile_image_url

**API Operations:**
- GET /hero_profiles?rating=gte.{minRating}&hourly_rate=lte.{maxPrice}&skills=cs.{skills}
- Pagination: limit=20, offset=0

**Real-time Requirements:**
- None (static data, refresh on pull-to-refresh)

**Edge Cases:**
- No heroes match filters: Show empty state with "clear filters" option
- Hero becomes unavailable: Show availability status
- Slow network: Show skeleton loaders

**Security Considerations:**
- Public data (hero profiles are discoverable)
- No sensitive information exposed
- Rate limiting on search queries

**Failure States:**
- Network error: Show cached data if available
- No results: Empty state with suggestions

**Success States:**
- Display filtered hero list
- Smooth navigation to hero details

---

### Feature: Job Acceptance (Hero)

**User Flow:**
1. Hero views available requests
2. Selects request to see details
3. Reviews: title, description, location, budget, schedule
4. Clicks "Accept Request"
5. Confirmation dialog
6. Request status changes to 'assigned'
7. Civilian notified
8. Request moves to hero's "My Jobs"

**Data Inputs:**
- request_id
- hero_id (from auth session)

**Data Outputs:**
- Updated service_request: hero_id set, status='assigned'

**API Operations:**
- PUT /service_requests/:id
- Payload: { hero_id, status: 'assigned', updated_at }

**Real-time Requirements:**
- Real-time update to civilian's request list
- Push notification to civilian

**Edge Cases:**
- Request already assigned: Return 409 Conflict
- Hero already has active job: Enforce business rule (one job at a time)
- Request cancelled: Return 410 Gone

**Security Considerations:**
- Verify hero_id matches authenticated user
- Verify request is in 'pending' status
- Atomic update to prevent race conditions

**Failure States:**
- Already assigned: "This request has been taken by another hero"
- Validation error: Show specific error message

**Success States:**
- Request assigned successfully
- Hero sees request in "My Jobs"
- Civilian sees hero assigned to request


---

### Feature: Real-time Chat System

**User Flow:**
1. Civilian/Hero navigates to chat from assigned request
2. View message history
3. Type and send message
4. See delivery status (sent → delivered)
5. Receive real-time messages from other party

**Data Inputs:**
- request_id (determines conversation)
- sender_id (from auth session)
- message content (string, max 1000 chars)

**Data Outputs:**
- chat_message record with timestamp
- Real-time broadcast to other participant

**API Operations:**
- GET /chat_messages?request_id=eq.{requestId}&order=created_at.asc
- POST /chat_messages
- Real-time subscription: Supabase Realtime on chat_messages table

**Real-time Requirements:**
- WebSocket connection for instant message delivery
- Typing indicators (future)
- Read receipts (future)

**Edge Cases:**
- Offline message: Queue locally, sync when online
- Message too long: Truncate or reject with error
- Deleted request: Disable chat, show read-only history

**Security Considerations:**
- Verify sender_id matches authenticated user
- Verify user is participant in request (civilian or assigned hero)
- XSS sanitization on message content
- Rate limiting: 10 messages per minute

**Failure States:**
- Network error: Show "Message failed to send" with retry option
- Unauthorized: "You cannot send messages in this conversation"

**Success States:**
- Message appears immediately in sender's view
- Message delivered to recipient in real-time
- Delivery status updated

---

### Feature: Job Completion & Payment

**User Flow:**
1. Hero completes work
2. Clicks "Mark as Complete"
3. Confirmation dialog
4. Request status → 'completed'
5. Payment processing initiated
6. Hero earnings updated
7. Civilian notified
8. Request moves to history

**Data Inputs:**
- request_id
- hero_id (verification)

**Data Outputs:**
- Updated service_request: status='completed', updated_at
- Payment transaction record (future)
- Updated hero earnings

**API Operations:**
- PUT /service_requests/:id { status: 'completed' }
- POST /payment_transactions (future)
- Trigger: Update hero_profiles.completed_jobs, calculate earnings

**Real-time Requirements:**
- Real-time notification to civilian
- Update both users' request lists

**Edge Cases:**
- Civilian disputes completion: Dispute resolution flow (future)
- Payment failure: Retry logic, notify both parties
- Already completed: Idempotent operation

**Security Considerations:**
- Verify hero_id matches assigned hero
- Verify request is in 'active' or 'assigned' status
- Atomic transaction for payment processing

**Failure States:**
- Payment processing error: Keep status as 'active', retry payment
- Unauthorized: "Only the assigned hero can complete this job"

**Success States:**
- Request marked complete
- Payment processed
- Earnings credited to hero
- Both parties notified

---

### Feature: Request Cancellation

**User Flow:**
1. Civilian views request details
2. Clicks "Cancel Request"
3. Confirmation dialog with warning
4. Request status → 'cancelled'
5. If hero assigned: Hero notified, request removed from their jobs
6. Request moves to history

**Data Inputs:**
- request_id
- civilian_id (verification)

**Data Outputs:**
- Updated service_request: status='cancelled'

**API Operations:**
- PUT /service_requests/:id { status: 'cancelled' }

**Real-time Requirements:**
- Real-time update to hero's job list (if assigned)
- Push notification to hero

**Edge Cases:**
- Already completed: Cannot cancel
- Cancellation after hero started work: Cancellation fee (future)
- Multiple cancellations: Track cancellation rate

**Security Considerations:**
- Verify civilian_id matches request owner
- Cannot cancel completed requests
- Log cancellation for analytics

**Failure States:**
- Cannot cancel completed: "This request has already been completed"
- Unauthorized: "You can only cancel your own requests"

**Success States:**
- Request cancelled
- Hero notified (if assigned)
- Request in history with 'cancelled' status

---

### Feature: Ratings & Reviews (Future)

**User Flow:**
1. After job completion, civilian prompted to rate
2. Select star rating (1-5)
3. Write optional review text
4. Submit review
5. Hero's rating updated (weighted average)
6. Review appears on hero profile

**Data Inputs:**
- request_id
- hero_id
- civilian_id
- rating (1-5)
- review_text (optional, max 500 chars)

**Data Outputs:**
- review record
- Updated hero_profiles.rating

**API Operations:**
- POST /reviews
- Trigger: Recalculate hero average rating

**Real-time Requirements:**
- None (reviews are not real-time critical)

**Edge Cases:**
- Multiple reviews for same request: Prevent duplicates
- Editing review: Allow within 7 days
- Inappropriate content: Moderation queue

**Security Considerations:**
- Verify civilian completed request with hero
- One review per request
- Content moderation for offensive language

**Failure States:**
- Already reviewed: "You have already reviewed this service"
- Invalid rating: "Rating must be between 1 and 5"

**Success States:**
- Review submitted
- Hero rating updated
- Review visible on hero profile

---

## 6. DATA REQUIREMENTS

### Table: users (Supabase Auth)
| Field | Type | Example | Required | Validation | Indexed | Links |
|-------|------|---------|----------|------------|---------|-------|
| id | uuid | a1b2c3... | Yes | Auto-generated | Primary Key | - |
| email | string | user@example.com | Yes | Email format, unique | Yes | - |
| encrypted_password | string | [hashed] | Yes | Bcrypt hash | No | - |
| email_confirmed_at | timestamp | 2025-12-05T10:00:00Z | No | ISO timestamp | No | - |
| created_at | timestamp | 2025-12-05T10:00:00Z | Yes | Auto | Yes | - |
| updated_at | timestamp | 2025-12-05T10:00:00Z | Yes | Auto | Yes | - |
| user_metadata | jsonb | {"user_type":"civilian"} | No | JSON | No | - |

**RLS Policy:** Users can only read/update their own record


---

### Table: civilian_profiles
| Field | Type | Example | Required | Validation | Indexed | Links |
|-------|------|---------|----------|------------|---------|-------|
| id | uuid | b2c3d4... | Yes | Auto-generated | Primary Key | - |
| user_id | uuid | a1b2c3... | Yes | FK to users.id | Yes | users.id |
| full_name | string | John Doe | Yes | 2-100 chars | Yes | - |
| phone | string | +1-555-0123 | No | E.164 format | No | - |
| address | string | 123 Main St | No | Max 200 chars | No | - |
| emergency_contact | string | Jane Doe: +1-555-0124 | No | Max 200 chars | No | - |
| notification_preferences | jsonb | {"push_notifications":true} | No | JSON schema | No | - |
| created_at | timestamp | 2025-12-05T10:00:00Z | Yes | Auto | Yes | - |
| updated_at | timestamp | 2025-12-05T10:00:00Z | Yes | Auto | Yes | - |

**RLS Policy:** Users can only read/update their own profile

---

### Table: hero_profiles
| Field | Type | Example | Required | Validation | Indexed | Links |
|-------|------|---------|----------|------------|---------|-------|
| id | uuid | c3d4e5... | Yes | Auto-generated | Primary Key | - |
| user_id | uuid | a1b2c3... | Yes | FK to users.id | Yes | users.id |
| full_name | string | Jane Smith | Yes | 2-100 chars | Yes | - |
| phone | string | +1-555-0125 | Yes | E.164 format | No | - |
| skills | text[] | {Plumbing,Electrical} | Yes | Min 1 item | Yes (GIN) | - |
| hourly_rate | decimal | 25.00 | Yes | Min 10, Max 500 | Yes | - |
| rating | decimal | 4.8 | No | 0-5, calculated | Yes | - |
| completed_jobs | integer | 127 | No | Min 0, calculated | Yes | - |
| bio | text | Experienced handyman... | No | Max 1000 chars | No | - |
| availability | jsonb | {"monday":{"available":true}} | No | JSON schema | No | - |
| profile_image_url | string | https://... | No | URL format | No | - |
| created_at | timestamp | 2025-12-05T10:00:00Z | Yes | Auto | Yes | - |
| updated_at | timestamp | 2025-12-05T10:00:00Z | Yes | Auto | Yes | - |

**RLS Policy:** 
- All users can read hero profiles (public)
- Heroes can only update their own profile

---

### Table: service_requests
| Field | Type | Example | Required | Validation | Indexed | Links |
|-------|------|---------|----------|------------|---------|-------|
| id | uuid | d4e5f6... | Yes | Auto-generated | Primary Key | - |
| civilian_id | uuid | a1b2c3... | Yes | FK to users.id | Yes | users.id |
| hero_id | uuid | a1b2c3... | No | FK to users.id | Yes | users.id |
| title | string | House cleaning needed | Yes | 5-100 chars | Yes | - |
| description | text | Need deep cleaning... | Yes | 10-1000 chars | No | - |
| category | enum | cleaning | Yes | See enum below | Yes | - |
| location | jsonb | {"address":"123 Main St"} | Yes | JSON schema | No | - |
| scheduled_date | timestamp | 2025-12-10T14:00:00Z | Yes | Future date | Yes | - |
| estimated_duration | integer | 3 | Yes | 1-10 hours | No | - |
| budget_range | jsonb | {"min":50,"max":100} | Yes | JSON schema | No | - |
| status | enum | pending | Yes | See enum below | Yes | - |
| created_at | timestamp | 2025-12-05T10:00:00Z | Yes | Auto | Yes | - |
| updated_at | timestamp | 2025-12-05T10:00:00Z | Yes | Auto | Yes | - |

**Enums:**
- category: 'cleaning' | 'repairs' | 'delivery' | 'tutoring' | 'other'
- status: 'pending' | 'assigned' | 'active' | 'completed' | 'cancelled'

**RLS Policy:**
- Civilians can read/update their own requests
- Heroes can read all pending requests
- Heroes can read/update requests assigned to them

---

### Table: chat_messages
| Field | Type | Example | Required | Validation | Indexed | Links |
|-------|------|---------|----------|------------|---------|-------|
| id | uuid | e5f6g7... | Yes | Auto-generated | Primary Key | - |
| request_id | uuid | d4e5f6... | Yes | FK to service_requests.id | Yes | service_requests.id |
| sender_id | uuid | a1b2c3... | Yes | FK to users.id | Yes | users.id |
| message | text | Hello, when can you start? | Yes | 1-1000 chars | No | - |
| delivered | boolean | true | No | Default false | No | - |
| read_at | timestamp | 2025-12-05T10:05:00Z | No | ISO timestamp | No | - |
| created_at | timestamp | 2025-12-05T10:00:00Z | Yes | Auto | Yes | - |

**RLS Policy:**
- Users can only read messages for requests they're involved in
- Users can only create messages as themselves

---

### Table: reviews (Future)
| Field | Type | Example | Required | Validation | Indexed | Links |
|-------|------|---------|----------|------------|---------|-------|
| id | uuid | f6g7h8... | Yes | Auto-generated | Primary Key | - |
| request_id | uuid | d4e5f6... | Yes | FK to service_requests.id | Yes | service_requests.id |
| hero_id | uuid | a1b2c3... | Yes | FK to users.id | Yes | users.id |
| civilian_id | uuid | a1b2c3... | Yes | FK to users.id | Yes | users.id |
| rating | integer | 5 | Yes | 1-5 | Yes | - |
| review_text | text | Excellent service! | No | Max 500 chars | No | - |
| created_at | timestamp | 2025-12-05T10:00:00Z | Yes | Auto | Yes | - |
| updated_at | timestamp | 2025-12-05T10:00:00Z | Yes | Auto | No | - |

**RLS Policy:**
- All users can read reviews
- Civilians can create reviews for their completed requests
- Civilians can update their own reviews within 7 days

---

### Table: payment_transactions (Future)
| Field | Type | Example | Required | Validation | Indexed | Links |
|-------|------|---------|----------|------------|---------|-------|
| id | uuid | g7h8i9... | Yes | Auto-generated | Primary Key | - |
| request_id | uuid | d4e5f6... | Yes | FK to service_requests.id | Yes | service_requests.id |
| civilian_id | uuid | a1b2c3... | Yes | FK to users.id | Yes | users.id |
| hero_id | uuid | a1b2c3... | Yes | FK to users.id | Yes | users.id |
| amount | decimal | 75.00 | Yes | Min 0 | No | - |
| currency | string | USD | Yes | ISO 4217 | No | - |
| status | enum | completed | Yes | See enum below | Yes | - |
| payment_method_id | string | pm_1234... | Yes | Stripe ID | No | - |
| stripe_payment_intent_id | string | pi_1234... | No | Stripe ID | Yes | - |
| platform_fee | decimal | 7.50 | Yes | Calculated | No | - |
| hero_payout | decimal | 67.50 | Yes | Calculated | No | - |
| created_at | timestamp | 2025-12-05T10:00:00Z | Yes | Auto | Yes | - |
| updated_at | timestamp | 2025-12-05T10:00:00Z | Yes | Auto | Yes | - |

**Enums:**
- status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'

**RLS Policy:**
- Users can only read their own transactions

---

### Table: notifications (Future)
| Field | Type | Example | Required | Validation | Indexed | Links |
|-------|------|---------|----------|------------|---------|-------|
| id | uuid | h8i9j0... | Yes | Auto-generated | Primary Key | - |
| user_id | uuid | a1b2c3... | Yes | FK to users.id | Yes | users.id |
| type | enum | request_assigned | Yes | See enum below | Yes | - |
| title | string | New Job Assigned | Yes | Max 100 chars | No | - |
| message | text | You have been assigned... | Yes | Max 500 chars | No | - |
| data | jsonb | {"request_id":"d4e5f6..."} | No | JSON | No | - |
| read | boolean | false | No | Default false | Yes | - |
| created_at | timestamp | 2025-12-05T10:00:00Z | Yes | Auto | Yes | - |

**Enums:**
- type: 'request_assigned' | 'request_completed' | 'request_cancelled' | 'new_message' | 'payment_received' | 'review_received'

**RLS Policy:**
- Users can only read/update their own notifications

---

## 7. BUSINESS RULES

### Request Management Rules
1. **One Active Job Per Hero**: A hero can only have one 'active' or 'assigned' request at a time
2. **Request Expiration**: Pending requests expire after 7 days if not assigned
3. **Cancellation Window**: Civilians can cancel requests anytime before completion
4. **Late Cancellation Fee**: If cancelled within 2 hours of scheduled_date, 20% fee applies (future)
5. **Auto-completion**: Requests auto-complete 24 hours after scheduled_date if not manually completed (future)

### Hero Eligibility Rules
1. **Minimum Rating**: Heroes below 3.0 rating receive warning, below 2.5 suspended (future)
2. **Profile Completeness**: Must have full_name, phone, skills (min 1), hourly_rate to accept jobs
3. **Verification**: Phone verification required before first payout (future)
4. **Background Check**: Required after 10 completed jobs (future)

### Payment Rules
1. **Platform Fee**: 10% of transaction amount
2. **Minimum Transaction**: $10
3. **Maximum Transaction**: $1000 per request
4. **Payout Schedule**: Weekly on Fridays for completed jobs
5. **Refund Policy**: Full refund if cancelled before hero accepts, partial if cancelled after


### Rating & Review Rules
1. **Review Eligibility**: Only civilians who completed a request can review
2. **One Review Per Request**: Cannot submit multiple reviews for same request
3. **Edit Window**: Reviews can be edited within 7 days of submission
4. **Rating Calculation**: Weighted average of all reviews (recent reviews weighted higher)
5. **Minimum Reviews**: Heroes need 5 reviews before rating is publicly displayed

### Availability Rules
1. **Schedule Format**: Weekly schedule with start/end times per day
2. **Advance Booking**: Requests must be scheduled at least 2 hours in advance
3. **Maximum Advance**: Can book up to 30 days in advance
4. **Availability Override**: Heroes can mark specific dates as unavailable (future)

### Communication Rules
1. **Chat Activation**: Chat only available after hero is assigned to request
2. **Message Retention**: Messages retained for 90 days after request completion
3. **Inappropriate Content**: Automated flagging + manual review for violations
4. **Response Time**: Heroes expected to respond within 2 hours during business hours (future metric)

---

## 8. NOTIFICATIONS

### Notification Types & Triggers

#### For Civilians:

| Type | Trigger | Recipient | Message | Real-time | Scheduled |
|------|---------|-----------|---------|-----------|-----------|
| request_created | Request submitted | Civilian | "Your request has been created" | No | Immediate |
| hero_assigned | Hero accepts request | Civilian | "{Hero} has been assigned to your request" | Yes | Immediate |
| request_completed | Hero marks complete | Civilian | "Your service has been completed" | Yes | Immediate |
| new_message | Hero sends message | Civilian | "New message from {Hero}" | Yes | Immediate |
| payment_processed | Payment successful | Civilian | "Payment of ${amount} processed" | No | Immediate |
| request_reminder | 2 hours before scheduled_date | Civilian | "Your service starts in 2 hours" | No | Scheduled |

#### For Heroes:

| Type | Trigger | Recipient | Message | Real-time | Scheduled |
|------|---------|-----------|---------|-----------|-----------|
| new_request_available | Request created matching skills | Hero | "New {category} request available" | Yes | Immediate |
| request_cancelled | Civilian cancels assigned request | Hero | "Request has been cancelled" | Yes | Immediate |
| new_message | Civilian sends message | Hero | "New message from {Civilian}" | Yes | Immediate |
| payment_received | Payout processed | Hero | "Payment of ${amount} received" | No | Immediate |
| job_reminder | 2 hours before scheduled_date | Hero | "Your job starts in 2 hours" | No | Scheduled |
| review_received | Civilian submits review | Hero | "You received a {rating}-star review" | No | Immediate |

### Notification Channels:
- **Push Notifications**: Mobile app (via Expo Notifications)
- **Email**: For important updates (configurable)
- **SMS**: For critical alerts (future, opt-in)
- **In-App**: Notification center within app

### Notification Preferences:
Users can configure per notification type:
- push_notifications (boolean)
- email_notifications (boolean)
- sms_notifications (boolean)
- request_updates (boolean)
- chat_messages (boolean)
- marketing (boolean)

---

## 9. PAYMENTS

### Payment Flow

**Assumption:** Using Stripe as payment provider

#### Civilian Payment Flow:
1. Civilian adds payment method (credit card) to profile
2. Payment method stored as Stripe Customer + PaymentMethod
3. When request is completed:
   - Calculate amount: (budget_range.min + budget_range.max) / 2
   - Create Stripe PaymentIntent
   - Charge civilian's payment method
   - Platform fee (10%) deducted
   - Remaining amount (90%) held for hero payout
4. Payment status tracked in payment_transactions table

#### Hero Payout Flow:
1. Hero adds payout method (bank account or debit card)
2. Payout method stored as Stripe Connect Account
3. Weekly payout schedule (every Friday):
   - Aggregate all completed jobs from past week
   - Calculate total earnings (90% of transaction amounts)
   - Initiate Stripe Transfer to hero's account
   - Update payment_transactions with payout status

### Payment States:
- **pending**: Payment intent created, not yet charged
- **processing**: Payment being processed by Stripe
- **completed**: Payment successful, funds transferred
- **failed**: Payment failed (retry logic)
- **refunded**: Payment refunded to civilian

### Fee Structure:
- **Platform Fee**: 10% of transaction amount
- **Stripe Processing Fee**: ~2.9% + $0.30 (absorbed by platform)
- **Hero Receives**: 90% of transaction amount

### Refund Logic:
- **Before Assignment**: 100% refund, no fees
- **After Assignment, Before Start**: 90% refund (10% cancellation fee)
- **After Start**: No refund (dispute resolution)
- **Refund Processing**: 5-10 business days

### Fraud Protection:
- Stripe Radar for fraud detection
- 3D Secure for high-value transactions
- Velocity checks (max 5 transactions per day per user)
- Suspicious activity flagging

### Required Logs:
- All payment attempts (success/failure)
- Refund requests and outcomes
- Payout schedules and transfers
- Failed payment retry attempts
- Dispute events

---

## 10. THIRD-PARTY INTEGRATIONS

### Maps / Location Services
**Provider:** Google Maps Platform (or Mapbox)

**Use Cases:**
- Geocoding addresses to lat/lng coordinates
- Displaying service locations on map
- Calculating distance between hero and request
- Route optimization for heroes with multiple jobs (future)

**API Endpoints Needed:**
- Geocoding API: Convert address to coordinates
- Places API: Address autocomplete in forms
- Distance Matrix API: Calculate travel time/distance

**Data Stored:**
- Latitude/longitude in service_requests.location
- Formatted address string

**Rate Limits:**
- Geocoding: 50 requests per second
- Places Autocomplete: 1000 requests per day (free tier)

---

### SMS Provider
**Provider:** Twilio (recommended)

**Use Cases:**
- Phone number verification (OTP)
- Critical notifications (job starting soon, cancellations)
- Two-factor authentication (future)

**API Endpoints Needed:**
- Send SMS
- Verify phone number

**Data Stored:**
- Phone numbers in user profiles
- Verification status

**Rate Limits:**
- 100 SMS per second
- Cost: ~$0.0075 per SMS

---

### Payment Provider
**Provider:** Stripe

**Use Cases:**
- Process civilian payments
- Store payment methods securely
- Manage hero payouts via Stripe Connect
- Handle refunds and disputes

**API Endpoints Needed:**
- Create Customer
- Create PaymentMethod
- Create PaymentIntent
- Create Transfer (for payouts)
- Create Refund

**Webhooks Required:**
- payment_intent.succeeded
- payment_intent.failed
- transfer.created
- charge.refunded

**Data Stored:**
- Stripe customer IDs
- Payment method IDs
- Payment intent IDs
- Transaction records

---

### Email Provider
**Provider:** SendGrid or AWS SES

**Use Cases:**
- Welcome emails
- Password reset
- Request confirmations
- Weekly earnings summaries
- Marketing emails (opt-in)

**API Endpoints Needed:**
- Send transactional email
- Send bulk email (marketing)

**Templates Needed:**
- Welcome email
- Password reset
- Request confirmation
- Job assignment notification
- Payment receipt
- Weekly earnings summary

**Rate Limits:**
- SendGrid: 100 emails per day (free tier)
- AWS SES: 62,000 emails per month (free tier)

---

### Push Notifications
**Provider:** Expo Push Notifications

**Use Cases:**
- Real-time notifications for all events
- Badge counts for unread messages
- Deep linking to specific screens

**API Endpoints Needed:**
- Send push notification
- Get push token

**Data Stored:**
- Expo push tokens in user profiles

**Rate Limits:**
- No hard limit, but batch requests recommended

---

### File Storage
**Provider:** Supabase Storage (or AWS S3)

**Use Cases:**
- Profile images (heroes and civilians)
- Service request photos (future)
- Document uploads (verification, receipts)

**API Endpoints Needed:**
- Upload file
- Get file URL
- Delete file

**Data Stored:**
- File URLs in profile tables
- Metadata (size, type, upload date)

**Storage Limits:**
- Max file size: 5MB per image
- Allowed types: JPEG, PNG, WebP
- Total storage: 10GB (initial allocation)

---

## 11. REAL-TIME REQUIREMENTS

### Chat Messages
**Technology:** Supabase Realtime (PostgreSQL LISTEN/NOTIFY)

**Requirements:**
- Instant message delivery (< 1 second latency)
- Message delivery confirmation
- Typing indicators (future)
- Online/offline status (future)

**Implementation:**
- WebSocket connection per user
- Subscribe to chat_messages table filtered by request_id
- Broadcast INSERT events to connected clients

**Scalability:**
- Support 1000 concurrent connections initially
- Horizontal scaling via Supabase infrastructure

---

### Request Status Updates
**Technology:** Supabase Realtime

**Requirements:**
- Real-time updates when request status changes
- Notify civilian when hero accepts/completes
- Notify hero when request is cancelled

**Implementation:**
- Subscribe to service_requests table filtered by user_id
- Broadcast UPDATE events to relevant users

---

### Notification Delivery
**Technology:** Expo Push Notifications + Supabase Realtime

**Requirements:**
- Push notifications delivered within 5 seconds
- In-app notification badge updates in real-time
- Notification history synced across devices

**Implementation:**
- Server-side trigger on notification creation
- Send push notification via Expo API
- Broadcast to in-app notification center via Realtime

---

### Location Tracking (Future)
**Technology:** WebSocket + GPS

**Requirements:**
- Track hero location during active job
- Update civilian on hero's ETA
- Privacy: Only track during active jobs

**Implementation:**
- Hero app sends location updates every 30 seconds
- Store in temporary location_tracking table
- Broadcast to civilian via Realtime

---

## 12. SECURITY REQUIREMENTS

### Data Encryption

**At Rest:**
- Database: AES-256 encryption (Supabase default)
- File storage: Server-side encryption
- Backups: Encrypted with separate keys

**In Transit:**
- All API calls over HTTPS/TLS 1.3
- WebSocket connections over WSS
- Certificate pinning in mobile app (future)

**Sensitive Fields:**
- Payment information: Never stored, use Stripe tokens
- Passwords: Bcrypt hashed (cost factor 12)
- Phone numbers: Encrypted in database
- Addresses: Encrypted in database

---

### Row Level Security (RLS) Policies

**users table:**
```sql
-- Users can read their own record
CREATE POLICY "Users can view own record" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own record
CREATE POLICY "Users can update own record" ON users
  FOR UPDATE USING (auth.uid() = id);
```

**civilian_profiles table:**
```sql
-- Users can read their own profile
CREATE POLICY "Civilians can view own profile" ON civilian_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Civilians can update own profile" ON civilian_profiles
  FOR UPDATE USING (auth.uid() = user_id);
```

**hero_profiles table:**
```sql
-- Anyone can read hero profiles (public)
CREATE POLICY "Anyone can view hero profiles" ON hero_profiles
  FOR SELECT USING (true);

-- Heroes can update their own profile
CREATE POLICY "Heroes can update own profile" ON hero_profiles
  FOR UPDATE USING (auth.uid() = user_id);
```

**service_requests table:**
```sql
-- Civilians can view their own requests
CREATE POLICY "Civilians can view own requests" ON service_requests
  FOR SELECT USING (auth.uid() = civilian_id);

-- Heroes can view pending requests
CREATE POLICY "Heroes can view pending requests" ON service_requests
  FOR SELECT USING (status = 'pending');

-- Heroes can view their assigned requests
CREATE POLICY "Heroes can view assigned requests" ON service_requests
  FOR SELECT USING (auth.uid() = hero_id);

-- Civilians can create requests
CREATE POLICY "Civilians can create requests" ON service_requests
  FOR INSERT WITH CHECK (auth.uid() = civilian_id);

-- Civilians can update their own requests
CREATE POLICY "Civilians can update own requests" ON service_requests
  FOR UPDATE USING (auth.uid() = civilian_id);

-- Heroes can update assigned requests
CREATE POLICY "Heroes can update assigned requests" ON service_requests
  FOR UPDATE USING (auth.uid() = hero_id);
```

**chat_messages table:**
```sql
-- Users can view messages for their requests
CREATE POLICY "Users can view own messages" ON chat_messages
  FOR SELECT USING (
    auth.uid() IN (
      SELECT civilian_id FROM service_requests WHERE id = request_id
      UNION
      SELECT hero_id FROM service_requests WHERE id = request_id
    )
  );

-- Users can create messages
CREATE POLICY "Users can send messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
```

---

### Access Control Rules

**API Endpoints:**
- All endpoints require authentication (JWT token)
- Role-based access control (RBAC) via user_metadata.user_type
- Resource ownership validation on all mutations

**Rate Limiting:**
- Authentication: 5 attempts per 15 minutes per IP
- Service request creation: 5 per minute per user
- Chat messages: 10 per minute per user
- Hero search: 30 per minute per user
- Profile updates: 10 per hour per user

**Session Management:**
- JWT tokens expire after 1 hour
- Refresh tokens valid for 30 days
- Automatic token refresh on app launch
- Logout invalidates all tokens

---

### Audit Requirements

**Logged Events:**
- All authentication attempts (success/failure)
- Service request creation/updates
- Payment transactions
- Profile changes
- Admin actions (future)
- Failed authorization attempts

**Log Format:**
```json
{
  "timestamp": "2025-12-05T10:00:00Z",
  "event_type": "service_request_created",
  "user_id": "a1b2c3...",
  "user_type": "civilian",
  "ip_address": "192.168.1.1",
  "user_agent": "HomeHeroes/1.0 iOS",
  "resource_id": "d4e5f6...",
  "status": "success",
  "metadata": {}
}
```

**Retention:**
- Security logs: 1 year
- Transaction logs: 7 years (compliance)
- Activity logs: 90 days

---

## 13. PERFORMANCE REQUIREMENTS

### Expected Scale

**Initial Launch (Month 1-3):**
- 1,000 total users (500 civilians, 500 heroes)
- 100 daily active users
- 50 service requests per day
- 500 chat messages per day

**Growth Phase (Month 6-12):**
- 10,000 total users
- 1,000 daily active users
- 500 service requests per day
- 5,000 chat messages per day

**Mature Phase (Year 2+):**
- 100,000 total users
- 10,000 daily active users
- 5,000 service requests per day
- 50,000 chat messages per day

---

### Peak Traffic

**Expected Patterns:**
- Peak hours: 6-9 PM weekdays, 9 AM-6 PM weekends
- 3x average traffic during peak
- Seasonal spikes (spring cleaning, holiday season)

**Concurrent Users:**
- Initial: 50 concurrent users
- Growth: 500 concurrent users
- Mature: 5,000 concurrent users

---

### SLA Expectations

**API Response Times:**
- 95th percentile: < 200ms
- 99th percentile: < 500ms
- Timeout: 10 seconds

**Uptime:**
- Target: 99.9% uptime (43 minutes downtime per month)
- Maintenance windows: Sunday 2-4 AM (announced 48 hours ahead)

**Real-time Latency:**
- Chat messages: < 1 second delivery
- Status updates: < 2 seconds
- Push notifications: < 5 seconds

---

### Database Performance

**Query Optimization:**
- All foreign keys indexed
- Composite indexes on frequently queried combinations
- Materialized views for analytics (future)

**Connection Pooling:**
- Max connections: 100 (Supabase default)
- Connection timeout: 30 seconds
- Idle timeout: 10 minutes

**Caching Strategy:**
- Hero profiles: Cache for 5 minutes (frequently accessed)
- Service categories: Cache for 1 hour (static data)
- User sessions: Cache for token lifetime

---

### Real-time Update Frequency

**Chat Messages:**
- Instant delivery via WebSocket
- No polling, event-driven only

**Request Status:**
- Real-time updates via Supabase Realtime
- Fallback: Poll every 30 seconds if WebSocket disconnected

**Location Tracking (Future):**
- Update every 30 seconds during active job
- Stop tracking when job completed

---

## 14. EDGE CASES & FAILURE HANDLING

### Service Request Creation

**Common Failures:**
- Network timeout during submission
- Validation errors (invalid date, budget)
- Rate limit exceeded
- Duplicate submission

**Backend Response:**
- Timeout: Return 504, client retries with exponential backoff
- Validation: Return 400 with field-specific errors
- Rate limit: Return 429 with retry-after header
- Duplicate: Idempotency key prevents duplicate creation

**User Message:**
- Timeout: "Request is taking longer than expected. Please wait..."
- Validation: Show specific field errors inline
- Rate limit: "You're creating requests too quickly. Please wait {X} seconds."
- Duplicate: "This request has already been created."

---

### Hero Acceptance

**Common Failures:**
- Request already assigned to another hero
- Hero already has active job
- Request was cancelled
- Network failure during acceptance

**Backend Response:**
- Already assigned: Return 409 Conflict
- Active job exists: Return 409 with message
- Request cancelled: Return 410 Gone
- Network failure: Retry with idempotency

**User Message:**
- Already assigned: "This request has been taken by another hero."
- Active job: "You already have an active job. Complete it before accepting another."
- Cancelled: "This request has been cancelled by the civilian."
- Network failure: "Connection lost. Retrying..."

---

### Payment Processing

**Common Failures:**
- Insufficient funds
- Card declined
- Payment method expired
- Stripe API timeout

**Backend Response:**
- Insufficient funds: Return 402 Payment Required
- Card declined: Return 402 with decline reason
- Expired method: Return 400, prompt to update
- Timeout: Retry up to 3 times, then fail gracefully

**User Message:**
- Insufficient funds: "Payment failed: Insufficient funds. Please use a different payment method."
- Card declined: "Your card was declined. Please check your card details or use another card."
- Expired: "Your payment method has expired. Please update your payment information."
- Timeout: "Payment processing is taking longer than expected. We'll notify you when it completes."

---

### Chat Message Delivery

**Common Failures:**
- Recipient offline
- Message too long
- Network disconnection
- Rate limit exceeded

**Backend Response:**
- Offline: Store message, deliver when online
- Too long: Return 400, truncate or reject
- Disconnection: Queue locally, sync when reconnected
- Rate limit: Return 429

**User Message:**
- Offline: Message sent, shows "Delivered" when recipient comes online
- Too long: "Message is too long. Maximum 1000 characters."
- Disconnection: "Sending..." → "Failed to send. Tap to retry."
- Rate limit: "You're sending messages too quickly. Please slow down."

---

### Request Cancellation

**Common Failures:**
- Request already completed
- Cancellation after hero started work
- Network failure during cancellation

**Backend Response:**
- Already completed: Return 409 Conflict
- After start: Apply cancellation fee, return 200
- Network failure: Idempotent operation, safe to retry

**User Message:**
- Already completed: "This request has already been completed and cannot be cancelled."
- After start: "Cancelling now will incur a 20% fee. Continue?"
- Network failure: "Cancellation failed. Please try again."

---

## 15. NICE-TO-HAVE FEATURES (FUTURE ROADMAP)

### Phase 2 Features (3-6 months)

1. **Advanced Search & Filters**
   - Search by location radius
   - Filter by availability
   - Save favorite heroes
   - Hero recommendations based on past requests

2. **Enhanced Ratings & Reviews**
   - Photo uploads in reviews
   - Response from heroes
   - Verified reviews (confirmed completion)
   - Review moderation system

3. **Scheduling Improvements**
   - Recurring service requests
   - Flexible scheduling (hero proposes times)
   - Calendar integration
   - Availability calendar for heroes

4. **In-App Payments**
   - Multiple payment methods
   - Split payments
   - Tip functionality
   - Payment history and receipts

---

### Phase 3 Features (6-12 months)

1. **Advanced Hero Features**
   - Team/company accounts (multiple heroes)
   - Service packages (bundled offerings)
   - Dynamic pricing based on demand
   - Hero badges and certifications

2. **Civilian Features**
   - Service bundles (multiple requests)
   - Group bookings
   - Gift cards
   - Referral program

3. **Platform Enhancements**
   - In-app video calls
   - Document sharing
   - Service contracts/agreements
   - Dispute resolution system

4. **Analytics & Insights**
   - Hero performance dashboard
   - Earnings forecasting
   - Market demand insights
   - Personalized recommendations

---

### Phase 4 Features (12+ months)

1. **Enterprise Features**
   - Business accounts for property managers
   - Bulk booking
   - API access for partners
   - White-label solutions

2. **Advanced Matching**
   - AI-powered hero recommendations
   - Predictive scheduling
   - Automated pricing optimization
   - Smart notifications

3. **Expansion Features**
   - Multi-language support
   - Multi-currency support
   - International markets
   - Franchise model

4. **Community Features**
   - Hero forums
   - Training resources
   - Certification programs
   - Hero success stories

---

## APPENDIX A: API ENDPOINT SUMMARY

### Authentication
- POST /auth/signup - Create new user account
- POST /auth/login - Authenticate user
- POST /auth/logout - End user session
- POST /auth/refresh - Refresh access token
- POST /auth/reset-password - Request password reset
- PUT /auth/update-password - Update password

### User Profiles
- GET /civilian_profiles/:id - Get civilian profile
- PUT /civilian_profiles/:id - Update civilian profile
- GET /hero_profiles - List hero profiles (with filters)
- GET /hero_profiles/:id - Get hero profile
- PUT /hero_profiles/:id - Update hero profile

### Service Requests
- POST /service_requests - Create new request
- GET /service_requests - List requests (filtered by user)
- GET /service_requests/:id - Get request details
- PUT /service_requests/:id - Update request
- DELETE /service_requests/:id - Cancel request

### Chat
- GET /chat_messages?request_id=:id - Get messages for request
- POST /chat_messages - Send new message
- PUT /chat_messages/:id/read - Mark message as read

### Payments (Future)
- POST /payment_methods - Add payment method
- GET /payment_methods - List payment methods
- DELETE /payment_methods/:id - Remove payment method
- POST /payments - Process payment
- GET /payments/:id - Get payment details
- POST /payouts - Request payout

### Reviews (Future)
- POST /reviews - Submit review
- GET /reviews?hero_id=:id - Get hero reviews
- PUT /reviews/:id - Update review

### Notifications (Future)
- GET /notifications - List user notifications
- PUT /notifications/:id/read - Mark as read
- PUT /notifications/read-all - Mark all as read

---

## APPENDIX B: DATABASE SCHEMA SQL

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS for location features (future)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enums
CREATE TYPE user_type AS ENUM ('civilian', 'hero');
CREATE TYPE service_category AS ENUM ('cleaning', 'repairs', 'delivery', 'tutoring', 'other');
CREATE TYPE request_status AS ENUM ('pending', 'assigned', 'active', 'completed', 'cancelled');

-- Civilian Profiles
CREATE TABLE civilian_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  address VARCHAR(200),
  emergency_contact VARCHAR(200),
  notification_preferences JSONB DEFAULT '{"push_notifications":true,"email_notifications":true}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hero Profiles
CREATE TABLE hero_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  skills TEXT[] NOT NULL CHECK (array_length(skills, 1) > 0),
  hourly_rate DECIMAL(10,2) NOT NULL CHECK (hourly_rate >= 10 AND hourly_rate <= 500),
  rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  completed_jobs INTEGER DEFAULT 0 CHECK (completed_jobs >= 0),
  bio TEXT,
  availability JSONB,
  profile_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service Requests
CREATE TABLE service_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  civilian_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  hero_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  category service_category NOT NULL,
  location JSONB NOT NULL,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  estimated_duration INTEGER NOT NULL CHECK (estimated_duration > 0),
  budget_range JSONB NOT NULL,
  status request_status DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat Messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL CHECK (length(message) <= 1000),
  delivered BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_civilian_profiles_user_id ON civilian_profiles(user_id);
CREATE INDEX idx_hero_profiles_user_id ON hero_profiles(user_id);
CREATE INDEX idx_hero_profiles_skills ON hero_profiles USING GIN(skills);
CREATE INDEX idx_hero_profiles_rating ON hero_profiles(rating DESC);
CREATE INDEX idx_hero_profiles_hourly_rate ON hero_profiles(hourly_rate);
CREATE INDEX idx_service_requests_civilian_id ON service_requests(civilian_id);
CREATE INDEX idx_service_requests_hero_id ON service_requests(hero_id);
CREATE INDEX idx_service_requests_status ON service_requests(status);
CREATE INDEX idx_service_requests_scheduled_date ON service_requests(scheduled_date);
CREATE INDEX idx_chat_messages_request_id ON chat_messages(request_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_civilian_profiles_updated_at BEFORE UPDATE ON civilian_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hero_profiles_updated_at BEFORE UPDATE ON hero_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_requests_updated_at BEFORE UPDATE ON service_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

**END OF SPECIFICATION**

This document provides a complete technical breakdown for implementing a production-grade Supabase backend for the HomeHeroes application. All assumptions are clearly labeled, and the specification covers authentication, data models, business logic, integrations, security, performance, and edge cases.

For questions or clarifications, please contact the development team.
