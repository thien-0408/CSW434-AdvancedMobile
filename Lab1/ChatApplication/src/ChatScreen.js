import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';
import { SERVER_URL } from './config';

function initials(name) {
  return name
    .trim()
    .split(/\s+/)
    .map(word => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
export default function ChatScreen({ route }) {
  const userName = route.params.userName;
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState('Connecting?');
  const socketRef = useRef(null);
  const listRef = useRef(null);
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  useEffect(() => {
    const socket = io(SERVER_URL, { autoConnect: false });
    socketRef.current = socket;
    socket.on('connect', () => {
      // Rejoin on every connection, including reconnects after network loss.
      socket.emit('join', { userName }, result => {
        if (result?.ok) {
          setConnected(true);
          setStatus('');
        } else {
          setStatus(result?.error || 'Unable to join the group.');
        }
      });
    });
    socket.on('disconnect', () => {
      setConnected(false);
      setStatus('Disconnected. Reconnecting?');
    });
    socket.on('connect_error', () => {
      setConnected(false);
      setStatus('Cannot reach the server. Check your connection.');
    });
    socket.on('receiveMessage', item => {
      setMessages(previous => [
        ...previous,
        { ...item, isMine: item.senderId === socket.id },
      ]);
    });
    socket.connect();
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userName]);
  const handleSendMessage = () => {
    const text = message.trim();
    if (!text || !connected || !socketRef.current?.connected) return;
    socketRef.current.emit('sendMessage', { text });
    setMessage('');
  };
  const renderItem = ({ item }) => (
    <View style={[styles.row, item.isMine && styles.myRow]}>
      <View
        accessibilityLabel={`${item.sender} avatar`}
        style={[styles.avatar, item.isMine && styles.myAvatar]}
      >
        <Text style={styles.initials}>{initials(item.sender)}</Text>
      </View>
      <View style={[styles.bubble, item.isMine && styles.myBubble]}>
        {!item.isMine && <Text style={styles.sender}>{item.sender}</Text>}
        <Text style={[styles.messageText, item.isMine && styles.myText]}>
          {item.text}
        </Text>
        <Text style={[styles.time, item.isMine && styles.myTime]}>
          {new Date(item.time).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </View>
  );
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      {!!status && (
        <Text accessibilityRole="alert" style={styles.status}>
          {status}
        </Text>
      )}
      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() =>
          listRef.current?.scrollToEnd({ animated: true })
        }
        onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
      />
      <View
        style={[
          styles.composer,
          { paddingBottom: Math.max(insets.bottom, 10) },
        ]}
      >
        <TextInput
          accessibilityLabel="Message"
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#999999"
          value={message}
          onChangeText={setMessage}
          maxLength={2000}
          returnKeyType="send"
          onSubmitEditing={handleSendMessage}
        />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Send"
          disabled={!connected || !message.trim()}
          style={[
            styles.sendButton,
            (!connected || !message.trim()) && styles.disabled,
          ]}
          onPress={handleSendMessage}
        >
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  status: { padding: 8, color: '#555555', textAlign: 'center', fontSize: 12 },
  list: { paddingHorizontal: 12, paddingVertical: 16 },
  row: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 18 },
  myRow: { flexDirection: 'row-reverse' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#646b87',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  myAvatar: { backgroundColor: '#258d82' },
  initials: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  bubble: {
    maxWidth: '75%',
    backgroundColor: '#e8e8ee',
    padding: 14,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  myBubble: {
    backgroundColor: '#258d82',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
  },
  sender: { fontSize: 12, color: '#444444', marginBottom: 5 },
  messageText: { fontSize: 16, color: '#111111' },
  myText: { color: '#ffffff' },
  time: { fontSize: 10, color: '#777777', textAlign: 'right', marginTop: 7 },
  myTime: { color: '#d5eeeb' },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#ffffff',
  },
  input: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 24,
    paddingHorizontal: 15,
    color: '#111111',
  },
  sendButton: {
    backgroundColor: '#258d82',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginLeft: 10,
  },
  disabled: { opacity: 0.5 },
  sendText: { color: '#ffffff', fontWeight: 'bold' },
});
