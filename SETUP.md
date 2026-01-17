# HomeHeroes Frontend Setup

This document outlines the project structure and setup for the HomeHeroes mobile application.

## Project Structure

```
home/
├── app/                    # Expo Router screens
├── components/             # Reusable UI components
├── constants/              # App constants and theme
├── hooks/                  # Custom React hooks
├── services/               # API and external service integrations
├── stores/                 # Zustand state management
├── types/                  # TypeScript type definitions
└── utils/                  # Utility functions
```

## Core Technologies

- **React Native + Expo**: Cross-platform mobile development
- **Expo Router**: File-based navigation
- **Supabase**: Backend as a Service (auth, database, real-time)
- **Zustand**: State management
- **React Query**: Server state management and caching
- **TypeScript**: Type safety

## Environment Setup

1. Copy `.env.example` to `.env` and fill in your Supabase credentials:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

## Key Features Implemented

### 1. Type System
- Complete TypeScript interfaces for all data models
- Database type definitions for Supabase integration
- Form validation and API response types

### 2. Authentication System
- Supabase auth integration with email/password
- User type differentiation (civilian vs hero)
- Auth state management with Zustand
- Automatic session handling and persistence

### 3. State Management
- **Auth Store**: User authentication and session management
- **User Store**: Profile data and user preferences
- **Requests Store**: Service request management with real-time updates

### 4. Data Layer
- Supabase client configuration with proper typing
- Database helper functions for common operations
- Real-time subscription management
- React Query integration for caching and synchronization

### 5. Utility Functions
- Date/time formatting
- Currency formatting
- Form validation helpers
- Distance calculations
- Text utilities

## Next Steps

The core infrastructure is now in place. The next tasks will involve:

1. Building authentication screens and flows
2. Creating reusable UI components
3. Implementing navigation structure
4. Building feature-specific screens and functionality

## Architecture Decisions

### State Management Strategy
- **Zustand** for client-side state (auth, UI state)
- **React Query** for server state (API data, caching)
- **Supabase Real-time** for live updates

### Data Flow
1. UI components consume data from Zustand stores
2. Stores use React Query for server data management
3. React Query handles caching, background updates, and error states
4. Supabase provides real-time updates for collaborative features

### Type Safety
- All API responses are typed
- Database schema is reflected in TypeScript types
- Form validation uses typed schemas
- Component props are strictly typed

This foundation provides a scalable, maintainable architecture for the HomeHeroes application.