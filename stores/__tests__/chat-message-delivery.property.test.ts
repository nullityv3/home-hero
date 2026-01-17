/**
 * Feature: homeheroes-frontend, Property 13: Chat message delivery and display
 * Validates: Requirements 5.2
 * 
 * Property: For any message sent in the chat interface, the message should be 
 * delivered to the recipient with correct timestamp and sender identification
 */

import fc from 'fast-check';
import { database } from '../../services/supabase';
import { useChatStore } from '../chat';

// Mock the database module
jest.mock('../../services/supabase', () => ({
  database: {
    getChatMessages: jest.fn(),
    sendChatMessage: jest.fn(),
  },
  realtime: {
    subscribeToChatMessages: jest.fn(() => ({
      subscribe: jest.fn(),
    })),
    unsubscribe: jest.fn(),
  },
}));

describe('Property 13: Chat message delivery and display', () => {
  beforeEach(() => {
    // Reset store state
    useChatStore.setState({
      messages: {},
      isLoading: false,
      error: null,
      activeRequestId: null,
    });
    jest.clearAllMocks();
  });

  it('should deliver messages with correct timestamp and sender identification', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random request ID
        fc.uuid(),
        // Generate random sender ID
        fc.uuid(),
        // Generate random message text (non-empty)
        fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
        async (requestId, senderId, messageText) => {
          // Mock successful message send
          const mockTimestamp = new Date().toISOString();
          const mockMessageId = `msg_${Date.now()}_${Math.random()}`;
          
          const mockSentMessage = {
            id: mockMessageId,
            request_id: requestId,
            sender_id: senderId,
            message: messageText.trim(),
            created_at: mockTimestamp,
            delivered: true,
          };

          (database.sendChatMessage as jest.Mock).mockResolvedValueOnce({
            data: mockSentMessage,
            error: null,
          });

          // Send the message
          await useChatStore.getState().sendMessage(requestId, senderId, messageText);

          // Verify the message was sent to the database
          expect(database.sendChatMessage).toHaveBeenCalledWith({
            request_id: requestId,
            sender_id: senderId,
            message: messageText.trim(),
          });

          // Verify the message appears in the store with correct properties
          const storeMessages = useChatStore.getState().messages[requestId];
          expect(storeMessages).toBeDefined();
          expect(storeMessages.length).toBeGreaterThan(0);

          const deliveredMessage = storeMessages[storeMessages.length - 1];
          
          // Property: Message has correct sender identification
          expect(deliveredMessage.sender_id).toBe(senderId);
          
          // Property: Message has correct content
          expect(deliveredMessage.message).toBe(messageText.trim());
          
          // Property: Message has a timestamp
          expect(deliveredMessage.created_at).toBeDefined();
          expect(deliveredMessage.created_at).toBe(mockTimestamp);
          
          // Property: Message has delivery confirmation
          expect(deliveredMessage.delivered).toBe(true);
          
          // Property: Message has unique ID
          expect(deliveredMessage.id).toBeDefined();
          expect(deliveredMessage.id).toBe(mockMessageId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve message order and timestamps for multiple messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random request ID
        fc.uuid(),
        // Generate random sender ID
        fc.uuid(),
        // Generate array of messages (2-10 messages)
        fc.array(
          fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
          { minLength: 2, maxLength: 10 }
        ),
        async (requestId, senderId, messages) => {
          const sentMessages = [];

          // Send multiple messages
          for (let i = 0; i < messages.length; i++) {
            const mockTimestamp = new Date(Date.now() + i * 1000).toISOString();
            const mockMessageId = `msg_${Date.now()}_${i}`;
            
            const mockSentMessage = {
              id: mockMessageId,
              request_id: requestId,
              sender_id: senderId,
              message: messages[i].trim(),
              created_at: mockTimestamp,
              delivered: true,
            };

            sentMessages.push(mockSentMessage);

            (database.sendChatMessage as jest.Mock).mockResolvedValueOnce({
              data: mockSentMessage,
              error: null,
            });

            await useChatStore.getState().sendMessage(requestId, senderId, messages[i]);
          }

          // Verify all messages are in the store
          const storeMessages = useChatStore.getState().messages[requestId];
          expect(storeMessages).toBeDefined();
          expect(storeMessages.length).toBe(messages.length);

          // Property: Messages maintain order
          for (let i = 0; i < messages.length; i++) {
            expect(storeMessages[i].message).toBe(messages[i].trim());
            expect(storeMessages[i].sender_id).toBe(senderId);
          }

          // Property: Timestamps are in chronological order
          for (let i = 1; i < storeMessages.length; i++) {
            const prevTime = new Date(storeMessages[i - 1].created_at).getTime();
            const currTime = new Date(storeMessages[i].created_at).getTime();
            expect(currTime).toBeGreaterThanOrEqual(prevTime);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle message delivery errors gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
        async (requestId, senderId, messageText) => {
          // Mock failed message send
          const mockError = new Error('Network error');
          (database.sendChatMessage as jest.Mock).mockResolvedValueOnce({
            data: null,
            error: mockError,
          });

          // Attempt to send the message
          await expect(
            useChatStore.getState().sendMessage(requestId, senderId, messageText)
          ).rejects.toThrow();

          // Property: Error is captured in store
          const error = useChatStore.getState().error;
          expect(error).toBeDefined();
          expect(error).toBe(mockError.message);

          // Property: Failed message is not added to store
          const storeMessages = useChatStore.getState().messages[requestId];
          expect(storeMessages).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});
