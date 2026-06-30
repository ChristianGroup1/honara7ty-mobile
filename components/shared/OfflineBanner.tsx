import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { getStrings } from '../../localization';

type Props = {
  visible: boolean;
  inline?: boolean;
};

const OfflineBanner = ({ visible, inline = false }: Props) => {
  const insets = useSafeAreaInsets();
  const strings = getStrings().shared.offline;
  const animation = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(animation, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: false, // height/opacity don't support native driver well for layout
    }).start();
  }, [visible, animation]);

  const height = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, inline ? 92 : 104 + insets.top],
  });

  const opacity = animation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <Animated.View
      style={[
        styles.shell,
        inline ? styles.shellInline : { paddingTop: insets.top + 8 },
        { height, opacity, overflow: 'hidden' },
      ]}
    >
      <View style={styles.banner}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="wifi-off" size={16} color="#FFF4DF" />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{strings.title}</Text>
          <Text style={styles.message}>{strings.message}</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  shell: {
    backgroundColor: '#0A1124',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  shellInline: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 0,
  },
  banner: {
    backgroundColor: '#8F4F10',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,244,223,0.18)',
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: '#FFF8EB',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'left',
  },
  message: {
    color: '#FCE7C7',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
    textAlign: 'left',
    flexShrink: 1,
  },
});

export default OfflineBanner;
