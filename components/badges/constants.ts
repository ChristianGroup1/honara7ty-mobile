import { badgeConfigs } from '../../localization/modules/badges';

export const NAVY = '#0A1124';
export const GOLD = '#C9A84C';
export const BG = '#F2F4F8';
export const APP_SCHEME = 'hanaraahti://';
export const WEB_URL = 'https://hanaraahti.app';

export interface BadgeConfig {
  key: string;
  icon: string;
  title: string;
  days: number;
  color: string;
  shareText: string;
  emoji: string;
}

export const BADGE_CONFIGS: BadgeConfig[] = badgeConfigs.map(badge => ({
  ...badge,
  color: badge.key === 'monthly' ? GOLD : badge.color,
}));
