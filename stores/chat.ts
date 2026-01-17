import { RealtimeChannel } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { ChatMessage } from '../types';
import { handleError, logError, retryOperation } from '../utils/error-handler';
import { logger } from '../utils/logger';

interface PresenceState {
  [userId: string]: Array<{
    presence_ref: string;
    online_at: string;
    user_id: string;
  }>;
}

interface ChatState {
  messages: Record<string, ChatMessage[]>;
  presence: Record<string, PresenceState>;
  subscriptions: Record<string, RealtimeChannel>;
  connectionStatus: Record<string, 'connecting' | 'connected' | 'disconnected' | 'error'>;
  isLoading: Record<string, boolean>;
  error: string | null;
  activeRequestId: string | null;
  
  // Actions
  loadMessages: (requestId: string) => Promise<void>;
  sendMessage: (requestId: string, message: string) => Promise<void>;
  subscribeToRoom: (requestId: string) => Promise<void>;
  unsubscribeFromRoom: (requestId: string) => void;
  setActiveRequest: (requestId: string | null) => void;
  clearError: () => void;
  getOnlineUsers: (requestId: string) => string[];
  retryFailedMessage: (requestId: string, tempId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: {},
  presence: {},
  subscriptions: {},
  connectionStatus: {},
  isLoading: {},
  error: null,
  activeRequestId: null,

  loadMessages: async (requestId: string) => {
    set((state) => ({ 
      isLoading: { ...state.isLoading, [requestId]: true },
      error: null 
    }));
    
    try {
      const { data, error } = await retryOperation(
        async () => {
          const result = await supabase
            .from('chat_messages')
            .select('*')
            .eq('request_id', requestId)
            .order('created_at', { ascending: true });
          return result;
        },
        3
      );
      
      if (error) throw error;
      
      set((state) => ({
        messages: {
          ...state.messages,
          [requestId]: (data || []).map(msg => ({ ...msg, delivered: true })),
        },
        isLoading: { ...state.isLoading, [requestId]: false },
      }));
    } catch (error: any) {
      const appError = handleError(error);
      logError(appError, 'loadMessages');
      set((state) => ({ 
        error: appError.suggestion, 
        isLoading: { ...state.isLoading, [requestId]: false }
      }));
    }
  },

  sendMessage: async (requestId: string, message: string) => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      set({ error: 'Authentication required to send messages' });
      return;
    }

    // Generate temporary ID for optimistic update
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const tempMessage: ChatMessage = {
      id: tempId,
      request_id: requestId,
      sender_id: user.id,
      message: trimmedMessage,
      created_at: new Date().toISOString(),
      temp: true,
      delivered: false,
    };

    // Optimistic update - show message immediately
    set((state) => {
      const roomMessages = state.messages[requestId] || [];
      return {
        messages: {
          ...state.messages,
          [requestId]: [...roomMessages, tempMessage],
        },
      };
    });

    try {
      // Send to server with retry logic
      const { data, error } = await retryOperation(
        async () => {
          const result = await supabase
            .from('chat_messages')
            .insert({
              request_id: requestId,
              sender_id: user.id,
              message: trimmedMessage,
            })
            .select()
            .single();
          return result;
        },
        3,
        1000 // Start with 1 second delay
      );
      
      if (error) throw error;

      // Replace temp message with real message from server
      set((state) => {
        const roomMessages = state.messages[requestId] || [];
        return {
          messages: {
            ...state.messages,
            [requestId]: roomMessages.map(msg => 
              msg.id === tempId 
                ? { ...data, delivered: true, temp: false }
                : msg
            ),
          },
        };
      });

      logger.info('Message sent successfully', { requestId, messageId: data.id });
    } catch (error: any) {
      const appError = handleError(error);
      logError(appError, 'sendMessage');
      
      // Mark temp message as failed
      set((state) => {
        const roomMessages = state.messages[requestId] || [];
        return {
          messages: {
            ...state.messages,
            [requestId]: roomMessages.map(msg => 
              msg.id === tempId 
                ? { ...msg, failed: true, delivered: false }
                : msg
            ),
          },
          error: appError.suggestion,
        };
      });
    }
  },

  subscribeToRoom: async (requestId: string) => {
    // Unsubscribe from previous subscription for this room if exists
    const existingChannel = get().subscriptions[requestId];
    if (existingChannel) {
      await supabase.removeChannel(existingChannel);
      logger.info('Unsubscribed from previous channel', { requestId });
    }

    // Validate user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logger.error('Cannot subscribe: user not authenticated', { error: authError });
      set((state) => ({
        connectionStatus: { ...state.connectionStatus, [requestId]: 'error' },
        error: 'Authentication required for chat',
      }));
      return;
    }

    set((state) => ({
      connectionStatus: { ...state.connectionStatus, [requestId]: 'connecting' },
    }));

    // Create channel with presence enabled
    const channel = supabase.channel(`room:${requestId}:messages`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    // Track presence changes
    channel.on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState() as PresenceState;
      set((state) => ({
        presence: {
          ...state.presence,
          [requestId]: presenceState,
        },
      }));
      logger.info('Presence synced', { 
        requestId, 
        onlineCount: Object.keys(presenceState).length 
      });
    });

    channel.on('presence', { event: 'join' }, ({ key }) => {
      logger.info('User joined', { requestId, userId: key });
    });

    channel.on('presence', { event: 'leave' }, ({ key }) => {
      logger.info('User left', { requestId, userId: key });
    });

    // Subscribe to new messages
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `request_id=eq.${requestId}`,
      },
      (payload) => {
        const newMessage = payload.new as ChatMessage;
        
        // Validate requestId matches to prevent cross-room contamination
        if (newMessage.request_id !== requestId) {
          logger.warn('Message received for wrong room, ignoring', {
            expectedRequestId: requestId,
            receivedRequestId: newMessage.request_id,
            messageId: newMessage.id
          });
          return;
        }
        
        set((state) => {
          // Validate this is still the correct room
          const roomMessages = state.messages[requestId] || [];
          
          // Deduplicate - check if message already exists (by id or temp replacement)
          const messageExists = roomMessages.some(msg => 
            msg.id === newMessage.id || 
            (msg.temp && msg.message === newMessage.message && msg.sender_id === newMessage.sender_id)
          );
          
          if (messageExists) {
            logger.debug('Duplicate message ignored', { messageId: newMessage.id });
            return state;
          }

          // Add message and sort by created_at to handle race conditions
          const updatedMessages = [...roomMessages, { ...newMessage, delivered: true }]
            .sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );

          logger.info('New message received', { 
            requestId, 
            messageId: newMessage.id,
            senderId: newMessage.sender_id 
          });

          return {
            messages: {
              ...state.messages,
              [requestId]: updatedMessages,
            },
          };
        });
      }
    );

    // Subscribe and track presence
    channel.subscribe(async (status, err) => {
      if (status === 'SUBSCRIBED') {
        // Track presence
        await channel.track({
          online_at: new Date().toISOString(),
          user_id: user.id,
        });

        set((state) => ({
          connectionStatus: { ...state.connectionStatus, [requestId]: 'connected' },
        }));
        
        logger.info('Successfully subscribed to chat room', { requestId });
      } else if (status === 'CHANNEL_ERROR') {
        set((state) => ({
          connectionStatus: { ...state.connectionStatus, [requestId]: 'error' },
          error: 'Failed to connect to chat',
        }));
        
        logger.error('Channel subscription error', { requestId, error: err });
      } else if (status === 'TIMED_OUT') {
        set((state) => ({
          connectionStatus: { ...state.connectionStatus, [requestId]: 'error' },
          error: 'Connection timed out',
        }));
        
        logger.error('Channel subscription timed out', { requestId });
      }
    });

    // Store subscription
    set((state) => ({
      subscriptions: {
        ...state.subscriptions,
        [requestId]: channel,
      },
    }));
  },

  unsubscribeFromRoom: (requestId: string) => {
    const channel = get().subscriptions[requestId];
    if (channel) {
      supabase.removeChannel(channel);
      
      set((state) => {
        const newSubscriptions = { ...state.subscriptions };
        delete newSubscriptions[requestId];
        
        const newConnectionStatus = { ...state.connectionStatus };
        delete newConnectionStatus[requestId];
        
        return {
          subscriptions: newSubscriptions,
          connectionStatus: newConnectionStatus,
        };
      });
      
      logger.info('Unsubscribed from chat room', { requestId });
    }
  },

  setActiveRequest: (requestId: string | null) => {
    set({ activeRequestId: requestId });
  },

  clearError: () => {
    set({ error: null });
  },

  getOnlineUsers: (requestId: string) => {
    const presenceState = get().presence[requestId] || {};
    return Object.keys(presenceState);
  },

  retryFailedMessage: async (requestId: string, tempId: string) => {
    const state = get();
    const roomMessages = state.messages[requestId] || [];
    const failedMessage = roomMessages.find(msg => msg.id === tempId && msg.failed);
    
    if (!failedMessage) return;

    // Remove failed flag and retry
    set((state) => ({
      messages: {
        ...state.messages,
        [requestId]: roomMessages.map(msg => 
          msg.id === tempId 
            ? { ...msg, failed: false, delivered: false }
            : msg
        ),
      },
    }));

    await get().sendMessage(requestId, failedMessage.message);
  },
}));
