import React, { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import OfflineBanner from './OfflineBanner';
import GradientSurface from './GradientSurface';
import { useNightMode } from '../../lib/nightMode';
import { headerGradient, NAVY } from './designTokens';

interface AppHeaderProps {
  topInsetHeight: number;
  title: string;
  eyebrow?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  backgroundColor?: string;
  titleNumberOfLines?: number;
}

interface AppHeaderActionProps {
  icon: string;
  onPress: () => void;
  backgroundColor?: string;
  size?: number;
}

export const AppHeaderAction = React.memo(({
  icon,
  onPress,
  backgroundColor = 'rgba(255,255,255,0.08)',
  size = 20,
}: AppHeaderActionProps) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.actionButton, { backgroundColor }]}
    activeOpacity={0.8}
  >
    <MaterialCommunityIcons name={icon} size={size} color="#FFF" />
  </TouchableOpacity>
));

const AppHeader = ({
  topInsetHeight,
  title,
  eyebrow,
  leading,
  trailing,
  backgroundColor = NAVY,
  titleNumberOfLines = 1,
}: AppHeaderProps) => {
  const netInfo = useNetInfo();
  const { colors, isNightMode } = useNightMode();
  const [isOffline, setIsOffline] = React.useState(false);
  const useGradient = backgroundColor === NAVY;
  const resolvedBackgroundColor = useGradient ? colors.header : backgroundColor;
  const gradientColors = isNightMode
    ? headerGradient.dark
    : headerGradient.light;

  React.useEffect(() => {
    const nextOffline =
      netInfo.isConnected === false || netInfo.isInternetReachable === false;

    // If we're going offline, wait a bit before showing the banner to avoid flickering
    // If we're coming back online, show it immediately (or vice versa)
    const timeout = setTimeout(() => {
      setIsOffline(nextOffline);
    }, nextOffline ? 1500 : 500);

    return () => clearTimeout(timeout);
  }, [netInfo.isConnected, netInfo.isInternetReachable]);

  return (
    <>
      <View
        style={[
          styles.topInset,
          {
            height: topInsetHeight,
            backgroundColor: useGradient
              ? gradientColors[0]
              : resolvedBackgroundColor,
          },
        ]}
      />
      <View style={[styles.shell, { backgroundColor: resolvedBackgroundColor }]}>
        {useGradient ? <GradientSurface colors={gradientColors} /> : null}
        <View style={styles.glow} />
        <View style={styles.topRow}>
          <View style={styles.identity}>
            {leading ? <View style={styles.leadingWrap}>{leading}</View> : null}
            <View style={[styles.textBlock, { marginRight: leading ? 24 : 0 }]}>
              {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
              <Text
                style={[styles.title, { textAlign: eyebrow ? 'left' : 'center' }]}
                numberOfLines={titleNumberOfLines}
              >
                {title}
              </Text>
            </View>
          </View>
          {trailing ? <View style={styles.trailingWrap}>{trailing}</View> : null}
        </View>
      </View>
      <OfflineBanner visible={isOffline} inline />
    </>
  );
};

const styles = StyleSheet.create({
  topInset: {
    backgroundColor: NAVY,
  },
  shell: {
    backgroundColor: NAVY,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -60,
    left: -30,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(120,161,189,0.16)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  identity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    marginRight: 1,
  },
  leadingWrap: {
    marginRight: 8,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: '#E6D5A2',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'left',
    marginBottom: 2,
  },
  title: {
    color: '#FFF',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  trailingWrap: {
    flexShrink: 0,
  },
  actionButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default React.memo(AppHeader);
