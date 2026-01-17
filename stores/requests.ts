import { create } from 'zustand';
import { database, realtime, supabase } from '../services/supabase';
import { RequestStatus, ServiceRequest } from '../types';
import { handleError, logError, retryOperation } from '../utils/error-handler';

interface RequestsState {
  // Data
  activeRequests: ServiceRequest[];
  requestHistory: ServiceRequest[];
  availableRequests: ServiceRequest[]; // For heroes to see pending requests
  isLoading: boolean;
  error: string | null;
  
  // Real-time subscriptions
  subscription: any;
  acceptancesSubscription: any;
  
  // Actions
  loadRequests: (userId: string, userType: 'civilian' | 'hero') => Promise<void>;
  createRequest: (request: Omit<ServiceRequest, 'id' | 'created_at' | 'updated_at'>) => Promise<{ success: boolean; error?: string; data?: ServiceRequest }>;
  updateRequestStatus: (requestId: string, status: RequestStatus, heroId?: string) => Promise<{ success: boolean; error?: string }>;
  acceptRequest: (requestId: string, heroId: string) => Promise<{ success: boolean; error?: string }>;
  chooseHero: (requestId: string, profileId: string, civilianId: string) => Promise<{ success: boolean; error?: string }>;
  getRequestAcceptances: (requestId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
  rejectRequest: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  cancelRequest: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  completeRequest: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  
  // Real-time subscriptions
  subscribeToRequests: (userId: string, userType: 'civilian' | 'hero') => Promise<void>;
  subscribeToRequestAcceptances: (requestId: string) => Promise<void>;
  unsubscribeFromRequests: () => void;
  
  // Utility
  clearRequests: () => void;
  setError: (error: string | null) => void;
}

export const useRequestsStore = create<RequestsState>((set, get) => ({
  activeRequests: [],
  requestHistory: [],
  availableRequests: [],
  isLoading: false,
  error: null,
  subscription: null,
  acceptancesSubscription: null,

  loadRequests: async (userId: string, userType: 'civilian' | 'hero') => {
    set({ isLoading: true, error: null });
    
    try {
      const { data, error } = await retryOperation(
        () => database.getServiceRequests(userId, userType),
        3
      );
      
      if (error) {
        const appError = handleError(error);
        logError(appError, 'loadRequests');
        set({ error: appError.suggestion, isLoading: false });
        return;
      }

      // Ensure data is an array before filtering
      if (data && Array.isArray(data)) {
        // Separate active requests from history
        const active = (data as ServiceRequest[]).filter(req => 
          req.status === 'pending' || req.status === 'assigned' || req.status === 'active'
        );
        const history = (data as ServiceRequest[]).filter(req => 
          req.status === 'completed' || req.status === 'cancelled'
        );

        // For heroes, also load available requests (all pending requests)
        if (userType === 'hero') {
          const { data: availableData, error: availableError } = await retryOperation(
            () => database.getAvailableRequests(),
            3
          );
          
          if (!availableError && availableData) {
            set({ 
              activeRequests: active,
              requestHistory: history,
              availableRequests: availableData as ServiceRequest[],
              isLoading: false 
            });
          } else {
            set({ 
              activeRequests: active,
              requestHistory: history,
              availableRequests: [],
              isLoading: false 
            });
          }
        } else {
          set({ 
            activeRequests: active,
            requestHistory: history,
            isLoading: false 
          });
        }
      } else {
        // Handle case where data is null or not an array
        set({ 
          activeRequests: [],
          requestHistory: [],
          availableRequests: [],
          isLoading: false 
        });
      }
    } catch (error) {
      const appError = handleError(error);
      logError(appError, 'loadRequests');
      set({ 
        error: appError.suggestion, 
        isLoading: false 
      });
    }
  },

  createRequest: async (request) => {
    set({ isLoading: true, error: null });
    
    // ✅ SCHEMA COMPLIANCE: civilian_id is now derived from authenticated user profile
    // Validate required fields before API call (civilian_id removed - derived from auth)
    const requiredFields = ['title', 'description', 'category', 'location', 'scheduled_date', 'estimated_duration', 'budget_range'];
    const missingFields = requiredFields.filter(field => !request[field as keyof typeof request]);
    
    if (missingFields.length > 0) {
      const error = `Missing required fields: ${missingFields.join(', ')}`;
      const appError = handleError({ message: error });
      set({ error: appError.suggestion, isLoading: false });
      return { success: false, error: appError.suggestion };
    }
    
    try {
      const { data, error } = await retryOperation(
        () => database.createServiceRequest({
          ...request,
          status: 'pending'
        }),
        3
      );
      
      if (error) {
        const appError = handleError(error);
        logError(appError, 'createRequest');
        set({ error: appError.suggestion, isLoading: false });
        return { success: false, error: appError.suggestion };
      }

      if (data) {
        // Add to active requests
        set(state => ({ 
          activeRequests: [data as ServiceRequest, ...state.activeRequests],
          isLoading: false 
        }));
        return { success: true, data: data as ServiceRequest };
      }

      set({ isLoading: false });
      return { success: false, error: 'An unexpected error occurred. Please try again' };
    } catch (error) {
      const appError = handleError(error);
      logError(appError, 'createRequest');
      set({ 
        error: appError.suggestion, 
        isLoading: false 
      });
      return { success: false, error: appError.suggestion };
    }
  },

  updateRequestStatus: async (requestId: string, status: RequestStatus, heroId?: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (heroId) {
        updates.hero_id = heroId;
      }

      const { data, error } = await retryOperation(
        () => database.updateServiceRequest(requestId, updates),
        3
      );
      
      if (error) {
        const appError = handleError(error);
        logError(appError, 'updateRequestStatus');
        set({ error: appError.suggestion, isLoading: false });
        return { success: false, error: appError.suggestion };
      }

      if (data) {
        // Update the request in the appropriate list
        set(state => {
          const updatedRequest = data as ServiceRequest;
          const updatedActiveRequests = state.activeRequests.map(req => 
            req.id === requestId ? updatedRequest : req
          );
          
          // Move to history if completed or cancelled
          if (status === 'completed' || status === 'cancelled') {
            const filteredActive = state.activeRequests.filter(req => req.id !== requestId);
            return {
              activeRequests: filteredActive,
              requestHistory: [updatedRequest, ...state.requestHistory],
              isLoading: false
            };
          }
          
          return {
            activeRequests: updatedActiveRequests,
            isLoading: false
          };
        });
        
        return { success: true };
      }

      set({ isLoading: false });
      return { success: false, error: 'An unexpected error occurred. Please try again' };
    } catch (error) {
      const appError = handleError(error);
      logError(appError, 'updateRequestStatus');
      set({ 
        error: appError.suggestion, 
        isLoading: false 
      });
      return { success: false, error: appError.suggestion };
    }
  },

  acceptRequest: async (requestId: string, heroUserId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // ✅ FRONTEND CONTRACT: Pass profiles.id (auth.uid) directly
      const { data, error } = await retryOperation(
        () => database.acceptRequest(requestId, heroUserId),
        3
      );
      
      if (error) {
        const appError = handleError(error);
        logError(appError, 'acceptRequest');
        
        // ✅ Handle expected constraint violations
        let userMessage = appError.suggestion;
        if (error.message?.includes('already expressed interest') || 
            error.message?.includes('already accepted')) {
          userMessage = 'You have already expressed interest in this request';
        } else if (error.message?.includes('no longer available')) {
          userMessage = 'This request has already been assigned to another hero';
        } else if (error.message?.includes('Hero profile not found')) {
          userMessage = 'Please complete your hero profile setup before accepting requests';
        }
        
        set({ error: userMessage, isLoading: false });
        return { success: false, error: userMessage };
      }

      set({ isLoading: false });
      return { success: true };
    } catch (error) {
      const appError = handleError(error);
      logError(appError, 'acceptRequest');
      
      // ✅ Handle 409 constraint violations as expected states
      let userMessage = appError.suggestion;
      if (error.status === 409) {
        userMessage = 'Request no longer available due to concurrent access';
      }
      
      set({ 
        error: userMessage, 
        isLoading: false 
      });
      return { success: false, error: userMessage };
    }
  },

  chooseHero: async (requestId: string, profileId: string, civilianId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // ✅ FRONTEND CONTRACT: Pass profiles.id (auth.uid) directly
      const { data, error } = await retryOperation(
        () => database.chooseHero(requestId, profileId, civilianId),
        3
      );
      
      if (error) {
        const appError = handleError(error);
        logError(appError, 'chooseHero');
        
        // ✅ Handle expected constraint violations
        let userMessage = appError.suggestion;
        if (error.message?.includes('already chosen') || 
            error.message?.includes('no longer available')) {
          userMessage = 'This hero has already been chosen for another request';
        } else if (error.message?.includes('Hero profile not found')) {
          userMessage = 'Selected hero is no longer available';
        }
        
        set({ error: userMessage, isLoading: false });
        return { success: false, error: userMessage };
      }

      if (data) {
        // Update the request in active requests
        set(state => ({
          activeRequests: state.activeRequests.map(req => 
            req.id === requestId ? data as ServiceRequest : req
          ),
          isLoading: false
        }));
        
        return { success: true };
      }

      set({ isLoading: false });
      return { success: false, error: 'An unexpected error occurred. Please try again' };
    } catch (error) {
      const appError = handleError(error);
      logError(appError, 'chooseHero');
      
      // ✅ Handle 409 constraint violations as expected states
      let userMessage = appError.suggestion;
      if (error.status === 409) {
        userMessage = 'Hero selection failed due to concurrent access. Please try again.';
      }
      
      set({ 
        error: userMessage, 
        isLoading: false 
      });
      return { success: false, error: userMessage };
    }
  },

  getRequestAcceptances: async (requestId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const { data, error } = await retryOperation(
        () => database.getRequestAcceptances(requestId),
        3
      );
      
      if (error) {
        const appError = handleError(error);
        logError(appError, 'getRequestAcceptances');
        set({ error: appError.suggestion, isLoading: false });
        return { success: false, error: appError.suggestion };
      }

      set({ isLoading: false });
      return { success: true, data: data || [] };
    } catch (error) {
      const appError = handleError(error);
      logError(appError, 'getRequestAcceptances');
      set({ 
        error: appError.suggestion, 
        isLoading: false 
      });
      return { success: false, error: appError.suggestion };
    }
  },

  rejectRequest: async (requestId: string) => {
    // For heroes, this just removes it from their view
    // The request remains available for other heroes
    set(state => ({
      availableRequests: state.availableRequests.filter(req => req.id !== requestId)
    }));
    return { success: true };
  },

  cancelRequest: async (requestId: string) => {
    return get().updateRequestStatus(requestId, 'cancelled');
  },

  completeRequest: async (requestId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // Get the request details first
      const request = get().activeRequests.find(req => req.id === requestId);
      
      if (!request) {
        const appError = handleError({ message: 'Request not found' });
        set({ error: appError.suggestion, isLoading: false });
        return { success: false, error: appError.suggestion };
      }
      
      // Update request status to completed
      const result = await get().updateRequestStatus(requestId, 'completed');
      
      if (result.success) {
        // TODO: Trigger payment processing
        // This would typically call a payment service API
        // For now, we'll just log it
        console.log(`Payment processing initiated for request ${requestId}`);
        
        // TODO: Update hero earnings
        // This would typically update the hero_profiles table
        // The earnings calculation would be based on budget_range
        const estimatedEarnings = (request.budget_range.min + request.budget_range.max) / 2;
        console.log(`Hero earnings updated: +$${estimatedEarnings}`);
        
        // TODO: Send notification to civilian
        // This would typically use a notification service
        console.log(`Completion notification sent to civilian ${request.civilian_id}`);
      }
      
      return result;
    } catch (error) {
      const appError = handleError(error);
      logError(appError, 'completeRequest');
      set({ 
        error: appError.suggestion, 
        isLoading: false 
      });
      return { success: false, error: appError.suggestion };
    }
  },

  subscribeToRequests: async (userId: string, userType: 'civilian' | 'hero') => {
    // Unsubscribe from any existing subscription first to prevent double-subscribe
    get().unsubscribeFromRequests();
    
    const channel = await realtime.subscribeToServiceRequests(
      userId, 
      userType, 
      (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        
        set(state => {
          let newActiveRequests = [...state.activeRequests];
          let newRequestHistory = [...state.requestHistory];
          let newAvailableRequests = [...state.availableRequests];
          
          switch (eventType) {
            case 'INSERT':
              const insertedRecord = newRecord as ServiceRequest;
              
              // ✅ DEDUPLICATION: Prevent duplicate records by request.id
              const existsInActive = newActiveRequests.some(req => req.id === insertedRecord.id);
              const existsInHistory = newRequestHistory.some(req => req.id === insertedRecord.id);
              const existsInAvailable = newAvailableRequests.some(req => req.id === insertedRecord.id);
              
              if (!existsInActive && !existsInHistory) {
                if (insertedRecord.status === 'pending' || insertedRecord.status === 'assigned' || insertedRecord.status === 'active') {
                  newActiveRequests = [insertedRecord, ...newActiveRequests];
                } else {
                  newRequestHistory = [insertedRecord, ...newRequestHistory];
                }
              }
              
              // ✅ For heroes: Add to available requests if pending and unassigned
              if (userType === 'hero' && insertedRecord.status === 'pending' && !insertedRecord.hero_id && !existsInAvailable) {
                newAvailableRequests = [insertedRecord, ...newAvailableRequests];
              }
              break;
              
            case 'UPDATE':
              const updatedRecord = newRecord as ServiceRequest;
              // ✅ AUTHORITATIVE UPDATE: Remove from all locations first
              newActiveRequests = newActiveRequests.filter(req => req.id !== updatedRecord.id);
              newRequestHistory = newRequestHistory.filter(req => req.id !== updatedRecord.id);
              newAvailableRequests = newAvailableRequests.filter(req => req.id !== updatedRecord.id);
              
              // ✅ BACKEND AS SOURCE OF TRUTH: Add to appropriate location based on backend status
              if (updatedRecord.status === 'completed' || updatedRecord.status === 'cancelled') {
                newRequestHistory = [updatedRecord, ...newRequestHistory];
              } else {
                newActiveRequests = [updatedRecord, ...newActiveRequests];
              }
              
              // ✅ For heroes: Update available requests (remove if assigned, add if back to pending)
              if (userType === 'hero') {
                if (updatedRecord.status === 'pending' && !updatedRecord.hero_id) {
                  newAvailableRequests = [updatedRecord, ...newAvailableRequests];
                }
              }
              break;
              
            case 'DELETE':
              const deletedRecord = oldRecord as ServiceRequest;
              // ✅ CLEANUP: Remove from all locations
              newActiveRequests = newActiveRequests.filter(req => req.id !== deletedRecord.id);
              newRequestHistory = newRequestHistory.filter(req => req.id !== deletedRecord.id);
              newAvailableRequests = newAvailableRequests.filter(req => req.id !== deletedRecord.id);
              break;
          }
          
          return {
            activeRequests: newActiveRequests,
            requestHistory: newRequestHistory,
            availableRequests: newAvailableRequests
          };
        });
      }
    );
    
    // Only set subscription if it was successfully created
    if (channel) {
      set({ subscription: channel });
    }
  },

  unsubscribeFromRequests: () => {
    const { subscription, acceptancesSubscription } = get();
    
    if (subscription) {
      realtime.unsubscribe(subscription);
    }
    
    if (acceptancesSubscription) {
      realtime.unsubscribe(acceptancesSubscription);
    }
    
    set({ subscription: null, acceptancesSubscription: null });
  },

  subscribeToRequestAcceptances: async (requestId: string) => {
    // ✅ REALTIME: Subscribe to request_acceptances for a specific request
    // This allows civilians to see heroes accepting their request in real-time
    const channel = supabase
      .channel(`request_acceptances:${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'request_acceptances',
          filter: `request_id=eq.${requestId}`
        },
        (payload) => {
          console.log('New acceptance received:', payload);
          // Trigger a refresh of acceptances
          // The component will handle re-fetching the full data with joins
        }
      )
      .subscribe();
    
    if (channel) {
      set({ acceptancesSubscription: channel });
    }
  },

  clearRequests: () => {
    get().unsubscribeFromRequests();
    set({ 
      activeRequests: [], 
      requestHistory: [],
      availableRequests: [],
      error: null,
      isLoading: false 
    });
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));