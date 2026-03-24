jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => () => null);

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children }: any) => <View>{children}</View>,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('../components/shared/CustomAlert', () => () => null);

jest.mock('../lib/supbase', () => ({
  auth: {
    getSession: jest.fn(async () => ({ data: { session: null } })),
  },
  from: jest.fn(() => ({
    upsert: jest.fn(async () => ({ error: null })),
  })),
}));

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import BibleReaderScreen from '../components/bible-reader/BibleReaderScreen';
import { BIBLE_BOOKS } from '../components/data/bibleMetadata';

const navigation = {
  goBack: jest.fn(),
};

test('bible reader opens a local chapter and renders its verses', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <BibleReaderScreen navigation={navigation} />,
    );
  });

  const bookButton = renderer!.root.findByProps({ testID: 'book-1' });
  await ReactTestRenderer.act(async () => {
    bookButton.props.onPress();
  });

  const chapterButton = renderer!.root.findByProps({ testID: 'chapter-1' });
  await ReactTestRenderer.act(async () => {
    chapterButton.props.onPress();
  });

  const firstVerse = BIBLE_BOOKS[0].chaptersData[0].verses[0].text;
  expect(renderer!.root.findByProps({ children: firstVerse })).toBeTruthy();
});
