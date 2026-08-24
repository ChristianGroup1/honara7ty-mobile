import { getJourneyInfo, JOURNEY_STOPS } from '../lib/journeyMap';

describe('journeyMap', () => {
  it('starts at Antioch with zero days', () => {
    const info = getJourneyInfo(0);

    expect(info.currentStop.key).toBe('antioch');
    expect(info.currentIndex).toBe(0);
    expect(info.stops[0].status).toBe('current');
  });

  it('unlocks Seleucia after one completed day', () => {
    const info = getJourneyInfo(1);

    expect(info.currentStop.key).toBe('seleucia');
    expect(info.daysToNext).toBe(2);
  });

  it('never shrinks the journey when days decrease', () => {
    const before = getJourneyInfo(30);
    const after = getJourneyInfo(10);

    expect(after.currentStop.index).toBeLessThanOrEqual(
      before.currentStop.index,
    );
  });

  it('completes the journey at 90 cumulative days', () => {
    const info = getJourneyInfo(90);

    expect(info.isComplete).toBe(true);
    expect(info.nextStop).toBeNull();
    expect(info.currentStop.key).toBe('returnAntioch');
    expect(
      info.stops
        .slice(0, -1)
        .every(s => s.status === 'visited'),
    ).toBe(true);
  });

  it('computes progress within the current leg', () => {
    // Paphos unlocks at 7, Perga at 14 → halfway at ~10.5
    const info = getJourneyInfo(11);

    expect(info.currentStop.key).toBe('paphos');
    expect(info.progress).toBeGreaterThan(0);
    expect(info.progress).toBeLessThan(1);
  });

  it('has strictly increasing day thresholds and unique keys', () => {
    for (let i = 1; i < JOURNEY_STOPS.length; i += 1) {
      expect(JOURNEY_STOPS[i].minDays).toBeGreaterThan(
        JOURNEY_STOPS[i - 1].minDays,
      );
      expect(JOURNEY_STOPS[i].key).not.toBe(JOURNEY_STOPS[i - 1].key);
    }
  });
});
