# HomeHeroes Frontend Design Document

## Overview

HomeHeroes is a React Native/Expo mobile application that connects civilians seeking services with skilled heroes who provide those services. The application features a dual-interface design with distinct user experiences for civilians (service requesters) and heroes (service providers). Built using Expo Router for navigation, Supabase for backend services, React Query for data management, and Zustand for state management, the app emphasizes clean, intuitive design inspired by Yango's aesthetic principles.

## Architecture

### Technology Stack
- **Framework**: React Native with Expo SDK 54
- **Navigation**: Expo Router v6 with file-based routing
- **Backend**: Supabase (authentication, database, real-time subscriptions)
- **State Management**: Zustand for global state, React Query for server state
- **UI Components**: Custom components with React Native base components
- **Animations**: React Native Reanimated v4
- **Icons**: Expo Vector Icons and Expo Symbols
- **Development**: TypeScript, ESLint, Prettier

### Application Structure
```
app/
├── (auth)/                 # Authentication screens
├── (civilian)/            # Civilian-specific screens
├── (hero)/               # Hero-specific screens
├── (shared)/             # Shared screens (chat, profile)
├── _layout.tsx           # Root layout with theme provider
└── index.tsx             # Entry point with user type detection

components/
├── ui/                   # Reusable UI components
├── forms/               # Form components
├── cards/               # Card components
└── navigation/          # Navigation components

services/
├── supabase/            # Supabase client and operations
├── api/                 # API layer abstractions
└── storage/             # Local storage utilities

stores/
├── auth.ts              # Authentication state
├── user.ts              # User profile state
└── requests.ts          # Service requests state
```

## Components and Interfaces

### Core Data Models

#### User Model
```typescript
interface User {
  id: string;
  email: string;
  user_type: 'civilian' | 'hero';
  profile: CivilianProfile | HeroProfile;
  created_at: string;
  updated_at: string;
}

interface CivilianProfile {
  full_name: string;
  phone: string;
  address: string;
  payment_methods: PaymentMethod[];
  notification_preferences: NotificationSettings;
}

interface HeroProfile {
  full_name: string;
  phone: string;
  skills: string[];
  hourly_rate: number;
  availability: AvailabilitySchedule;
  rating: number;
  completed_jobs: number;
  profile_image_url?: string;
}
```

#### Service Request Model
```typescript
interface ServiceRequest {
  id: string;
  civilian_id: string;
  hero_id?: string;
  title: string;
  description: string;
  category: ServiceCategory;
  location: Location;
  scheduled_date: string;
  estimated_duration: number;
  budget_range: BudgetRange;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
}

type RequestStatus = 'pending' | 'assigned' | 'active' | 'completed' | 'cancelled';
type ServiceCategory = 'cleaning' | 'repairs' | 'delivery' | 'tutoring' | 'other';
```

### Navigation Structure

#### Civilian Navigation
```typescript
// app/(civilian)/_layout.tsx
<Tabs>
  <Tabs.Screen name="home" options={{ title: 'Home' }} />
  <Tabs.Screen name="requests" options={{ title: 'My Requests' }} />
  <Tabs.Screen name="heroes" options={{ title: 'Find Heroes' }} />
  <Tabs.Screen name="chat" options={{ title: 'Messages' }} />
  <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
</Tabs>
```

#### Hero Navigation
```typescript
// app/(hero)/_layout.tsx
<Tabs>
  <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
  <Tabs.Screen name="requests" options={{ title: 'Job Requests' }} />
  <Tabs.Screen name="earnings" options={{ title: 'Earnings' }} />
  <Tabs.Screen name="chat" options={{ title: 'Messages' }} />
  <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
</Tabs>
```

### Key Components

#### Reusable UI Components
- `Button`: Primary, secondary, and disabled variants
- `Card`: Hero cards, request cards, stats cards
- `Input`: Text inputs with validation states
- `Modal`: Confirmation dialogs, error messages
- `LoadingSkeleton`: Placeholder content during loading
- `EmptyState`: No data available states
- `StatusBadge`: Request status indicators

#### Form Components
- `ServiceRequestForm`: Multi-step service request creation
- `HeroSearchForm`: Hero filtering and search
- `ProfileEditForm`: User profile management
- `PaymentMethodForm`: Payment setup and management

## Data Models

### Supabase Schema

#### Tables
```sql
-- Users table (managed by Supabase Auth)
users (
  id uuid primary key,
  email text unique not null,
  user_type text check (user_type in ('civilian', 'hero')),
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Civilian profiles
civilian_profiles (
  user_id uuid references users(id) primary key,
  full_name text not null,
  phone text,
  address text,
  notification_preferences jsonb default '{}',
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Hero profiles
hero_profiles (
  user_id uuid references users(id) primary key,
  full_name text not null,
  phone text,
  skills text[] default '{}',
  hourly_rate decimal(10,2),
  availability jsonb default '{}',
  rating decimal(3,2) default 0,
  completed_jobs integer default 0,
  profile_image_url text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Service requests
service_requests (
  id uuid primary key default gen_random_uuid(),
  civilian_id uuid references users(id) not null,
  hero_id uuid references users(id),
  title text not null,
  description text not null,
  category text not null,
  location jsonb not null,
  scheduled_date timestamp not null,
  estimated_duration integer not null,
  budget_range jsonb not null,
  status text default 'pending' check (status in ('pending', 'assigned', 'active', 'completed', 'cancelled')),
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Chat messages
chat_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references service_requests(id) not null,
  sender_id uuid references users(id) not null,
  message text not null,
  created_at timestamp default now()
);
```

#### Row Level Security (RLS) Policies
- Users can only access their own profile data
- Civilians can view hero profiles and create service requests
- Heroes can view pending requests and update assigned requests
- Chat messages are only accessible to request participants

### State Management

#### Zustand Stores
```typescript
// stores/auth.ts
interface AuthState {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

// stores/requests.ts
interface RequestsState {
  activeRequests: ServiceRequest[];
  requestHistory: ServiceRequest[];
  addRequest: (request: Omit<ServiceRequest, 'id' | 'created_at'>) => Promise<void>;
  updateRequestStatus: (id: string, status: RequestStatus) => Promise<void>;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, I'll focus on the most critical properties that provide unique validation value while eliminating redundancy:

**Property 1: Service request creation consistency**
*For any* valid service request data, submitting the request should result in the request appearing in the civilian's pending requests list with correct status
**Validates: Requirements 1.2**

**Property 2: Form validation prevents invalid submissions**
*For any* service request with missing required fields, the submission should be prevented and validation errors should be displayed for the missing fields
**Validates: Requirements 1.3**

**Property 3: Request history completeness**
*For any* civilian's request history, all displayed requests should include status, hero assignment (if assigned), and completion date (if completed)
**Validates: Requirements 1.4**

**Property 4: Request cancellation state consistency**
*For any* active service request, when cancelled by the civilian, the request status should update to 'cancelled' and the assigned hero should receive a notification
**Validates: Requirements 1.5**

**Property 5: Hero filtering accuracy**
*For any* search criteria (price range, rating threshold, distance), all returned heroes should match the specified criteria and no matching heroes should be excluded
**Validates: Requirements 2.2**

**Property 6: Hero list sorting correctness**
*For any* list of heroes and sort criteria (rating, price, default), the sorted results should be in the correct order according to the selected criteria
**Validates: Requirements 2.3**

**Property 7: Hero selection detail consistency**
*For any* selected hero, the detail view should display all hero profile information including name, rating, price, availability, and skills
**Validates: Requirements 2.5**

**Property 8: Request acceptance state transitions**
*For any* pending service request, when accepted by a hero, the request status should change to 'assigned', the hero should be linked to the request, and the civilian should receive a notification
**Validates: Requirements 3.3**

**Property 9: Request rejection availability**
*For any* service request rejected by a hero, the request should be removed from that hero's pending list while remaining available for other heroes to accept
**Validates: Requirements 3.4**

**Property 10: Request completion workflow**
*For any* active service request, when marked complete by the hero, the request status should update to 'completed' and the payment process should be initiated
**Validates: Requirements 3.5**

**Property 11: Earnings calculation accuracy**
*For any* completed job, the hero's total earnings should increase by the job payment amount and their completed job count should increment by one
**Validates: Requirements 4.3**

**Property 12: Earnings filtering consistency**
*For any* date range filter applied to earnings, all displayed statistics (totals, graphs, job counts) should only include data from within the selected time period
**Validates: Requirements 4.2**

**Property 13: Chat message delivery and display**
*For any* message sent in the chat interface, the message should be delivered to the recipient with correct timestamp and sender identification
**Validates: Requirements 5.2**

**Property 14: Real-time chat updates**
*For any* new message received, the chat interface should update immediately and display a notification to the recipient
**Validates: Requirements 5.3**

**Property 15: Profile update persistence**
*For any* valid profile information changes, the updates should be validated, saved immediately, and reflected in the user's profile display
**Validates: Requirements 6.2**

**Property 16: Hero profile synchronization**
*For any* hero's skills or availability updates, the changes should be immediately reflected in their public profile visible to civilians
**Validates: Requirements 6.4**

**Property 17: User action feedback consistency**
*For any* user action performed in the application, appropriate visual feedback (loading states, confirmations, or error messages) should be displayed
**Validates: Requirements 7.2**

**Property 18: Error handling completeness**
*For any* error condition that occurs, a clear error message with suggested resolution actions should be displayed to the user
**Validates: Requirements 7.4**

**Property 19: Responsive layout adaptation**
*For any* screen size or orientation change, the interface layout should adapt to maintain usability and all interactive elements should remain accessible
**Validates: Requirements 8.1, 8.4**

**Property 20: Offline action synchronization**
*For any* user actions performed while offline, the actions should be queued locally and synchronized with the server when network connectivity is restored
**Validates: Requirements 8.3**

## Error Handling

### Error Categories and Responses

#### Network Errors
- **Connection timeout**: Display retry button with "Check your connection and try again"
- **Server unavailable**: Show "Service temporarily unavailable. Please try again later"
- **Rate limiting**: Display "Too many requests. Please wait a moment and try again"

#### Validation Errors
- **Form validation**: Highlight invalid fields with specific error messages
- **Authentication errors**: Redirect to login with appropriate error message
- **Authorization errors**: Display "You don't have permission to perform this action"

#### Data Errors
- **Not found**: Show "The requested information could not be found"
- **Conflict**: Display "This action conflicts with current data. Please refresh and try again"
- **Invalid data**: Show specific validation messages for each field

### Error Recovery Strategies
- Automatic retry for transient network errors (max 3 attempts)
- Offline queue for user actions during network outages
- Graceful degradation when optional features are unavailable
- Clear user guidance for resolving error conditions

## Testing Strategy

### Unit Testing Approach
The application will use Jest and React Native Testing Library for unit testing, focusing on:

- **Component behavior**: Testing that components render correctly with various props and states
- **User interactions**: Verifying that user actions trigger expected behaviors
- **Form validation**: Testing input validation logic and error handling
- **Navigation flows**: Ensuring proper screen transitions and parameter passing
- **State management**: Testing Zustand store actions and state updates
- **API integration**: Testing service layer functions and error handling

### Property-Based Testing Approach
The application will use fast-check for property-based testing to verify universal properties:

- **Property testing library**: fast-check (JavaScript/TypeScript property-based testing)
- **Test iterations**: Minimum 100 iterations per property test to ensure thorough coverage
- **Property test tagging**: Each property-based test will include a comment with the format: `**Feature: homeheroes-frontend, Property {number}: {property_text}**`
- **Single property per test**: Each correctness property will be implemented by exactly one property-based test
- **Generator strategy**: Smart generators that constrain inputs to valid application domains (valid user IDs, realistic service requests, proper date ranges)

### Testing Requirements
- All new functionality must include both unit tests and property-based tests where applicable
- Unit tests verify specific examples and edge cases work correctly
- Property-based tests verify universal properties hold across all valid inputs
- Tests must validate real functionality without mocking core business logic
- Property-based tests must reference their corresponding design document property
- Test coverage should focus on core functional logic and critical user paths

### Integration Testing
- End-to-end user flows using Detox for React Native
- API integration testing with Supabase test environment
- Real-time functionality testing for chat and notifications
- Cross-platform testing on iOS and Android simulators

The dual testing approach ensures comprehensive coverage: unit tests catch specific bugs and edge cases, while property tests verify that the system behaves correctly across the full range of possible inputs and states.