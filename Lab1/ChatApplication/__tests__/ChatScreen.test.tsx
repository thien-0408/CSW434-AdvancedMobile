import React from 'react';
import { FlatList, TextInput, TouchableOpacity } from 'react-native';
import Renderer, { act } from 'react-test-renderer';
import { io } from 'socket.io-client';
import ChatScreen from '../src/ChatScreen';

jest.mock('@react-navigation/elements', () => ({ useHeaderHeight: () => 56 }));
jest.mock('socket.io-client', () => ({ io: jest.fn() }));
let listeners: Record<string, (...args: any[]) => void>;
let socket: any;
beforeEach(() => {
  listeners = {};
  socket = {
    id: 'self',
    connected: true,
    on: jest.fn((event, callback) => {
      listeners[event] = callback;
    }),
    emit: jest.fn((event, _payload, callback) => {
      if (event === 'join') callback({ ok: true });
    }),
    connect: jest.fn(),
    disconnect: jest.fn(),
    removeAllListeners: jest.fn(),
  };
  (io as jest.Mock).mockReturnValue(socket);
});
async function mount() {
  let tree!: Renderer.ReactTestRenderer;
  await act(async () => {
    tree = Renderer.create(
      <ChatScreen route={{ params: { userName: 'nguyendinhthien' } }} />,
    );
  });
  await act(async () => listeners.connect());
  return tree;
}

test('joins with the display name and rejoins after reconnect', async () => {
  const tree = await mount();
  expect(socket.emit).toHaveBeenCalledWith(
    'join',
    { userName: 'nguyendinhthien' },
    expect.any(Function),
  );
  await act(async () => listeners.disconnect());
  expect(tree.root.findByType(TouchableOpacity).props.disabled).toBe(true);
  await act(async () => listeners.connect());
  expect(
    socket.emit.mock.calls.filter(([event]: [string]) => event === 'join'),
  ).toHaveLength(2);
  await act(async () => tree.unmount());
  expect(socket.removeAllListeners).toHaveBeenCalled();
  expect(socket.disconnect).toHaveBeenCalled();
});

test('blocks blank and disconnected sends; sends trimmed text when joined', async () => {
  const tree = await mount();
  const input = () => tree.root.findByType(TextInput);
  const send = () => tree.root.findByType(TouchableOpacity);
  await act(async () => send().props.onPress());
  expect(
    socket.emit.mock.calls.filter(
      ([event]: [string]) => event === 'sendMessage',
    ),
  ).toHaveLength(0);
  await act(async () => input().props.onChangeText('  Hello team  '));
  await act(async () => send().props.onPress());
  expect(socket.emit).toHaveBeenCalledWith('sendMessage', {
    text: 'Hello team',
  });
  expect(input().props.value).toBe('');
  await act(async () => listeners.disconnect());
  await act(async () => input().props.onChangeText('Do not send offline'));
  await act(async () => send().props.onPress());
  expect(
    socket.emit.mock.calls.filter(
      ([event]: [string]) => event === 'sendMessage',
    ),
  ).toHaveLength(1);
  await act(async () => tree.unmount());
});

test('updates the list on broadcast and distinguishes duplicate display names', async () => {
  const tree = await mount();
  const item = {
    sender: 'nguyendinhthien',
    text: 'Hello',
    time: '2026-10-27T03:00:00Z',
  };
  await act(async () => {
    listeners.receiveMessage({ ...item, id: '1', senderId: 'self' });
    listeners.receiveMessage({ ...item, id: '2', senderId: 'other' });
  });
  expect(
    tree.root.findByType(FlatList).props.data.map((entry: any) => entry.isMine),
  ).toEqual([true, false]);
  await act(async () => tree.unmount());
});
