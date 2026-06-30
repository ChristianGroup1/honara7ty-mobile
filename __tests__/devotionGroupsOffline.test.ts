jest.mock('../lib/networkStatus', () => ({
  isNetworkAvailable: jest.fn(),
}));

jest.mock('../lib/supbase', () => ({
  auth: {
    getSession: jest.fn(),
    refreshSession: jest.fn(),
  },
  rpc: jest.fn(),
  from: jest.fn(),
  functions: {
    invoke: jest.fn(),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { isNetworkAvailable } from '../lib/networkStatus';
import supabase from '../lib/supbase';
import {
  fetchGroupMembersWithDevotion,
  fetchMyDevotionGroups,
} from '../lib/devotionGroups';

const mockedNetwork = isNetworkAvailable as jest.MockedFunction<
  typeof isNetworkAvailable
>;
const mockedSupabase = supabase as any;

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  mockedSupabase.auth.getSession.mockResolvedValue({
    data: { session: { user: { id: 'user-1' } } },
  } as any);
});

test('devotion groups are cached and returned when offline', async () => {
  const group = {
    id: 'group-1',
    owner_id: 'user-1',
    name: 'مجموعة الخلوة',
    invite_code: 'ABC123',
    shared_reading_book: null,
    shared_selected_chapters: null,
    shared_target_days: null,
    created_at: '2026-06-01T00:00:00.000Z',
  };

  mockedNetwork.mockResolvedValueOnce(true);
  mockedSupabase.rpc.mockResolvedValueOnce({ data: [group], error: null } as any);

  await expect(fetchMyDevotionGroups()).resolves.toEqual({
    data: [group],
    error: null,
  });

  mockedSupabase.rpc.mockClear();
  mockedNetwork.mockResolvedValueOnce(false);

  await expect(fetchMyDevotionGroups()).resolves.toEqual({
    data: [group],
    error: null,
  });
  expect(mockedSupabase.rpc).not.toHaveBeenCalled();
});

test('group member devotion status is cached and returned when offline', async () => {
  const member = {
    group_id: 'group-1',
    user_id: 'member-1',
    role: 'member',
    display_name: 'عضو',
    joined_at: '2026-06-01T00:00:00.000Z',
    last_reminded_at: null,
  };
  const log = {
    user_id: 'member-1',
    date: '2026-06-27',
    completed: true,
    reading_book: 'سفر التكوين',
    reading_chapter: 1,
    chapters_read: 1,
    selected_chapters: [1],
    reading_entries: null,
  };

  const membersQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data: [member], error: null }),
  };
  const logsQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockResolvedValue({ data: [log], error: null }),
  };

  mockedSupabase.from.mockImplementation((table: string) =>
    table === 'devotion_group_members' ? membersQuery : logsQuery,
  );
  mockedNetwork.mockResolvedValueOnce(true);

  await expect(
    fetchGroupMembersWithDevotion({
      groupId: 'group-1',
      date: '2026-06-27',
    }),
  ).resolves.toEqual({
    data: [{ ...member, devotionLog: log }],
    error: null,
  });

  mockedSupabase.from.mockClear();
  mockedNetwork.mockResolvedValueOnce(false);

  await expect(
    fetchGroupMembersWithDevotion({
      groupId: 'group-1',
      date: '2026-06-27',
    }),
  ).resolves.toEqual({
    data: [{ ...member, devotionLog: log }],
    error: null,
  });
  expect(mockedSupabase.from).not.toHaveBeenCalled();
});
