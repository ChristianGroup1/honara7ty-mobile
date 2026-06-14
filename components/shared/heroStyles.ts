import { GOLD as HERO_GOLD, NAVY as HERO_NAVY } from './designTokens';

export { HERO_GOLD, HERO_NAVY };

export const heroCardBase = {
  backgroundColor: HERO_NAVY,
  borderRadius: 30,
  paddingHorizontal: 20,
  paddingVertical: 22,
  marginBottom: 18,
  overflow: 'hidden' as const,
  shadowColor: HERO_NAVY,
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.18,
  shadowRadius: 24,
  elevation: 12,
};

export const heroGlowBase = {
  position: 'absolute' as const,
  top: -40,
  left: -24,
  width: 200,
  height: 200,
  borderRadius: 100,
  backgroundColor: 'rgba(120,161,189,0.18)',
};

export const heroTopRowBase = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'space-between' as const,
  marginBottom: 16,
};

export const heroIconWrapBase = {
  width: 52,
  height: 52,
  borderRadius: 18,
  backgroundColor: 'rgba(255,255,255,0.08)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.1)',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

export const heroBadgeBase = {
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 999,
  backgroundColor: 'rgba(255,255,255,0.1)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.1)',
};

export const heroBadgeTextBase = {
  color: HERO_GOLD,
  fontSize: 12,
  fontWeight: '800' as const,
};

export const heroEyebrowBase = {
  color: '#E6D5A2',
  fontSize: 12,
  fontWeight: '700' as const,
  marginBottom: 6,
  textAlign: 'left' as const,
};

export const heroTitleBase = {
  color: '#FFF',
  fontSize: 24,
  fontWeight: '800' as const,
  lineHeight: 32,
  textAlign: 'left' as const,
  marginBottom: 8,
};

export const heroTextBase = {
  color: 'rgba(255,255,255,0.74)',
  fontSize: 14,
  lineHeight: 22,
  textAlign: 'left' as const,
};
