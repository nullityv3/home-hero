Full Frontend Implementation Plan for Kiro
1. Chat Store (chat.ts)

Goals:

Manage per-room subscriptions

Handle optimistic updates & deduplication

Maintain connection & presence status

Key Updates:

import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface ChatMessage {
  id: string;
  request_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  delivered?: boolean;
  temp?: boolean; // for optimistic messages
}

interface ChatState {
  messages: Record<string, ChatMessage[]>; // key = request_id
  presence: Record<string, Record<string, boolean>>; // room -> user_id -> online
  subscriptions: Record<string, any>; // room_id -> channel
  sendMessage: (request_id: string, text: string) => Promise<void>;
  subscribeToRoom: (request_id: string) => void;
  unsubscribeFromRoom: (request_id: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: {},
  presence: {},
  subscriptions: {},

  sendMessage: async (request_id, text) => {
    const tempId = crypto.randomUUID();
    const userId = supabase.auth.user()?.id;

    // Optimistic update
    set(state => {
      const roomMsgs = state.messages[request_id] || [];
      return {
        messages: {
          ...state.messages,
          [request_id]: [
            ...roomMsgs,
            { id: tempId, request_id, sender_id: userId!, message: text, created_at: new Date().toISOString(), temp: true },
          ],
        },
      };
    });

    // Insert into DB
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([{ request_id, sender_id: userId, message: text }])
      .select()
      .single();

    if (error) {
      console.error('Send failed', error);
      // Optional: mark temp message as failed
      return;
    }

    // Replace temp message with real message
    set(state => {
      const roomMsgs = state.messages[request_id] || [];
      return {
        messages: {
          ...state.messages,
          [request_id]: roomMsgs.map(msg => (msg.id === tempId ? data : msg)),
        },
      };
    });
  },

  subscribeToRoom: (request_id) => {
    // Unsubscribe from old
    const oldChannel = get().subscriptions[request_id];
    if (oldChannel) oldChannel.unsubscribe();

    const channel = supabase.channel(`room:${request_id}:messages`, { config: { presence: true } });

    channel.on('presence', { event: 'sync' }, (pres) => {
      const state = pres.state;
      set(s => ({ presence: { ...s.presence, [request_id]: state } }));
    });

    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages', filter: `request_id=eq.${request_id}` }, payload => {
      set(state => {
        const roomMsgs = state.messages[request_id] || [];
        if (roomMsgs.some(m => m.id === payload.new.id)) return state; // dedupe
        return {
          messages: { ...state.messages, [request_id]: [...roomMsgs, payload.new].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) },
        };
      });
    });

    channel.subscribe();

    set(state => ({ subscriptions: { ...state.subscriptions, [request_id]: channel } }));
  },

  unsubscribeFromRoom: (request_id) => {
    const channel = get().subscriptions[request_id];
    if (channel) {
      channel.unsubscribe();
      set(state => {
        const newSubs = { ...state.subscriptions };
        delete newSubs[request_id];
        return { subscriptions: newSubs };
      });
    }
  },
}));

2. Chat Component (ChatConversation.tsx)

Goals:

Subscribe/unsubscribe automatically

Display messages & presence

Handle optimistic updates

import React, { useEffect, useRef } from 'react';
import { useChatStore } from '../stores/chat';
import { supabase } from '../lib/supabase';

interface Props { requestId: string; }

export const ChatConversation: React.FC<Props> = ({ requestId }) => {
  const { messages, subscribeToRoom, unsubscribeFromRoom, sendMessage, presence } = useChatStore();
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    subscribeToRoom(requestId);
    return () => unsubscribeFromRoom(requestId);
  }, [requestId]);

  const roomMessages = messages[requestId] || [];
  const roomPresence = presence[requestId] || {};

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [roomMessages]);

  return (
    <div className="chat-container">
      <div className="messages">
        {roomMessages.map(msg => (
          <div key={msg.id} className={`message ${msg.temp ? 'temp' : ''}`}>
            <span>{msg.sender_id}: </span>
            <span>{msg.message}</span>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      <div className="presence">
        Online: {Object.keys(roomPresence).filter(uid => roomPresence[uid]).join(', ')}
      </div>
      <MessageInput onSend={text => sendMessage(requestId, text)} />
    </div>
  );
};

const MessageInput: React.FC<{ onSend: (text: string) => void }> = ({ onSend }) => {
  const [text, setText] = React.useState('');
  return (
    <div className="input-row">
      <input value={text} onChange={e => setText(e.target.value)} />
      <button onClick={() => { onSend(text); setText(''); }}>Send</button>
    </div>
  );
};

3. Presence Management

Handled in the store via Supabase presence API.

Automatically updates presence in state when users join/leave room.

4. Optimistic Updates & Deduplication

Temp messages shown immediately

Replaced with server message once insert confirmed

Deduplication via id prevents double rendering

5. Subscription Safety

Component-scoped subscriptions

Auto cleanup on unmount

Avoids global variables and stale closures

6. Error Handling & Retry

Logs network errors

Optional: mark temp messages as failed

Can implement exponential backoff for retries

✅ Outcome

True per-room subscriptions

Presence indicators

Optimistic updates & deduplication

Message ordering enforced

Safe cleanup & memory management

Fully compatible with the new backend architecture and RLS policies

