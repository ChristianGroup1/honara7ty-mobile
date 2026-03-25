export function computeStreak(dates: string[]): number {
  if (!dates.length) {
    return 0;
  }

  const unique = Array.from(new Set(dates)).sort().reverse();
  const today = new Date().toISOString().split('T')[0];
  let streak = 0;
  let expected = today;

  for (const d of unique) {
    if (d === expected) {
      streak++;
      const prev = new Date(expected);
      prev.setDate(prev.getDate() - 1);
      expected = prev.toISOString().split('T')[0];
    } else if (d < expected) {
      break;
    }
  }

  return streak;
}
