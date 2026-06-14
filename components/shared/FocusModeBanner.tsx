import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AppState, Platform } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { getFocusModeStatus, disableFocusMode } from '../../lib/focusMode';

export const FocusModeBanner = () => {
  const [isActive, setIsActive] = useState(false);

  const checkStatus = async () => {
    if (Platform.OS !== 'android') return;
    const active = await getFocusModeStatus();
    setIsActive(active);
  };

  useEffect(() => {
    checkStatus();
    
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkStatus();
      }
    });

    return () => sub.remove();
  }, []);

  const handleDisable = async () => {
    if (Platform.OS !== 'android') return;
    await disableFocusMode();
    setIsActive(false);
  };

  if (!isActive || Platform.OS !== 'android') return null;

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="bell-off" size={20} color="#FF9500" />
      <View style={styles.textWrap}>
        <Text style={styles.title}>تنبيه: وضع الخلوة مفعل</Text>
        <Text style={styles.subtitle}>أنت الآن في وضع عدم الإزعاج.</Text>
      </View>
      <TouchableOpacity style={styles.btn} onPress={handleDisable} activeOpacity={0.8}>
        <Text style={styles.btnText}>إيقاف</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.3)',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textWrap: {
    flex: 1,
    marginLeft: 10,
    marginRight: 10,
  },
  title: {
    color: '#FF9500',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'left',
  },
  subtitle: {
    color: '#FF9500',
    fontSize: 12,
    marginTop: 2,
    textAlign: 'left',
  },
  btn: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  btnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  }
});

export default FocusModeBanner;
