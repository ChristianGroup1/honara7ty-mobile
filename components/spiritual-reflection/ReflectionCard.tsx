import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { spiritualReflectionStyles as styles, GOLD } from './styles';
import { Reflection } from './types';
import { formatDate, PREVIEW_LIMIT } from './utils';

interface ReflectionCardProps {
  item: Reflection;
  isNarrowWidth: boolean;
  onOpenDetail: (item: Reflection) => void;
  onOpenEdit: (item: Reflection) => void;
  onDelete: (item: Reflection) => void;
}

const ReflectionCard = ({
  item,
  isNarrowWidth,
  onOpenDetail,
  onOpenEdit,
  onDelete,
}: ReflectionCardProps) => {
  const preview =
    item.content.length > PREVIEW_LIMIT
      ? `${item.content.slice(0, PREVIEW_LIMIT).trimEnd()}…`
      : item.content;

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={() => onOpenDetail(item)}
      style={[styles.card, isNarrowWidth && styles.cardCompact]}
    >
      <View style={styles.cardAccent} />

      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <View style={styles.cardDatePill}>
            <MaterialCommunityIcons
              name="calendar-outline"
              size={14}
              color={GOLD}
            />
            <Text style={styles.dateText}>{formatDate(item.date)}</Text>
          </View>
        </View>

        <Text style={styles.cardContent}>{preview}</Text>
      </View>

      <View
        style={[styles.actionGroup, isNarrowWidth && styles.actionGroupCompact]}
      >
        <TouchableOpacity
          onPress={() => onOpenEdit(item)}
          style={[styles.actionBtnCircle, styles.editBtn]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="pencil" size={16} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onDelete(item)}
          style={[styles.actionBtnCircle, styles.trashBtn]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="trash-can-outline"
            size={16}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default React.memo(ReflectionCard);
