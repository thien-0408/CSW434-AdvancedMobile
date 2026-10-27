import { Platform } from 'react-native';

// Android emulator: 10.0.2.2 reaches the host computer.
// Physical device: use the computer's LAN IP on the same Wi-Fi instead.
export const SERVER_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
