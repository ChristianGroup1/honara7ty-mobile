export interface Reflection {
  id: string;
  content: string;
  audio_uri?: string | null;
  audio_duration_ms?: number | null;
  date: string;
  created_at: string;
  pendingSync?: boolean;
}
