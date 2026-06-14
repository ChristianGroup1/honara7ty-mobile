import { badgeConfigs } from '../../localization/modules/badges';
import { BG, GOLD, NAVY } from '../shared/designTokens';

export { BG, GOLD, NAVY };

export const APP_SCHEME = 'hanaraahti://';
export const WEB_URL = 'https://hanaraahti.app';

export interface BadgeConfig {
  key: string;
  icon: string;
  title: string;
  days: number;
  tier: string;
  xp: number;
  color: string;
  shareText: string;
  emoji: string;
}

export const BADGE_CONFIGS: BadgeConfig[] = badgeConfigs.map(badge => ({
  ...badge,
  color: badge.key === 'monthly' ? GOLD : badge.color,
}));
