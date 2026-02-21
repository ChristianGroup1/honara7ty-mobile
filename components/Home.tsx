import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import supabase from '../lib/supbase';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const HomeScreen = ({ route, navigation }: any) => {
  const userFromParams = route?.params?.user;
  const [user, setUser] = useState<any>(userFromParams || null);
  const [loading, setLoading] = useState(!userFromParams);

  useEffect(() => {
    if (!userFromParams) {
      const loadUser = async () => {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          setUser(data.session.user);
        }
        setLoading(false);
      };
      loadUser();
    }
  }, []);

  // ✅ دالة الـ Logout
  const handleLogout = async () => {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد أنك تريد تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'خروج',
        style: 'destructive',
        onPress: async () => {
          try {
            // 1️⃣ Sign out from Supabase (يمسح السيشن من الـ storage)
            await supabase.auth.signOut();

            // 2️⃣ Sign out from Google (يمسح الـ Google cached account)
            await GoogleSignin.signOut();

            // 3️⃣ روح على Welcome Screen ومتخليش رجوع
            navigation.reset({
              index: 0,
              routes: [{ name: 'Welcome' }],
            });
          } catch (error: any) {
            Alert.alert('خطأ', error.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0A1124" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>مرحباً 👋</Text>

      {user?.user_metadata?.full_name && (
        <Text style={styles.name}>{user.user_metadata.full_name}</Text>
      )}
      {user?.email && <Text style={styles.email}>{user.email}</Text>}

      {/* ✅ زرار الـ Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>تسجيل الخروج</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0A1124' },
  name: { fontSize: 20, color: '#333', marginTop: 10, fontWeight: '600' },
  email: { fontSize: 16, color: '#666', marginTop: 6 },

  // ✅ ستايل زرار الـ Logout
  logoutBtn: {
    marginTop: 40,
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  logoutText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreen;
