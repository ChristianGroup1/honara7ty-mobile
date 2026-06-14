import React, { useEffect, useState, useCallback } from 'react';
import { View, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { 
  getFocusModePreference, 
  getFocusModeStatus,
  enableFocusMode, 
  disableFocusMode, 
  FocusModePreference,
  hasFocusModePermission,
  requestFocusModePermission
} from '../../lib/focusMode';
import CustomAlert from './CustomAlert';
import { getStrings } from '../../localization';

interface Props {
  color?: string;
  size?: number;
}

const FocusModeToggle: React.FC<Props> = ({ color = '#FFF', size = 24 }) => {
  const [pref, setPref] = useState<FocusModePreference>('disabled');
  const [isActive, setIsActive] = useState(false);
  const [alertConfig, setAlertConfig] = useState<any>({ visible: false, title: '' });
  const strings = getStrings().devotion;
  const moreStrings = getStrings().more;

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const p = await getFocusModePreference();
      if (!mounted) return;
      setPref(p);
      
      // Sync toggle state with actual device status
      if (Platform.OS === 'android') {
        const status = await getFocusModeStatus();
        setIsActive(status);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const handlePress = useCallback(async () => {
    if (Platform.OS === 'android') {
      const hasPerm = await hasFocusModePermission();
      if (!hasPerm) {
        setAlertConfig({
          visible: true,
          title: moreStrings.focusMode.permissionRequiredTitle,
          message: moreStrings.focusMode.permissionRequiredMessage,
          type: 'warning',
          buttons: [
            { text: 'إلغاء', style: 'cancel' },
            { 
              text: 'موافق', 
              onPress: async () => {
                await requestFocusModePermission();
              } 
            }
          ]
        });
        return;
      }

      if (isActive) {
        await disableFocusMode();
        setIsActive(false);
      } else {
        await enableFocusMode();
        setIsActive(true);
      }
    } else {
      setAlertConfig({
        visible: true,
        title: moreStrings.focusMode.iosGuideTitle,
        message: moreStrings.focusMode.iosGuideMessage,
        type: 'info',
        buttons: [{ text: 'حسناً', style: 'default' }]
      });
    }
  }, [isActive, moreStrings.focusMode]);

  if (pref !== 'manual') {
    return null; // Automatic handles state invisibly, disabled shows nothing
  }

  return (
    <>
      <TouchableOpacity onPress={handlePress} style={styles.btn}>
        <MaterialCommunityIcons 
          name={isActive ? "bell-off" : "bell"} 
          size={size} 
          color={color} 
        />
      </TouchableOpacity>
      <CustomAlert {...alertConfig} onDismiss={() => setAlertConfig((prev: any) => ({ ...prev, visible: false }))} />
    </>
  );
};

const styles = StyleSheet.create({
  btn: {
    padding: 8,
    marginHorizontal: 4,
  }
});

export default FocusModeToggle;
