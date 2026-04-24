import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import supabase from './supbase';
import { PrayerNote } from '../components/prayer-notes/types';
import { Reflection } from '../components/spiritual-reflection/types';
import { DevotionDayLog } from '../components/devotion-calendar/types';
import { syncReadingLogForDate } from './readingLog';
import { encryptContent, decryptContent } from './crypto';

const OFFLINE_QUEUE_KEY = 'offline_sync_queue_v1';
const LOCAL_ID_PREFIX = 'local-';

const prayerNotesKey = (userId: string) => `offline_prayer_notes:${userId}`;
const reflectionsKey = (userId: string) => `offline_reflections:${userId}`;
const devotionLogsKey = (userId: string) => `offline_devotion_logs:${userId}`;
const profileRecordKey = (userId: string) => `offline_profile_record:${userId}`;

export type ProfileRecord = {
  church?: string | null;
  sect?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  devotion_time?: string | null;
  reading_book?: string | null;
  reading_chapter?: number | null;
  daily_chapters_target?: number | null;
  selected_chapters?: number[] | null;
  updated_at?: string | null;
};

type OfflineMutation =
  | {
      id: string;
      kind: 'prayer-note-upsert';
      userId: string;
      note: PrayerNote;
    }
  | {
      id: string;
      kind: 'prayer-note-delete';
      userId: string;
      noteId: string;
    }
  | {
      id: string;
      kind: 'reflection-upsert';
      userId: string;
      reflection: Reflection;
    }
  | {
      id: string;
      kind: 'reflection-delete';
      userId: string;
      reflectionId: string;
    }
  | {
      id: string;
      kind: 'devotion-log-upsert';
      userId: string;
      date: string;
      payload: DevotionDayLog;
    }
  | {
      id: string;
      kind: 'profile-upsert';
      userId: string;
      profile: ProfileRecord;
    }
  | {
      id: string;
      kind: 'auth-metadata-update';
      userId: string;
      metadata: Record<string, any>;
    };

type SyncResult = {
  synced: boolean;
};

let inFlightFlush: Promise<SyncResult> | null = null;

function nowIso() {
  return new Date().toISOString();
}

function makeLocalId() {
  return `${LOCAL_ID_PREFIX}${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function isLocalId(id: string) {
  return id.startsWith(LOCAL_ID_PREFIX);
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

async function getQueue() {
  return readJson<OfflineMutation[]>(OFFLINE_QUEUE_KEY, []);
}

async function setQueue(queue: OfflineMutation[]) {
  await writeJson(OFFLINE_QUEUE_KEY, queue);
}

async function isNetworkAvailable() {
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

function sortPrayerNotes(notes: PrayerNote[]) {
  return [...notes].sort((left, right) =>
    right.created_at.localeCompare(left.created_at),
  );
}

function sortReflections(reflections: Reflection[]) {
  return [...reflections].sort((left, right) =>
    right.date.localeCompare(left.date) ||
    right.created_at.localeCompare(left.created_at),
  );
}

export async function getPrayerNotesCache(userId: string) {
  return readJson<PrayerNote[]>(prayerNotesKey(userId), []);
}

async function setPrayerNotesCache(userId: string, notes: PrayerNote[]) {
  await writeJson(prayerNotesKey(userId), sortPrayerNotes(notes));
}

export async function getReflectionsCache(userId: string) {
  return readJson<Reflection[]>(reflectionsKey(userId), []);
}

async function setReflectionsCache(userId: string, reflections: Reflection[]) {
  await writeJson(reflectionsKey(userId), sortReflections(reflections));
}

async function getDevotionLogsCache(userId: string) {
  return readJson<Record<string, DevotionDayLog>>(devotionLogsKey(userId), {});
}

async function setDevotionLogsCache(
  userId: string,
  logs: Record<string, DevotionDayLog>,
) {
  await writeJson(devotionLogsKey(userId), logs);
}

async function getProfileRecordCache(userId: string) {
  return readJson<ProfileRecord>(profileRecordKey(userId), {});
}

async function setProfileRecordCache(userId: string, profile: ProfileRecord) {
  await writeJson(profileRecordKey(userId), profile);
}

function replacePrayerNoteId(
  notes: PrayerNote[],
  oldId: string,
  nextNote: PrayerNote,
) {
  return notes.map(note => (note.id === oldId ? nextNote : note));
}

function replaceReflectionId(
  reflections: Reflection[],
  oldId: string,
  nextReflection: Reflection,
) {
  return reflections.map(reflection =>
    reflection.id === oldId ? nextReflection : reflection,
  );
}

async function enqueueMutation(nextMutation: OfflineMutation) {
  const queue = await getQueue();

  if (nextMutation.kind === 'prayer-note-upsert') {
    const filtered = queue.filter(
      mutation =>
        !(
          mutation.userId === nextMutation.userId &&
          ((mutation.kind === 'prayer-note-upsert' &&
            mutation.note.id === nextMutation.note.id) ||
            (mutation.kind === 'prayer-note-delete' &&
              mutation.noteId === nextMutation.note.id))
        ),
    );
    filtered.push(nextMutation);
    await setQueue(filtered);
    return;
  }

  if (nextMutation.kind === 'prayer-note-delete') {
    const filtered = queue.filter(
      mutation =>
        !(
          mutation.userId === nextMutation.userId &&
          ((mutation.kind === 'prayer-note-upsert' &&
            mutation.note.id === nextMutation.noteId) ||
            (mutation.kind === 'prayer-note-delete' &&
              mutation.noteId === nextMutation.noteId))
        ),
    );
    filtered.push(nextMutation);
    await setQueue(filtered);
    return;
  }

  if (nextMutation.kind === 'reflection-upsert') {
    const filtered = queue.filter(
      mutation =>
        !(
          mutation.userId === nextMutation.userId &&
          ((mutation.kind === 'reflection-upsert' &&
            mutation.reflection.id === nextMutation.reflection.id) ||
            (mutation.kind === 'reflection-delete' &&
              mutation.reflectionId === nextMutation.reflection.id))
        ),
    );
    filtered.push(nextMutation);
    await setQueue(filtered);
    return;
  }

  if (nextMutation.kind === 'reflection-delete') {
    const filtered = queue.filter(
      mutation =>
        !(
          mutation.userId === nextMutation.userId &&
          ((mutation.kind === 'reflection-upsert' &&
            mutation.reflection.id === nextMutation.reflectionId) ||
            (mutation.kind === 'reflection-delete' &&
              mutation.reflectionId === nextMutation.reflectionId))
        ),
    );
    filtered.push(nextMutation);
    await setQueue(filtered);
    return;
  }

  if (nextMutation.kind === 'profile-upsert') {
    const filtered = queue.filter(
      mutation =>
        !(
          mutation.kind === 'profile-upsert' &&
          mutation.userId === nextMutation.userId
        ),
    );
    filtered.push(nextMutation);
    await setQueue(filtered);
    return;
  }

  if (nextMutation.kind === 'auth-metadata-update') {
    const filtered = queue.filter(
      mutation =>
        !(
          mutation.kind === 'auth-metadata-update' &&
          mutation.userId === nextMutation.userId
        ),
    );
    filtered.push(nextMutation);
    await setQueue(filtered);
    return;
  }

  const filtered = queue.filter(
    mutation =>
      !(
        mutation.kind === 'devotion-log-upsert' &&
        mutation.userId === nextMutation.userId &&
        mutation.date === nextMutation.date
      ),
  );
  filtered.push(nextMutation);
  await setQueue(filtered);
}

async function dropMutation(mutationId: string) {
  const queue = await getQueue();
  await setQueue(queue.filter(mutation => mutation.id !== mutationId));
}

async function rewriteMutationEntityId(
  userId: string,
  kind: 'prayer-note-upsert' | 'prayer-note-delete' | 'reflection-upsert' | 'reflection-delete',
  oldId: string,
  newId: string,
) {
  const queue = await getQueue();
  const nextQueue = queue.map(mutation => {
    if (mutation.userId !== userId) {
      return mutation;
    }

    if (kind === 'prayer-note-upsert' && mutation.kind === 'prayer-note-upsert') {
      return mutation.note.id === oldId
        ? { ...mutation, note: { ...mutation.note, id: newId } }
        : mutation;
    }

    if (kind === 'prayer-note-delete' && mutation.kind === 'prayer-note-delete') {
      return mutation.noteId === oldId
        ? { ...mutation, noteId: newId }
        : mutation;
    }

    if (kind === 'reflection-upsert' && mutation.kind === 'reflection-upsert') {
      return mutation.reflection.id === oldId
        ? {
            ...mutation,
            reflection: { ...mutation.reflection, id: newId },
          }
        : mutation;
    }

    if (kind === 'reflection-delete' && mutation.kind === 'reflection-delete') {
      return mutation.reflectionId === oldId
        ? { ...mutation, reflectionId: newId }
        : mutation;
    }

    return mutation;
  });

  await setQueue(nextQueue);
}

function mapDevotionRows(
  rows: any[] | null | undefined,
): Record<string, DevotionDayLog> {
  const logsMap: Record<string, DevotionDayLog> = {};

  (rows ?? []).forEach(item => {
    logsMap[item.date as string] = {
      completed: Boolean(item.completed),
      reading_book: item.reading_book ?? null,
      reading_chapter: item.reading_chapter ?? null,
      chapters_read: item.chapters_read ?? null,
      selected_chapters: item.selected_chapters ?? null,
    };
  });

  return logsMap;
}

function mergeServerNote(
  serverRow: Record<string, unknown>,
  plainContent: string,
): PrayerNote {
  return { ...(serverRow as unknown as PrayerNote), content: plainContent };
}

function mergeServerReflection(
  serverRow: Record<string, unknown>,
  plainContent: string,
): Reflection {
  return { ...(serverRow as unknown as Reflection), content: plainContent };
}

async function flushPrayerNoteUpsert(mutation: Extract<OfflineMutation, { kind: 'prayer-note-upsert' }>) {
  if (isLocalId(mutation.note.id)) {
    const { data, error } = await supabase
      .from('prayer_notes')
      .insert({
        user_id: mutation.userId,
        content: encryptContent(mutation.note.content, mutation.userId),
        is_answered: mutation.note.is_answered,
      })
      .select('*')
      .single();

    if (error || !data) {
      return false;
    }

    const serverNote = mergeServerNote(data, mutation.note.content);
    const notes = await getPrayerNotesCache(mutation.userId);
    await setPrayerNotesCache(
      mutation.userId,
      replacePrayerNoteId(notes, mutation.note.id, serverNote),
    );
    await rewriteMutationEntityId(
      mutation.userId,
      'prayer-note-upsert',
      mutation.note.id,
      serverNote.id,
    );
    await rewriteMutationEntityId(
      mutation.userId,
      'prayer-note-delete',
      mutation.note.id,
      serverNote.id,
    );
    await dropMutation(mutation.id);
    return true;
  }

  const { error } = await supabase
    .from('prayer_notes')
    .update({
      content: encryptContent(mutation.note.content, mutation.userId),
      is_answered: mutation.note.is_answered,
    })
    .eq('id', mutation.note.id);

  if (error) {
    return false;
  }

  await dropMutation(mutation.id);
  return true;
}

async function flushPrayerNoteDelete(
  mutation: Extract<OfflineMutation, { kind: 'prayer-note-delete' }>,
) {
  const { error } = await supabase
    .from('prayer_notes')
    .delete()
    .eq('id', mutation.noteId);

  if (error) {
    return false;
  }

  await dropMutation(mutation.id);
  return true;
}

async function flushReflectionUpsert(
  mutation: Extract<OfflineMutation, { kind: 'reflection-upsert' }>,
) {
  if (isLocalId(mutation.reflection.id)) {
    const { data, error } = await supabase
      .from('reflections')
      .insert({
        user_id: mutation.userId,
        content: encryptContent(mutation.reflection.content, mutation.userId),
        date: mutation.reflection.date,
      })
      .select('*')
      .single();

    if (error || !data) {
      return false;
    }

    const serverReflection = mergeServerReflection(
      data,
      mutation.reflection.content,
    );
    const reflections = await getReflectionsCache(mutation.userId);
    await setReflectionsCache(
      mutation.userId,
      replaceReflectionId(
        reflections,
        mutation.reflection.id,
        serverReflection,
      ),
    );
    await rewriteMutationEntityId(
      mutation.userId,
      'reflection-upsert',
      mutation.reflection.id,
      serverReflection.id,
    );
    await rewriteMutationEntityId(
      mutation.userId,
      'reflection-delete',
      mutation.reflection.id,
      serverReflection.id,
    );
    await dropMutation(mutation.id);
    return true;
  }

  const { error } = await supabase
    .from('reflections')
    .update({
      content: encryptContent(mutation.reflection.content, mutation.userId),
      date: mutation.reflection.date,
    })
    .eq('id', mutation.reflection.id);

  if (error) {
    return false;
  }

  await dropMutation(mutation.id);
  return true;
}

async function flushReflectionDelete(
  mutation: Extract<OfflineMutation, { kind: 'reflection-delete' }>,
) {
  const { error } = await supabase
    .from('reflections')
    .delete()
    .eq('id', mutation.reflectionId);

  if (error) {
    return false;
  }

  await dropMutation(mutation.id);
  return true;
}

async function flushDevotionLogUpsert(
  mutation: Extract<OfflineMutation, { kind: 'devotion-log-upsert' }>,
) {
  const payload = {
    user_id: mutation.userId,
    date: mutation.date,
    completed: mutation.payload.completed,
    reading_book: mutation.payload.completed
      ? mutation.payload.reading_book ?? null
      : null,
    reading_chapter: mutation.payload.completed
      ? mutation.payload.reading_chapter ?? null
      : null,
    chapters_read: mutation.payload.completed
      ? mutation.payload.chapters_read ?? null
      : null,
    selected_chapters: mutation.payload.completed
      ? mutation.payload.selected_chapters ?? null
      : null,
  };

  const { error } = await supabase
    .from('devotion_log')
    .upsert(payload, { onConflict: 'user_id,date' });

  if (error) {
    return false;
  }

  const { error: readingLogError } = await syncReadingLogForDate({
    userId: mutation.userId,
    date: mutation.date,
    completed: mutation.payload.completed,
    readingBook: mutation.payload.completed
      ? mutation.payload.reading_book ?? null
      : null,
    selectedChapters: mutation.payload.completed
      ? mutation.payload.selected_chapters ?? []
      : [],
  });

  if (readingLogError) {
    return false;
  }

  await dropMutation(mutation.id);
  return true;
}

async function flushProfileUpsert(
  mutation: Extract<OfflineMutation, { kind: 'profile-upsert' }>,
) {
  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: mutation.userId,
        ...mutation.profile,
      },
      { onConflict: 'id' },
    );

  if (error) {
    return false;
  }

  await dropMutation(mutation.id);
  return true;
}

async function flushAuthMetadataUpdate(
  mutation: Extract<OfflineMutation, { kind: 'auth-metadata-update' }>,
) {
  const { error } = await supabase.auth.updateUser({
    data: mutation.metadata,
  });

  if (error) {
    return false;
  }

  await dropMutation(mutation.id);
  return true;
}

export async function flushOfflineQueue(): Promise<SyncResult> {
  if (inFlightFlush) {
    return inFlightFlush;
  }

  inFlightFlush = (async () => {
    if (!(await isNetworkAvailable())) {
      return { synced: false };
    }

    const queue = await getQueue();

    for (const mutation of queue) {
      let handled = false;

      if (mutation.kind === 'prayer-note-upsert') {
        handled = await flushPrayerNoteUpsert(mutation);
      } else if (mutation.kind === 'prayer-note-delete') {
        handled = await flushPrayerNoteDelete(mutation);
      } else if (mutation.kind === 'reflection-upsert') {
        handled = await flushReflectionUpsert(mutation);
      } else if (mutation.kind === 'reflection-delete') {
        handled = await flushReflectionDelete(mutation);
      } else if (mutation.kind === 'devotion-log-upsert') {
        handled = await flushDevotionLogUpsert(mutation);
      } else if (mutation.kind === 'profile-upsert') {
        handled = await flushProfileUpsert(mutation);
      } else if (mutation.kind === 'auth-metadata-update') {
        handled = await flushAuthMetadataUpdate(mutation);
      }

      if (!handled) {
        return { synced: false };
      }
    }

    return { synced: true };
  })();

  try {
    return await inFlightFlush;
  } finally {
    inFlightFlush = null;
  }
}

async function flushIfPossible() {
  if (!(await isNetworkAvailable())) {
    return { synced: false };
  }

  return flushOfflineQueue();
}

export async function refreshPrayerNotes(userId: string) {
  await flushIfPossible();

  if (!(await isNetworkAvailable())) {
    return { data: await getPrayerNotesCache(userId), offline: true };
  }

  const { data, error } = await supabase
    .from('prayer_notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: await getPrayerNotesCache(userId), offline: true };
  }

  const notes = (data ?? []) as PrayerNote[];
  const decryptedNotes = notes.map(note => ({
    ...note,
    content: decryptContent(note.content, userId),
  }));
  await setPrayerNotesCache(userId, decryptedNotes);
  return { data: decryptedNotes, offline: false };
}

export async function savePrayerNote(params: {
  userId: string;
  note?: PrayerNote | null;
  content: string;
}) {
  const notes = await getPrayerNotesCache(params.userId);
  const current = params.note
    ? notes.find(note => note.id === params.note?.id) ?? params.note
    : null;
  const nextNote: PrayerNote = current
    ? {
        ...current,
        content: params.content,
      }
    : {
        id: makeLocalId(),
        content: params.content,
        created_at: nowIso(),
        is_answered: false,
        pendingSync: true,
      };

  const nextNotes = current
    ? notes.map(note => (note.id === nextNote.id ? nextNote : note))
    : [nextNote, ...notes];

  await setPrayerNotesCache(params.userId, nextNotes);
  await enqueueMutation({
    id: makeLocalId(),
    kind: 'prayer-note-upsert',
    userId: params.userId,
    note: nextNote,
  });
  const result = await flushIfPossible();
  return {
    data: await getPrayerNotesCache(params.userId),
    offline: !result.synced,
  };
}

export async function togglePrayerNoteAnswered(params: {
  userId: string;
  note: PrayerNote;
}) {
  const notes = await getPrayerNotesCache(params.userId);
  const nextNote = {
    ...params.note,
    is_answered: !params.note.is_answered,
    pendingSync: true,
  };
  const nextNotes = notes.map(note =>
    note.id === params.note.id ? nextNote : note,
  );
  await setPrayerNotesCache(params.userId, nextNotes);
  await enqueueMutation({
    id: makeLocalId(),
    kind: 'prayer-note-upsert',
    userId: params.userId,
    note: nextNote,
  });
  const result = await flushIfPossible();
  return {
    data: await getPrayerNotesCache(params.userId),
    offline: !result.synced,
  };
}

export async function deletePrayerNote(params: {
  userId: string;
  note: PrayerNote;
}) {
  const notes = await getPrayerNotesCache(params.userId);
  await setPrayerNotesCache(
    params.userId,
    notes.filter(note => note.id !== params.note.id),
  );

  if (!isLocalId(params.note.id)) {
    await enqueueMutation({
      id: makeLocalId(),
      kind: 'prayer-note-delete',
      userId: params.userId,
      noteId: params.note.id,
    });
  } else {
    const queue = await getQueue();
    await setQueue(
      queue.filter(
        mutation =>
          !(
            mutation.kind === 'prayer-note-upsert' &&
            mutation.userId === params.userId &&
            mutation.note.id === params.note.id
          ),
      ),
    );
  }

  const result = await flushIfPossible();
  return {
    data: await getPrayerNotesCache(params.userId),
    offline: !result.synced,
  };
}

export async function refreshReflections(userId: string) {
  await flushIfPossible();

  if (!(await isNetworkAvailable())) {
    return { data: await getReflectionsCache(userId), offline: true };
  }

  const { data, error } = await supabase
    .from('reflections')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    return { data: await getReflectionsCache(userId), offline: true };
  }

  const reflections = sortReflections((data ?? []) as Reflection[]);
  const decryptedReflections = reflections.map(reflection => ({
    ...reflection,
    content: decryptContent(reflection.content, userId),
  }));
  await setReflectionsCache(userId, decryptedReflections);
  return { data: decryptedReflections, offline: false };
}

export async function saveReflection(params: {
  userId: string;
  reflection?: Reflection | null;
  content: string;
  date: string;
}) {
  const reflections = await getReflectionsCache(params.userId);
  const current = params.reflection
    ? reflections.find(reflection => reflection.id === params.reflection?.id) ??
      params.reflection
    : null;
  const nextReflection: Reflection = current
    ? {
        ...current,
        content: params.content,
        date: params.date,
      }
    : {
        id: makeLocalId(),
        content: params.content,
        date: params.date,
        created_at: nowIso(),
        pendingSync: true,
      };

  const nextReflections = current
    ? reflections.map(reflection =>
        reflection.id === nextReflection.id ? nextReflection : reflection,
      )
    : [nextReflection, ...reflections];

  await setReflectionsCache(params.userId, nextReflections);
  await enqueueMutation({
    id: makeLocalId(),
    kind: 'reflection-upsert',
    userId: params.userId,
    reflection: nextReflection,
  });
  const result = await flushIfPossible();
  return {
    data: await getReflectionsCache(params.userId),
    offline: !result.synced,
  };
}

export async function deleteReflection(params: {
  userId: string;
  reflection: Reflection;
}) {
  const reflections = await getReflectionsCache(params.userId);
  await setReflectionsCache(
    params.userId,
    reflections.filter(reflection => reflection.id !== params.reflection.id),
  );

  if (!isLocalId(params.reflection.id)) {
    await enqueueMutation({
      id: makeLocalId(),
      kind: 'reflection-delete',
      userId: params.userId,
      reflectionId: params.reflection.id,
    });
  } else {
    const queue = await getQueue();
    await setQueue(
      queue.filter(
        mutation =>
          !(
            mutation.kind === 'reflection-upsert' &&
            mutation.userId === params.userId &&
            mutation.reflection.id === params.reflection.id
          ),
      ),
    );
  }

  const result = await flushIfPossible();
  return {
    data: await getReflectionsCache(params.userId),
    offline: !result.synced,
  };
}

export async function refreshDevotionLogs(userId: string) {
  await flushIfPossible();

  if (!(await isNetworkAvailable())) {
    return { data: await getDevotionLogsCache(userId), offline: true };
  }

  const { data, error } = await supabase
    .from('devotion_log')
    .select(
      'date, completed, reading_book, reading_chapter, chapters_read, selected_chapters',
    )
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    return { data: await getDevotionLogsCache(userId), offline: true };
  }

  const logsMap = mapDevotionRows(data);
  await setDevotionLogsCache(userId, logsMap);
  return { data: logsMap, offline: false };
}

export async function refreshProfileRecord(userId: string) {
  await flushIfPossible();

  if (!(await isNetworkAvailable())) {
    return { data: await getProfileRecordCache(userId), offline: true };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'church, sect, birth_date, gender, devotion_time, reading_book, reading_chapter, daily_chapters_target, selected_chapters, updated_at',
    )
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    return { data: await getProfileRecordCache(userId), offline: true };
  }

  const profile = (data ?? {}) as ProfileRecord;
  await setProfileRecordCache(userId, profile);
  return { data: profile, offline: false };
}

export async function saveProfileRecord(params: {
  userId: string;
  profile: ProfileRecord;
}) {
  const current = await getProfileRecordCache(params.userId);
  const nextProfile = {
    ...current,
    ...params.profile,
    updated_at: params.profile.updated_at ?? nowIso(),
  };

  await setProfileRecordCache(params.userId, nextProfile);
  await enqueueMutation({
    id: makeLocalId(),
    kind: 'profile-upsert',
    userId: params.userId,
    profile: nextProfile,
  });
  const result = await flushIfPossible();
  return {
    data: await getProfileRecordCache(params.userId),
    offline: !result.synced,
  };
}

export async function saveAuthMetadata(params: {
  userId: string;
  metadata: Record<string, any>;
}) {
  await enqueueMutation({
    id: makeLocalId(),
    kind: 'auth-metadata-update',
    userId: params.userId,
    metadata: params.metadata,
  });
  const result = await flushIfPossible();
  return { offline: !result.synced };
}

export async function saveDevotionLog(params: {
  userId: string;
  date: string;
  payload: DevotionDayLog;
}) {
  const logs = await getDevotionLogsCache(params.userId);
  await setDevotionLogsCache(params.userId, {
    ...logs,
    [params.date]: {
      ...params.payload,
      pendingSync: true,
    },
  });

  await enqueueMutation({
    id: makeLocalId(),
    kind: 'devotion-log-upsert',
    userId: params.userId,
    date: params.date,
    payload: params.payload,
  });

  const result = await flushIfPossible();
  return {
    data: await getDevotionLogsCache(params.userId),
    offline: !result.synced,
  };
}

export async function hasPendingOfflineMutations() {
  const queue = await getQueue();
  return queue.length > 0;
}
