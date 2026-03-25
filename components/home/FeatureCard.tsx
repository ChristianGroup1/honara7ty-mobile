import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { homeStyles as styles } from './styles';
import { NAVY } from './constants';

interface FeatureCardProps {
  title: string;
  subtitle: string;
  icon: string;
  onPress: () => void;
}

const FeatureCard = ({ title, subtitle, icon, onPress }: FeatureCardProps) => {
  return (
    <TouchableOpacity
      style={styles.featureCard}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <MaterialCommunityIcons name="chevron-right" size={22} color="#CCC" />
      <View style={styles.featureCardBody}>
        <Text style={styles.featureCardTitle}>{title}</Text>
        <Text style={styles.featureCardSub}>{subtitle}</Text>
      </View>
      <View style={styles.featureIconCircle}>
        <MaterialCommunityIcons name={icon} size={26} color={NAVY} />
      </View>
    </TouchableOpacity>
  );
};

export default FeatureCard;
