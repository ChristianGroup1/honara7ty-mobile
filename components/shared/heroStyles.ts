export const HERO_NAVY = '#0A1124';
export const HERO_GOLD = '#C9A84C';

export const heroCardBase = {
  backgroundColor: HERO_NAVY,
  borderRadius: 28,
  paddingHorizontal: 20,
  paddingVertical: 20,
  marginBottom: 18,
  overflow: 'hidden' as const,
  shadowColor: HERO_NAVY,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.12,
  shadowRadius: 10,
  elevation: 8,
};

export const heroGlowBase = {
  position: 'absolute' as const,
  top: -34,
  left: -18,
  width: 180,
  height: 180,
  borderRadius: 90,
  backgroundColor: 'rgba(201,168,76,0.14)',
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
  color: '#FFF4D6',
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
