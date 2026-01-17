import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ChatConversation } from '../components/chat/chat-conversation';
import { useAuthStore } from '../stores/auth';
import { useRequestsStore } from '../stores/requests';
import { ServiceRequest } from '../types';

export default function ChatConversationScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { activeRequests, requestHistory } = useRequestsStore();
  const [request, setRequest] = useState<ServiceRequest | undefined>();

  useEffect(() => {
    if (requestId) {
      // Find the request in active or history
      const foundRequest = 
        activeRequests.find(r => r.id === requestId) ||
        requestHistory.find(r => r.id === requestId);
      setRequest(foundRequest);
    }
  }, [requestId, activeRequests, requestHistory]);

  const handleRequestDetailsPress = () => {
    if (request) {
      router.push({
        pathname: '/request-details',
        params: { requestId: request.id },
      });
    }
  };

  if (!user || !requestId) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4169E1" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: request?.title || 'Chat',
          headerBackTitle: 'Back',
        }}
      />
      <View style={styles.container}>
        <ChatConversation
          requestId={requestId}
          currentUserId={user.id}
          request={request}
          onRequestDetailsPress={handleRequestDetailsPress}
        />
      </View>
    </>
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
    backgroundColor: '#f5f5f5',
  },
});
