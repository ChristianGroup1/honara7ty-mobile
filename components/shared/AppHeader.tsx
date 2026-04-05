import React, { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const NAVY = '#0A1124';

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

export const AppHeaderAction = ({
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
);

const AppHeader = ({
  topInsetHeight,
  title,
  eyebrow,
  leading,
  trailing,
  backgroundColor = NAVY,
  titleNumberOfLines = 1,
}: AppHeaderProps) => (
  <>
    <View
      style={[styles.topInset, { height: topInsetHeight, backgroundColor }]}
    />
    <View style={[styles.shell, { backgroundColor }]}>
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
  </>
);

const styles = StyleSheet.create({
  topInset: {
    backgroundColor: NAVY,
  },
  shell: {
    backgroundColor: NAVY,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AppHeader;
