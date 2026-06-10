import { BADGE_CONFIGS } from '../components/badges/constants';
import { computeXp } from '../components/badges/utils';

describe('badges utils', () => {
  it('adds daily streak XP and earned badge XP', () => {
    const earnedBadges = BADGE_CONFIGS.slice(0, 2);

    expect(computeXp(14, earnedBadges)).toBe(415);
  });

  it('does not subtract XP for negative streak values', () => {
    expect(computeXp(-3, [])).toBe(0);
  });
});
