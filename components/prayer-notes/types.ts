export interface PrayerNote {
  id: string;
  content: string;
  audio_uri?: string | null;
  audio_duration_ms?: number | null;
  created_at: string;
  is_answered: boolean;
  pendingSync?: boolean;
}
