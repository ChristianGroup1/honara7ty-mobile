const toLocalIsoDate = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function computeStreak(dates: string[]): number {
  if (!dates.length) {
    return 0;
  }

  const unique = Array.from(new Set(dates)).sort().reverse();
  const today = toLocalIsoDate(new Date());
  let streak = 0;
  let expected = today;

  for (const d of unique) {
    if (d === expected) {
      streak++;
      const prev = new Date(expected);
      prev.setDate(prev.getDate() - 1);
      expected = toLocalIsoDate(prev);
    } else if (d < expected) {
      break;
    }
  }

  return streak;
}
