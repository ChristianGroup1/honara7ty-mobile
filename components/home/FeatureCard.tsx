import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { createHomeStyles } from './styles';
import { useNightMode } from '../../lib/nightMode';

interface FeatureCardProps {
  title: string;
  subtitle: string;
  icon: string;
  onPress: () => void;
}

const FeatureCard = ({ title, subtitle, icon, onPress }: FeatureCardProps) => {
  const { colors } = useNightMode();
  const styles = React.useMemo(() => createHomeStyles(colors), [colors]);

  return (
    <TouchableOpacity
      style={styles.featureCard}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={styles.featureIconCircle}>
        <MaterialCommunityIcons name={icon} size={26} color="#FFF" />
      </View>
      <View style={styles.featureCardBody}>
        <Text style={styles.featureCardTitle}>{title}</Text>
        <Text style={styles.featureCardSub}>{subtitle}</Text>
      </View>

      <View style={styles.featureChevron}>
        <MaterialCommunityIcons
          name="chevron-left"
          size={20}
          color={colors.accent}
        />
      </View>
    </TouchableOpacity>
  );
};

export default React.memo(FeatureCard);
