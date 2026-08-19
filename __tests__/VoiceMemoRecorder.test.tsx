import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import VoiceMemoRecorder from '../components/shared/VoiceMemoRecorder';

jest.mock('react-native-nitro-sound', () => ({
  __esModule: true,
  default: (() => {
    const sound: any = {
      recordListener: null,
      addRecordBackListener: jest.fn((listener: any) => {
        sound.recordListener = listener;
      }),
      removeRecordBackListener: jest.fn(() => {
        sound.recordListener = null;
      }),
      removePlayBackListener: jest.fn(),
      removePlaybackEndListener: jest.fn(),
      startRecorder: jest.fn().mockResolvedValue('/tmp/memo.m4a'),
      stopRecorder: jest.fn().mockResolvedValue('/tmp/memo.m4a'),
      startPlayer: jest.fn().mockResolvedValue('/tmp/memo.m4a'),
      stopPlayer: jest.fn().mockResolvedValue(undefined),
      addPlaybackEndListener: jest.fn(),
    };
    return sound;
  })(),
}));

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

const mockSound = jest.requireMock('react-native-nitro-sound').default;

const labels = {
  add: 'إضافة تسجيل',
  recording: 'جاري التسجيل',
  play: 'تشغيل',
  stop: 'إيقاف',
  delete: 'حذف',
  permissionDenied: 'الإذن مطلوب',
  error: 'حدث خطأ',
};

describe('VoiceMemoRecorder', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-15T10:00:00Z'));
    jest.clearAllMocks();
    mockSound.recordListener = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('counts while recording and preserves the duration after stopping', async () => {
    const onChange = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <VoiceMemoRecorder labels={labels} onChange={onChange} />,
      );
    });

    await act(async () => {
      await renderer!.root.findAllByType(TouchableOpacity)[0].props.onPress();
    });

    expect(mockSound.recordListener).not.toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(1250);
    });

    expect(
      renderer!.root.findAllByType(Text).some(node => node.props.children === '00:01'),
    ).toBe(true);

    await act(async () => {
      mockSound.recordListener?.({ currentPosition: 2400 });
    });

    expect(
      renderer!.root.findAllByType(Text).some(node => node.props.children === '00:02'),
    ).toBe(true);

    await act(async () => {
      await renderer!.root.findAllByType(TouchableOpacity)[0].props.onPress();
    });

    expect(onChange).toHaveBeenCalledWith('/tmp/memo.m4a', 2400);

    await act(async () => {
      renderer!.update(
        <VoiceMemoRecorder
          labels={labels}
          audioUri="/tmp/memo.m4a"
          durationMs={2400}
          onChange={onChange}
        />,
      );
    });

    expect(
      renderer!.root.findAllByType(Text).some(node => node.props.children === '00:02'),
    ).toBe(true);

    await act(async () => {
      renderer!.unmount();
    });
  });
});
