import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { DANGER, GOLD, MUTED, NAVY, PREVIEW_CHARS } from './constants';
import { prayerNotesStyles as styles } from './styles';
import { PrayerNote } from './types';

interface PrayerNoteCardProps {
  item: PrayerNote;
  isNarrowWidth: boolean;
  onToggleAnswered: (note: PrayerNote) => void;
  onOpenDetail: (note: PrayerNote) => void;
  onOpenEdit: (note: PrayerNote) => void;
  onDelete: (note: PrayerNote) => void;
}

const PrayerNoteCard = ({
  item,
  isNarrowWidth,
  onToggleAnswered,
  onOpenDetail,
  onOpenEdit,
  onDelete,
}: PrayerNoteCardProps) => {
  const preview =
    item.content.length > PREVIEW_CHARS
      ? `${item.content.slice(0, PREVIEW_CHARS).trimEnd()}…`
      : item.content;
  const actionBorderStyle = item.is_answered ? styles.answeredIconBtn : styles.neutralIconBtn;
  const editActionStyle = item.is_answered ? styles.answeredIconBtn : styles.editIconBtn;
  const deleteActionStyle = item.is_answered ? styles.answeredIconBtn : styles.deleteIconBtn;

  return (
    <View
      style={[
        styles.card,
        isNarrowWidth && styles.cardCompact,
        item.is_answered && styles.answeredCard,
      ]}
    >
      <View style={styles.cardLeft}>
        <TouchableOpacity
          onPress={() => onToggleAnswered(item)}
          style={styles.checkWrap}
        >
          <MaterialCommunityIcons
            name={
              item.is_answered
                ? 'check-circle'
                : 'checkbox-blank-circle-outline'
            }
            size={22}
            color={item.is_answered ? GOLD : MUTED}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.cardBody}
        activeOpacity={0.95}
        onPress={() => onOpenDetail(item)}
      >
        <Text style={styles.cardText} numberOfLines={4}>
          {preview}
        </Text>
      </TouchableOpacity>

      <View style={[styles.cardActions, isNarrowWidth && styles.cardActionsCompact]}>
        <TouchableOpacity
          style={[
            styles.iconBtn,
            actionBorderStyle,
            editActionStyle,
          ]}
          onPress={() => onOpenEdit(item)}
        >
          <MaterialCommunityIcons
            name="pencil"
            size={16}
            color={item.is_answered ? NAVY : '#fff'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.iconBtn,
            actionBorderStyle,
            deleteActionStyle,
          ]}
          onPress={() => onDelete(item)}
        >
          <MaterialCommunityIcons
            name="trash-can-outline"
            size={16}
            color={item.is_answered ? DANGER : '#fff'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PrayerNoteCard;
