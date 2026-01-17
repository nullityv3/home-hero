# Request Flow Diagram - Contract Compliant

## Complete Request Lifecycle with ID Mapping

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         CIVILIAN CREATES REQUEST                          │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Frontend: user.id (profiles.id)
                                    ↓
                    ┌───────────────────────────┐
                    │  database.createRequest() │
                    └───────────────────────────┘
                                    │
                                    │ Maps to: civilian_id = profiles.id
                                    ↓
                    ┌───────────────────────────┐
                    │   service_requests        │
                    │   ─────────────────       │
                    │   civilian_id: UUID       │ ← profiles.id
                    │   hero_id: NULL           │
                    │   status: 'pending'       │
                    └───────────────────────────┘
                                    │
                                    │ Realtime: INSERT event
                                    ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                    HEROES SEE PENDING REQUESTS                            │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Query: status='pending' AND hero_id IS NULL
                                    ↓
                    ┌───────────────────────────┐
                    │  Hero Dashboard           │
                    │  ─────────────────        │
                    │  Shows: Available         │
                    │  Requests (realtime)      │
                    └───────────────────────────┘
                                    │
                                    │ Hero clicks "Accept"
                                    ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                         HERO ACCEPTS REQUEST                              │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Frontend: user.id (profiles.id)
                                    ↓
                    ┌───────────────────────────┐
                    │  database.acceptRequest() │
                    └───────────────────────────┘
                                    │
                                    │ Step 1: Lookup hero_profiles.id
                                    │ WHERE profile_id = user.id
                                    ↓
                    ┌───────────────────────────┐
                    │   hero_profiles           │
                    │   ─────────────           │
                    │   id: UUID (PK)           │ ← This is what we need
                    │   profile_id: UUID (FK)   │ ← Matches user.id
                    └───────────────────────────┘
                                    │
                                    │ Step 2: Insert acceptance
                                    ↓
                    ┌───────────────────────────┐
                    │   request_acceptances     │
                    │   ─────────────────       │
                    │   request_id: UUID        │
                    │   hero_id: UUID           │ ← hero_profiles.id (PK)
                    │   chosen: false           │
                    └───────────────────────────┘
                                    │
                                    │ Realtime: INSERT event
                                    ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                   CIVILIAN SEES HERO ACCEPTANCES                          │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Query with joins:
                                    │ request_acceptances
                                    │   → hero_profiles (hero_id = id)
                                    │     → profiles (profile_id = id)
                                    ↓
                    ┌───────────────────────────┐
                    │  Choose Hero Screen       │
                    │  ─────────────────        │
                    │  Shows: Hero name,        │
                    │  skills, rating           │
                    └───────────────────────────┘
                                    │
                                    │ Civilian clicks "Choose This Hero"
                                    ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                         CIVILIAN CHOOSES HERO                             │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Frontend: acceptance.hero_id (hero_profiles.id)
                                    ↓
                    ┌───────────────────────────┐
                    │  database.chooseHero()    │
                    └───────────────────────────┘
                                    │
                                    │ Step 1: Lookup profiles.id
                                    │ FROM hero_profiles
                                    │ WHERE id = acceptance.hero_id
                                    ↓
                    ┌───────────────────────────┐
                    │   hero_profiles           │
                    │   ─────────────           │
                    │   id: UUID (PK)           │ ← Matches acceptance.hero_id
                    │   profile_id: UUID (FK)   │ ← This is what we need
                    └───────────────────────────┘
                                    │
                                    │ Step 2: Update request
                                    ↓
                    ┌───────────────────────────┐
                    │   service_requests        │
                    │   ─────────────────       │
                    │   hero_id: UUID           │ ← profiles.id (NOT hero_profiles.id!)
                    │   status: 'assigned'      │
                    └───────────────────────────┘
                                    │
                                    │ Step 3: Mark acceptance as chosen
                                    ↓
                    ┌───────────────────────────┐
                    │   request_acceptances     │
                    │   ─────────────────       │
                    │   chosen: true            │
                    └───────────────────────────┘
                                    │
                                    │ Realtime: UPDATE event
                                    ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                    REQUEST NOW ASSIGNED TO HERO                           │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Both users see updated status
                                    ↓
                    ┌───────────────────────────┐
                    │  Hero: "Assigned to You"  │
                    │  Civilian: "Hero Chosen"  │
                    └───────────────────────────┘
```

---

## ID Mapping Reference

### Key Tables and Their IDs

| Table | Primary Key | Foreign Key | Purpose |
|-------|-------------|-------------|---------|
| `profiles` | `id` | → `auth.users.id` | Canonical user identity |
| `hero_profiles` | `id` | `profile_id` → `profiles.id` | Hero-specific data |
| `civilian_profiles` | `id` | `profile_id` → `profiles.id` | Civilian-specific data |
| `service_requests` | `id` | `civilian_id` → `profiles.id`<br>`hero_id` → `profiles.id` | Job requests |
| `request_acceptances` | `id` | `request_id` → `service_requests.id`<br>`hero_id` → `hero_profiles.id` | Hero interest |

### Critical Rules

1. **User Identity**: Always use `profiles.id` (which equals `auth.uid()`)
2. **Hero Queries**: Use `.eq('profile_id', userId)` NOT `.eq('id', userId)`
3. **Request Acceptances**: `hero_id` references `hero_profiles.id` (primary key)
4. **Service Requests**: `hero_id` references `profiles.id` (user identity)
5. **Database Layer**: Handles all ID mapping transparently

---

## Realtime Event Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    REALTIME SUBSCRIPTIONS                        │
└─────────────────────────────────────────────────────────────────┘

1. Service Requests (Heroes)
   ┌──────────────────────────────────────┐
   │ Channel: service_requests:${userId}  │
   │ Events: INSERT, UPDATE, DELETE       │
   │ Filter: status='pending' OR          │
   │         hero_id=${userId}            │
   └──────────────────────────────────────┘
            │
            ↓
   ┌──────────────────────────────────────┐
   │ Updates: availableRequests[]         │
   │ - Add if pending & unassigned        │
   │ - Remove if assigned                 │
   └──────────────────────────────────────┘

2. Service Requests (Civilians)
   ┌──────────────────────────────────────┐
   │ Channel: service_requests:${userId}  │
   │ Events: INSERT, UPDATE, DELETE       │
   │ Filter: civilian_id=${userId}        │
   └──────────────────────────────────────┘
            │
            ↓
   ┌──────────────────────────────────────┐
   │ Updates: activeRequests[]            │
   │          requestHistory[]            │
   └──────────────────────────────────────┘

3. Request Acceptances (Civilians)
   ┌──────────────────────────────────────┐
   │ Channel: request_acceptances:        │
   │          ${requestId}                │
   │ Events: INSERT                       │
   │ Filter: request_id=${requestId}      │
   └──────────────────────────────────────┘
            │
            ↓
   ┌──────────────────────────────────────┐
   │ Triggers: Refresh acceptances list   │
   │ Shows: New hero interested           │
   └──────────────────────────────────────┘
```

---

## UI State Guards

```
┌─────────────────────────────────────────────────────────────────┐
│                         UI GUARD LOGIC                           │
└─────────────────────────────────────────────────────────────────┘

Hero Request Detail Modal:
  ┌────────────────────────────────────────┐
  │ const canAccept =                      │
  │   request.status === 'pending' &&      │
  │   !request.hero_id                     │
  └────────────────────────────────────────┘
           │
           ├─ TRUE  → Show "Accept Request" button
           │
           └─ FALSE → Show "Already assigned" message

Choose Hero Screen:
  ┌────────────────────────────────────────┐
  │ const [hasChosen, setHasChosen]        │
  └────────────────────────────────────────┘
           │
           ├─ FALSE → Enable "Choose This Hero" button
           │
           └─ TRUE  → Disable button, prevent double-selection
```

---

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      ERROR SCENARIOS                             │
└─────────────────────────────────────────────────────────────────┘

Accept Request:
  Backend Rejects → Frontend Shows Error
  ├─ "already expressed interest" → "You have already accepted"
  ├─ "no longer available" → "Request assigned to another hero"
  └─ "Hero profile not found" → "Complete your profile first"

Choose Hero:
  Backend Rejects → Frontend Shows Error
  ├─ "already chosen" → "Hero already chosen for another request"
  ├─ "Hero profile not found" → "Selected hero no longer available"
  └─ 409 Conflict → "Hero selection failed, please try again"

All Errors:
  ├─ Logged to console for debugging
  ├─ Shown to user with actionable message
  └─ UI state rolled back (no optimistic updates)
```

---

**This diagram represents the complete, contract-compliant request flow.**

All ID mappings are correct, all realtime subscriptions are in place, and all UI guards prevent illegal state transitions.
