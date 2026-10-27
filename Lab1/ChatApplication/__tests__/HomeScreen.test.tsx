import React from 'react';
import { Alert, TextInput, TouchableOpacity } from 'react-native';
import Renderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeScreen, { USER_NAME_KEY } from '../src/HomeScreen';

afterEach(() => jest.restoreAllMocks());
beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});
async function mount() {
  const navigation = { navigate: jest.fn() };
  let tree!: Renderer.ReactTestRenderer;
  await act(async () => {
    tree = Renderer.create(<HomeScreen navigation={navigation} />);
  });
  return { tree, navigation };
}

test('rejects a blank name without navigating', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const { tree, navigation } = await mount();
  await act(async () => {
    await tree.root.findByType(TouchableOpacity).props.onPress();
  });
  expect(alert).toHaveBeenCalled();
  expect(navigation.navigate).not.toHaveBeenCalled();
  await act(async () => tree.unmount());
});

test('persists a trimmed name before navigating to Chat', async () => {
  const { tree, navigation } = await mount();
  await act(async () => {
    tree.root.findByType(TextInput).props.onChangeText(' nguyendinhthien ');
  });
  await act(async () => {
    await tree.root.findByType(TouchableOpacity).props.onPress();
  });
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(
    USER_NAME_KEY,
    'nguyendinhthien',
  );
  expect(navigation.navigate).toHaveBeenCalledWith('Chat', {
    userName: 'nguyendinhthien',
  });
  await act(async () => tree.unmount());
});

test('restores the name saved on the device', async () => {
  await AsyncStorage.setItem(USER_NAME_KEY, 'nguyendinhthien');
  const { tree } = await mount();
  expect(tree.root.findByType(TextInput).props.value).toBe('nguyendinhthien');
  await act(async () => tree.unmount());
});

test('reports a storage failure and keeps the user on Home', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const { tree, navigation } = await mount();
  await act(async () => {
    tree.root.findByType(TextInput).props.onChangeText('nguyendinhthien');
  });
  jest
    .spyOn(AsyncStorage, 'setItem')
    .mockRejectedValueOnce(new Error('disk full'));
  await act(async () => {
    await tree.root.findByType(TouchableOpacity).props.onPress();
  });
  expect(alert).toHaveBeenCalledWith(
    'Unable to save name',
    'Please try again.',
  );
  expect(navigation.navigate).not.toHaveBeenCalled();
  await act(async () => tree.unmount());
});
