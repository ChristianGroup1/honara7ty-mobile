import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import supabase from './supbase';
import { PrayerNote } from '../components/prayer-notes/types';
import { Reflection } from '../components/spiritual-reflection/types';
import { DevotionDayLog } from '../components/devotion-calendar/types';
import { syncReadingLogForDate } from './readingLog';
import { deriveKey, encryptText, decryptText, isEncrypted } from './crypto';

const OFFLINE_QUEUE_KEY = 'offline_sync_queue_v1';
const LOCAL_ID_PREFIX = 'local-';

const prayerNotesKey = (userId: string) => `offline_prayer_notes:${userId}`;
const reflectionsKey = (userId: string) => `offline_reflections:${userId}`;
const devotionLogsKey = (userId: string) => `offline_devotion_logs:${userId}`;
const profileRecordKey = (userId: string) => `offline_profile_record:${userId}`;
const encryptionMigratedKey = (userId: string) =>
  `encryption_migrated_v1:${userId}`;

// ── Encryption helpers ────────────────────────────────────────────────────────

function encryptNote(note: PrayerNote, key: Uint8Array): PrayerNote {
  return { ...note, content: encryptText(note.content, key) };
}

function decryptNote(note: PrayerNote, key: Uint8Array): PrayerNote {
  return { ...note, content: decryptText(note.content, key) };
}

function encryptReflection(reflection: Reflection, key: Uint8Array): Reflection {
  return { ...reflection, content: encryptText(reflection.content, key) };
}

function decryptReflection(reflection: Reflection, key: Uint8Array): Reflection {
  return { ...reflection, content: decryptText(reflection.content, key) };
}

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

async function getPrayerNotesCache(userId: string) {
  return readJson<PrayerNote[]>(prayerNotesKey(userId), []);
}

async function setPrayerNotesCache(userId: string, notes: PrayerNote[]) {
  await writeJson(prayerNotesKey(userId), sortPrayerNotes(notes));
}

async function getReflectionsCache(userId: string) {
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

function rewriteMutationEntityIdInQueue(
  queue: OfflineMutation[],
  userId: string,
  kind: 'prayer-note-upsert' | 'prayer-note-delete' | 'reflection-upsert' | 'reflection-delete',
  oldId: string,
  newId: string,
): OfflineMutation[] {
  return queue.map(mutation => {
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
}

async function rewriteMutationEntityId(
  userId: string,
  kind: 'prayer-note-upsert' | 'prayer-note-delete' | 'reflection-upsert' | 'reflection-delete',
  oldId: string,
  newId: string,
) {
  const queue = await getQueue();
  const nextQueue = rewriteMutationEntityIdInQueue(queue, userId, kind, oldId, newId);
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

async function flushPrayerNoteUpsert(mutation: Extract<OfflineMutation, { kind: 'prayer-note-upsert' }>) {
  if (isLocalId(mutation.note.id)) {
    const { data, error } = await supabase
      .from('prayer_notes')
      .insert({
        user_id: mutation.userId,
        content: mutation.note.content,
        is_answered: mutation.note.is_answered,
      })
      .select('*')
      .single();

    if (error || !data) {
      return false;
    }

    const serverNote = data as PrayerNote;
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
      content: mutation.note.content,
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
        content: mutation.reflection.content,
        date: mutation.reflection.date,
      })
      .select('*')
      .single();

    if (error || !data) {
      return false;
    }

    const serverReflection = data as Reflection;
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
      content: mutation.reflection.content,
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

    let queue = await getQueue();
    if (queue.length === 0) {
      return { synced: true };
    }

    // Process mutations one by one.
    // We update the queue in memory and save it back to AsyncStorage only once
    // at the end of the batch (or if we hit a terminal error) to minimize I/O.
    let index = 0;
    while (index < queue.length) {
      // Yield to the event loop every few mutations to prevent blocking the main thread/ANRs
      if (index > 0 && index % 3 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      const mutation = queue[index];
      let success = false;

      try {
        if (mutation.kind === 'prayer-note-upsert') {
          if (isLocalId(mutation.note.id)) {
            const { data, error } = await supabase
              .from('prayer_notes')
              .insert({
                user_id: mutation.userId,
                content: mutation.note.content,
                is_answered: mutation.note.is_answered,
              })
              .select('*')
              .single();

            if (!error && data) {
              const serverNote = data as PrayerNote;
              const notes = await getPrayerNotesCache(mutation.userId);
              await setPrayerNotesCache(
                mutation.userId,
                replacePrayerNoteId(notes, mutation.note.id, serverNote),
              );
              // Rewrite IDs in the remaining queue items
              queue = rewriteMutationEntityIdInQueue(
                queue,
                mutation.userId,
                'prayer-note-upsert',
                mutation.note.id,
                serverNote.id,
              );
              queue = rewriteMutationEntityIdInQueue(
                queue,
                mutation.userId,
                'prayer-note-delete',
                mutation.note.id,
                serverNote.id,
              );
              success = true;
            }
          } else {
            const { error } = await supabase
              .from('prayer_notes')
              .update({
                content: mutation.note.content,
                is_answered: mutation.note.is_answered,
              })
              .eq('id', mutation.note.id);
            if (!error) success = true;
          }
        } else if (mutation.kind === 'prayer-note-delete') {
          const { error } = await supabase
            .from('prayer_notes')
            .delete()
            .eq('id', mutation.noteId);
          if (!error) success = true;
        } else if (mutation.kind === 'reflection-upsert') {
          if (isLocalId(mutation.reflection.id)) {
            const { data, error } = await supabase
              .from('reflections')
              .insert({
                user_id: mutation.userId,
                content: mutation.reflection.content,
                date: mutation.reflection.date,
              })
              .select('*')
              .single();

            if (!error && data) {
              const serverRef = data as Reflection;
              const reflections = await getReflectionsCache(mutation.userId);
              await setReflectionsCache(
                mutation.userId,
                replaceReflectionId(reflections, mutation.reflection.id, serverRef),
              );
              queue = rewriteMutationEntityIdInQueue(
                queue,
                mutation.userId,
                'reflection-upsert',
                mutation.reflection.id,
                serverRef.id,
              );
              queue = rewriteMutationEntityIdInQueue(
                queue,
                mutation.userId,
                'reflection-delete',
                mutation.reflection.id,
                serverRef.id,
              );
              success = true;
            }
          } else {
            const { error } = await supabase
              .from('reflections')
              .update({
                content: mutation.reflection.content,
                date: mutation.reflection.date,
              })
              .eq('id', mutation.reflection.id);
            if (!error) success = true;
          }
        } else if (mutation.kind === 'reflection-delete') {
          const { error } = await supabase
            .from('reflections')
            .delete()
            .eq('id', mutation.reflectionId);
          if (!error) success = true;
        } else if (mutation.kind === 'devotion-log-upsert') {
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

          if (!error) {
            const { error: rle } = await syncReadingLogForDate({
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
            if (!rle) success = true;
          }
        } else if (mutation.kind === 'profile-upsert') {
          const { error } = await supabase.from('profiles').upsert(
            { id: mutation.userId, ...mutation.profile },
            { onConflict: 'id' },
          );
          if (!error) success = true;
        } else if (mutation.kind === 'auth-metadata-update') {
          const { error } = await supabase.auth.updateUser({
            data: mutation.metadata,
          });
          if (!error) success = true;
        }
      } catch (e) {
        success = false;
      }

      if (success) {
        // Mutation handled, remove it from local queue and continue
        queue.splice(index, 1);
      } else {
        // Stop flushing on first error to preserve order
        await setQueue(queue);
        return { synced: false };
      }
    }

    await setQueue(queue);
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

  const key = deriveKey(userId);

  if (!(await isNetworkAvailable())) {
    const cached = await getPrayerNotesCache(userId);
    return { data: cached.map(n => decryptNote(n, key)), offline: true };
  }

  const { data, error } = await supabase
    .from('prayer_notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    const cached = await getPrayerNotesCache(userId);
    return { data: cached.map(n => decryptNote(n, key)), offline: true };
  }

  const notes = (data ?? []) as PrayerNote[];
  await setPrayerNotesCache(userId, notes);
  return { data: notes.map(n => decryptNote(n, key)), offline: false };
}

export async function savePrayerNote(params: {
  userId: string;
  note?: PrayerNote | null;
  content: string;
}) {
  const key = deriveKey(params.userId);
  const notes = await getPrayerNotesCache(params.userId);
  const current = params.note
    ? notes.find(note => note.id === params.note?.id) ?? params.note
    : null;
  // Guard against double-encryption: content from screen state is always
  // plaintext, but be safe in case the caller passes an already-encrypted value.
  const plainContent = isEncrypted(params.content)
    ? decryptText(params.content, key)
    : params.content;
  const encryptedContent = encryptText(plainContent, key);
  const nextNote: PrayerNote = current
    ? {
        ...current,
        content: encryptedContent,
      }
    : {
        id: makeLocalId(),
        content: encryptedContent,
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
  const cached = await getPrayerNotesCache(params.userId);
  return {
    data: cached.map(n => decryptNote(n, key)),
    offline: !result.synced,
  };
}

export async function togglePrayerNoteAnswered(params: {
  userId: string;
  note: PrayerNote;
}) {
  const key = deriveKey(params.userId);
  const notes = await getPrayerNotesCache(params.userId);
  // params.note.content is decrypted (from screen state); guard against
  // accidental double-encryption by checking before encrypting.
  const plainContent = isEncrypted(params.note.content)
    ? decryptText(params.note.content, key)
    : params.note.content;
  const noteToStore = encryptNote(
    { ...params.note, content: plainContent, is_answered: !params.note.is_answered, pendingSync: true },
    key,
  );
  const nextNotes = notes.map(note =>
    note.id === params.note.id ? noteToStore : note,
  );
  await setPrayerNotesCache(params.userId, nextNotes);
  await enqueueMutation({
    id: makeLocalId(),
    kind: 'prayer-note-upsert',
    userId: params.userId,
    note: noteToStore,
  });
  const result = await flushIfPossible();
  const cached = await getPrayerNotesCache(params.userId);
  return {
    data: cached.map(n => decryptNote(n, key)),
    offline: !result.synced,
  };
}

export async function deletePrayerNote(params: {
  userId: string;
  note: PrayerNote;
}) {
  const key = deriveKey(params.userId);
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
  const cached = await getPrayerNotesCache(params.userId);
  return {
    data: cached.map(n => decryptNote(n, key)),
    offline: !result.synced,
  };
}

export async function refreshReflections(userId: string) {
  await flushIfPossible();

  const key = deriveKey(userId);

  if (!(await isNetworkAvailable())) {
    const cached = await getReflectionsCache(userId);
    return { data: cached.map(r => decryptReflection(r, key)), offline: true };
  }

  const { data, error } = await supabase
    .from('reflections')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    const cached = await getReflectionsCache(userId);
    return { data: cached.map(r => decryptReflection(r, key)), offline: true };
  }

  const reflections = sortReflections((data ?? []) as Reflection[]);
  await setReflectionsCache(userId, reflections);
  return { data: reflections.map(r => decryptReflection(r, key)), offline: false };
}

export async function saveReflection(params: {
  userId: string;
  reflection?: Reflection | null;
  content: string;
  date: string;
}) {
  const key = deriveKey(params.userId);
  const reflections = await getReflectionsCache(params.userId);
  const current = params.reflection
    ? reflections.find(reflection => reflection.id === params.reflection?.id) ??
      params.reflection
    : null;
  // Guard against double-encryption: content from screen state is always
  // plaintext, but be safe in case the caller passes an already-encrypted value.
  const plainContent = isEncrypted(params.content)
    ? decryptText(params.content, key)
    : params.content;
  const encryptedContent = encryptText(plainContent, key);
  const nextReflection: Reflection = current
    ? {
        ...current,
        content: encryptedContent,
        date: params.date,
      }
    : {
        id: makeLocalId(),
        content: encryptedContent,
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
  const cached = await getReflectionsCache(params.userId);
  return {
    data: cached.map(r => decryptReflection(r, key)),
    offline: !result.synced,
  };
}

export async function deleteReflection(params: {
  userId: string;
  reflection: Reflection;
}) {
  const key = deriveKey(params.userId);
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
  const cached = await getReflectionsCache(params.userId);
  return {
    data: cached.map(r => decryptReflection(r, key)),
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

// In-memory lock: map of userId → Promise so concurrent calls collapse.
const migrationInFlight = new Map<string, Promise<void>>();

/**
 * One-time migration that encrypts any plaintext `content` values that were
 * written before encryption was introduced.
 *
 * Call this once per session after the user is authenticated (e.g. from the
 * home screen's mount effect).  Subsequent calls are no-ops because the
 * completion flag is persisted in AsyncStorage.  Concurrent calls for the
 * same userId are deduplicated via an in-memory lock.
 *
 * The migration is fully transparent to the user: it runs silently in the
 * background and requires no interaction.
 */
export async function migrateContentEncryption(userId: string): Promise<void> {
  // Deduplicate concurrent invocations (e.g. rapid focus events).
  const inflight = migrationInFlight.get(userId);
  if (inflight) {
    return inflight;
  }

  const task = (async () => {
    const flagKey = encryptionMigratedKey(userId);
    const alreadyMigrated = await AsyncStorage.getItem(flagKey);
    if (alreadyMigrated) {
      return;
    }

    const key = deriveKey(userId);
    const online = await isNetworkAvailable();

    // ── Migrate prayer notes ────────────────────────────────────────────────
    const notes = await getPrayerNotesCache(userId);
    const plainNotes = notes.filter(n => !isEncrypted(n.content));
    if (plainNotes.length > 0) {
      const migratedNotes = notes.map(n =>
        isEncrypted(n.content) ? n : encryptNote(n, key),
      );
      await setPrayerNotesCache(userId, migratedNotes);

      if (online) {
        for (const note of plainNotes) {
          if (!isLocalId(note.id)) {
            // Errors on individual rows are tolerated; already-encrypted rows
            // in cache prevent double-encryption on retry.
            await supabase
              .from('prayer_notes')
              .update({ content: encryptText(note.content, key) })
              .eq('id', note.id);
          }
        }
      }
    }

    // ── Migrate reflections ─────────────────────────────────────────────────
    const reflections = await getReflectionsCache(userId);
    const plainReflections = reflections.filter(r => !isEncrypted(r.content));
    if (plainReflections.length > 0) {
      const migratedReflections = reflections.map(r =>
        isEncrypted(r.content) ? r : encryptReflection(r, key),
      );
      await setReflectionsCache(userId, migratedReflections);

      if (online) {
        for (const reflection of plainReflections) {
          if (!isLocalId(reflection.id)) {
            await supabase
              .from('reflections')
              .update({ content: encryptText(reflection.content, key) })
              .eq('id', reflection.id);
          }
        }
      }
    }

    await AsyncStorage.setItem(flagKey, '1');
  })();

  migrationInFlight.set(userId, task);
  try {
    return await task;
  } finally {
    migrationInFlight.delete(userId);
  }
}
