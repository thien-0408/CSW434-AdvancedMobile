import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const USER_NAME_KEY = '@nguyendinhthien/chat/userName';

export default function HomeScreen({ navigation }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(USER_NAME_KEY)
      .then(savedName => {
        if (active && savedName) setName(savedName);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const handleStartChat = async () => {
    const userName = name.trim();
    if (!userName) {
      Alert.alert('Your Name', 'Please enter your name to start the chat.');
      return;
    }
    setSaving(true);
    try {
      await AsyncStorage.setItem(USER_NAME_KEY, userName);
      navigation.navigate('Chat', { userName });
    } catch {
      Alert.alert('Unable to save name', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.form}>
        <Text style={styles.title}>Your Name</Text>
        <Text style={styles.subtitle}>
          Please enter your name to start the chat.
        </Text>
        <Text style={styles.label}>Your Name</Text>
        <TextInput
          accessibilityLabel="Your Name"
          style={styles.input}
          placeholder="Enter display name"
          placeholderTextColor="#888888"
          value={name}
          onChangeText={setName}
          maxLength={40}
          editable={!loading && !saving}
          returnKeyType="go"
          onSubmitEditing={handleStartChat}
        />
        <TouchableOpacity
          accessibilityRole="button"
          disabled={loading || saving}
          style={styles.button}
          onPress={handleStartChat}
        >
          <Text style={styles.buttonText}>
            {saving ? 'Saving?' : 'Start Chat'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', backgroundColor: '#ffffff' },
  form: { paddingHorizontal: 20 },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#111111',
  },
  subtitle: {
    color: '#888888',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 36,
  },
  label: { color: '#258d82', fontWeight: 'bold', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#d4d4d4',
    borderRadius: 6,
    paddingHorizontal: 15,
    height: 54,
    fontSize: 16,
    color: '#111111',
  },
  button: {
    backgroundColor: '#258d82',
    padding: 17,
    borderRadius: 9,
    marginTop: 20,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
