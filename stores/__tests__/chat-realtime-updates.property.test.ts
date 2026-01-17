/**
 * Feature: homeheroes-frontend, Property 14: Real-time chat updates
 * Validates: Requirements 5.3
 * 
 * Property: For any new message received, the chat interface should update 
 * immediately and display a notification to the recipient
 */

import fc from 'fast-check';
import { realtime } from '../../services/supabase';
import { ChatMessage } from '../../types';
import { useChatStore } from '../chat';

// Mock the realtime module
jest.mock('../../services/supabase', () => ({
  database: {
    getChatMessages: jest.fn(),
    sendChatMessage: jest.fn(),
  },
  realtime: {
    subscribeToChatMessages: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

describe('Property 14: Real-time chat updates', () => {
  let mockSubscriptionCallback: ((payload: any) => void) | null = null;

  beforeEach(() => {
    // Reset store state
    useChatStore.setState({
      messages: {},
      isLoading: false,
      error: null,
      activeRequestId: null,
    });

    // Clear all mocks first
    jest.clearAllMocks();

    // Capture the subscription callback
    mockSubscriptionCallback = null;
    (realtime.subscribeToChatMessages as jest.Mock).mockImplementation(
      (requestId: string, callback: (payload: any) => void) => {
        mockSubscriptionCallback = callback;
        return { subscribe: jest.fn() };
      }
    );
  });

  afterEach(() => {
    // Clean up subscriptions
    useChatStore.getState().unsubscribeFromMessages();
    mockSubscriptionCallback = null;
  });

  it('should immediately update chat interface when new message is received', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random request ID
        fc.uuid(),
        // Generate random sender ID
        fc.uuid(),
        // Generate random message
        fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
        async (requestId, senderId, messageText) => {
          // Subscribe to messages
          useChatStore.getState().subscribeToMessages(requestId);

          // Verify subscription was set up
          expect(realtime.subscribeToChatMessages).toHaveBeenCalledWith(
            requestId,
            expect.any(Function)
          );

          // Get initial message count
          const initialMessages = useChatStore.getState().messages[requestId] || [];
          const initialCount = initialMessages.length;

          // Simulate receiving a new message via real-time subscription
          const newMessage: ChatMessage = {
            id: `msg_${Date.now()}`,
            request_id: requestId,
            sender_id: senderId,
            message: messageText.trim(),
            created_at: new Date().toISOString(),
          };

          // Trigger the subscription callback
          if (mockSubscriptionCallback) {
            mockSubscriptionCallback({
              eventType: 'INSERT',
              new: newMessage,
            });
          }

          // Property: Chat interface updates immediately
          const updatedMessages = useChatStore.getState().messages[requestId];
          expect(updatedMessages).toBeDefined();
          expect(updatedMessages.length).toBe(initialCount + 1);

          // Property: New message appears in the message list
          const receivedMessage = updatedMessages[updatedMessages.length - 1];
          expect(receivedMessage.id).toBe(newMessage.id);
          expect(receivedMessage.message).toBe(messageText.trim());
          expect(receivedMessage.sender_id).toBe(senderId);
          expect(receivedMessage.created_at).toBe(newMessage.created_at);

          // Property: Message is marked as delivered
          expect(receivedMessage.delivered).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle multiple real-time messages in sequence', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.array(
          fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
          { minLength: 2, maxLength: 5 }
        ),
        async (requestId, senderId, messages) => {
          // Reset state for this property run
          useChatStore.setState({ messages: {} });
          
          // Subscribe to messages
          useChatStore.getState().subscribeToMessages(requestId);

          // Send multiple messages via real-time
          for (let i = 0; i < messages.length; i++) {
            const newMessage: ChatMessage = {
              id: `msg_${Date.now()}_${Math.random()}_${i}`,
              request_id: requestId,
              sender_id: senderId,
              message: messages[i].trim(),
              created_at: new Date(Date.now() + i * 1000).toISOString(),
            };

            if (mockSubscriptionCallback) {
              mockSubscriptionCallback({
                eventType: 'INSERT',
                new: newMessage,
              });
            }
          }

          // Property: All messages are received and in order
          const storeMessages = useChatStore.getState().messages[requestId];
          expect(storeMessages).toBeDefined();
          expect(storeMessages.length).toBe(messages.length);

          for (let i = 0; i < messages.length; i++) {
            expect(storeMessages[i].message).toBe(messages[i].trim());
            expect(storeMessages[i].sender_id).toBe(senderId);
          }
        }
      ),
      { numRuns: 50 }
    );
  }, 10000);

  it('should prevent duplicate messages from being added', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
        async (requestId, senderId, messageText) => {
          // Subscribe to messages
          useChatStore.getState().subscribeToMessages(requestId);

          const messageId = `msg_${Date.now()}`;
          const newMessage: ChatMessage = {
            id: messageId,
            request_id: requestId,
            sender_id: senderId,
            message: messageText.trim(),
            created_at: new Date().toISOString(),
          };

          // Send the same message twice (simulating duplicate real-time events)
          if (mockSubscriptionCallback) {
            mockSubscriptionCallback({
              eventType: 'INSERT',
              new: newMessage,
            });

            mockSubscriptionCallback({
              eventType: 'INSERT',
              new: newMessage,
            });
          }

          // Property: Message appears only once
          const storeMessages = useChatStore.getState().messages[requestId];
          expect(storeMessages).toBeDefined();
          expect(storeMessages.length).toBe(1);
          expect(storeMessages[0].id).toBe(messageId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle messages from different senders', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(fc.uuid(), { minLength: 2, maxLength: 3 }),
        fc.array(
          fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
          { minLength: 2, maxLength: 3 }
        ),
        async (requestId, senderIds, messages) => {
          // Reset state for this property run
          useChatStore.setState({ messages: {} });
          
          // Subscribe to messages
          useChatStore.getState().subscribeToMessages(requestId);

          // Send messages from different senders
          for (let i = 0; i < messages.length; i++) {
            const senderId = senderIds[i % senderIds.length];
            const newMessage: ChatMessage = {
              id: `msg_${Date.now()}_${Math.random()}_${i}`,
              request_id: requestId,
              sender_id: senderId,
              message: messages[i].trim(),
              created_at: new Date(Date.now() + i * 1000).toISOString(),
            };

            if (mockSubscriptionCallback) {
              mockSubscriptionCallback({
                eventType: 'INSERT',
                new: newMessage,
              });
            }
          }

          // Property: All messages are received with correct sender IDs
          const storeMessages = useChatStore.getState().messages[requestId];
          expect(storeMessages).toBeDefined();
          expect(storeMessages.length).toBe(messages.length);

          for (let i = 0; i < messages.length; i++) {
            const expectedSenderId = senderIds[i % senderIds.length];
            expect(storeMessages[i].sender_id).toBe(expectedSenderId);
            expect(storeMessages[i].message).toBe(messages[i].trim());
          }
        }
      ),
      { numRuns: 50 }
    );
  }, 10000);

  it('should properly unsubscribe when switching conversations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        async (requestId1, requestId2) => {
          // Clear mocks for this property run
          jest.clearAllMocks();
          
          // Subscribe to first conversation
          useChatStore.getState().subscribeToMessages(requestId1);
          const firstCallCount = (realtime.subscribeToChatMessages as jest.Mock).mock.calls.length;
          expect(firstCallCount).toBe(1);

          // Subscribe to second conversation (should unsubscribe from first)
          useChatStore.getState().subscribeToMessages(requestId2);
          
          // Property: Unsubscribe is called when switching conversations
          expect(realtime.unsubscribe).toHaveBeenCalled();
          
          // Property: New subscription is created
          const secondCallCount = (realtime.subscribeToChatMessages as jest.Mock).mock.calls.length;
          expect(secondCallCount).toBe(2);
          expect(realtime.subscribeToChatMessages).toHaveBeenLastCalledWith(
            requestId2,
            expect.any(Function)
          );
        }
      ),
      { numRuns: 50 }
    );
  });
});
