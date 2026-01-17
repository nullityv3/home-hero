import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useChatStore } from '../../stores/chat';
import { ChatMessage, ServiceRequest } from '../../types';
import { StatusIndicator } from './status-indicator';

interface ChatConversationProps {
  requestId: string;
  currentUserId: string;
  request?: ServiceRequest;
  onRequestDetailsPress?: () => void;
}

export function ChatConversation({
  requestId,
  currentUserId,
  request,
  onRequestDetailsPress,
}: ChatConversationProps) {
  const [messageText, setMessageText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const { user } = useAuthStore();
  
  const {
    messages,
    presence,
    connectionStatus,
    isLoading,
    error,
    loadMessages,
    sendMessage,
    subscribeToRoom,
    unsubscribeFromRoom,
    clearError,
    getOnlineUsers,
    retryFailedMessage,
  } = useChatStore();

  const conversationMessages = messages[requestId] || [];
  const roomConnectionStatus = connectionStatus[requestId] || 'disconnected';
  const onlineUsers = getOnlineUsers(requestId);

  // ✅ SECURITY: Verify authentication matches
  useEffect(() => {
    if (!user?.id || user.id !== currentUserId) {
      logger.error('Authentication mismatch in chat', { 
        userId: user?.id, 
        currentUserId 
      });
    }
  }, [user?.id, currentUserId]);

  // ✅ SECURITY: Verify user has access to this request
  useEffect(() => {
    if (request && currentUserId !== request.civilian_id && currentUserId !== request.hero_id) {
      logger.error('Unauthorized chat access attempt', { 
        requestId, 
        userId: currentUserId,
        civilianId: request.civilian_id,
        heroId: request.hero_id
      });
    }
  }, [request, currentUserId, requestId]);

  // ✅ SUBSCRIPTION MANAGEMENT: Subscribe on mount, cleanup on unmount
  useEffect(() => {
    // Load initial messages
    loadMessages(requestId);
    
    // Subscribe to realtime updates with presence
    subscribeToRoom(requestId);

    // ✅ CLEANUP: Unsubscribe when component unmounts or requestId changes
    return () => {
      unsubscribeFromRoom(requestId);
    };
  }, [requestId]); // Only re-run when requestId changes

  // ✅ AUTO-SCROLL: Scroll to bottom when new messages arrive
  useEffect(() => {
    if (conversationMessages.length > 0) {
      const timeoutId = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
      // ✅ CLEANUP: Clear timeout on unmount
      return () => clearTimeout(timeoutId);
    }
  }, [conversationMessages.length]);

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    // ✅ SECURITY: Sanitize input before sending
    const sanitizedText = sanitizeInput(messageText.trim());
    setMessageText(''); // Clear input immediately for better UX

    try {
      await sendMessage(requestId, sanitizedText);
    } catch (error) {
      // Error is handled in store, message will show as failed
      logger.error('Failed to send message', { requestId, error });
    }
  };

  const handleRetryMessage = async (message: ChatMessage) => {
    if (message.temp && message.failed) {
      try {
        await retryFailedMessage(requestId, message.id);
      } catch (error) {
        // Error handled in store
      }
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwnMessage = item.sender_id === currentUserId;
    const messageTime = new Date(item.created_at).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <TouchableOpacity
        style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
          item.temp && styles.tempMessage,
          item.failed && styles.failedMessage,
        ]}
        onPress={() => handleRetryMessage(item)}
        disabled={!item.failed}
        activeOpacity={item.failed ? 0.7 : 1}
      >
        <Text 
          style={[
            styles.messageText,
            isOwnMessage && { color: '#fff' },
            item.failed && { color: '#ffcccc' }
          ]}
        >
          {item.message}
        </Text>
        <View style={styles.messageFooter}>
          <Text 
            style={[
              styles.messageTime,
              isOwnMessage && { color: 'rgba(255, 255, 255, 0.8)' },
              item.failed && { color: '#ffcccc' }
            ]}
          >
            {messageTime}
          </Text>
          {isOwnMessage && (
            <Text style={styles.deliveryStatus}>
              {item.failed ? '✗ Failed (tap to retry)' : item.temp ? '○' : item.delivered ? '✓✓' : '✓'}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ✅ CONNECTION STATUS: Show connection indicator
  const renderConnectionStatus = () => {
    if (roomConnectionStatus === 'connecting') {
      return (
        <View style={styles.connectionBanner}>
          <ActivityIndicator size="small" color="#4169E1" />
          <Text style={styles.connectionText}>Connecting...</Text>
        </View>
      );
    }
    
    if (roomConnectionStatus === 'error') {
      return (
        <View style={[styles.connectionBanner, styles.connectionError]}>
          <Text style={styles.connectionErrorText}>⚠ Connection error</Text>
        </View>
      );
    }

    // Show online users count when connected
    if (roomConnectionStatus === 'connected' && onlineUsers.length > 1) {
      return (
        <View style={styles.presenceBanner}>
          <View style={styles.onlineIndicator} />
          <Text style={styles.presenceText}>
            {onlineUsers.length} online
          </Text>
        </View>
      );
    }

    return null;
  };

  if (isLoading && conversationMessages.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4169E1" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {request && (
        <>
          <TouchableOpacity
            style={styles.requestHeader}
            onPress={onRequestDetailsPress}
          >
            <View style={styles.requestInfo}>
              <Text style={styles.requestTitle}>{request.title}</Text>
              <Text style={styles.requestStatus}>Status: {request.status}</Text>
            </View>
            <Text style={styles.viewDetailsText}>View Details →</Text>
          </TouchableOpacity>
          {(request.status === 'completed' || request.status === 'cancelled') && (
            <View style={styles.statusBanner}>
              <StatusIndicator status={request.status} />
              <Text style={styles.statusBannerText}>
                {request.status === 'completed'
                  ? 'This request has been completed. Chat history is preserved for your records.'
                  : 'This request has been cancelled. Chat history is preserved for your records.'}
              </Text>
            </View>
          )}
        </>
      )}

      {renderConnectionStatus()}

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={clearError}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={conversationMessages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start the conversation!</Text>
          </View>
        }
      />

      {request && (request.status === 'completed' || request.status === 'cancelled') ? (
        <View style={styles.disabledInputContainer}>
          <Text style={styles.disabledInputText}>
            Messaging is disabled for {request.status} requests
          </Text>
        </View>
      ) : (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            multiline
            maxLength={1000}
            accessibilityLabel="Message input"
            accessibilityHint="Type your message here"
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !messageText.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!messageText.trim()}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityHint="Sends your message to the chat"
            accessibilityState={{ disabled: !messageText.trim() }}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestHeader: {
    backgroundColor: '#fff',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  requestInfo: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  requestStatus: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#4169E1',
    fontWeight: '600',
  },
  statusBanner: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statusBannerText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  connectionBanner: {
    backgroundColor: '#e3f2fd',
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  connectionError: {
    backgroundColor: '#ffebee',
  },
  connectionText: {
    fontSize: 13,
    color: '#1976d2',
  },
  connectionErrorText: {
    fontSize: 13,
    color: '#c62828',
    fontWeight: '600',
  },
  presenceBanner: {
    backgroundColor: '#e8f5e9',
    padding: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4caf50',
  },
  presenceText: {
    fontSize: 12,
    color: '#2e7d32',
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#ffebee',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    flex: 1,
    color: '#c62828',
    fontSize: 14,
  },
  dismissText: {
    color: '#c62828',
    fontWeight: '600',
    fontSize: 14,
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#4169E1',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
  },
  tempMessage: {
    opacity: 0.7,
  },
  failedMessage: {
    backgroundColor: '#c62828',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
  },
  deliveryStatus: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#4169E1',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledInputContainer: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  disabledInputText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
});
