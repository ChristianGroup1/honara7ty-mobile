import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { DANGER, PREVIEW_CHARS } from './constants';
import {
  prayerNotesStyles as styles,
  ThemedPrayerNotesStyles,
} from './styles';
import { PrayerNote } from './types';
import { getStrings } from '../../localization';

interface PrayerNoteCardProps {
  item: PrayerNote;
  isNarrowWidth: boolean;
  onToggleAnswered: (note: PrayerNote) => void;
  onOpenDetail: (note: PrayerNote) => void;
  onOpenEdit: (note: PrayerNote) => void;
  onDelete: (note: PrayerNote) => void;
  themedStyles: ThemedPrayerNotesStyles;
  answeredActionColor: string;
}

const PrayerNoteCard = ({
  item,
  isNarrowWidth,
  onToggleAnswered,
  onOpenDetail,
  onOpenEdit,
  onDelete,
  themedStyles,
  answeredActionColor,
}: PrayerNoteCardProps) => {
  const strings = getStrings().prayerNotes;
  const preview =
    item.content.trim().length === 0 && item.audio_uri
      ? strings.voice.fallbackTitle
      : item.content.length > PREVIEW_CHARS
      ? `${item.content.slice(0, PREVIEW_CHARS).trimEnd()}…`
      : item.content;
  const actionBorderStyle = item.is_answered
    ? styles.answeredIconBtn
    : styles.neutralIconBtn;
  const editActionStyle = item.is_answered
    ? styles.answeredIconBtn
    : styles.editIconBtn;
  const deleteActionStyle = item.is_answered
    ? styles.answeredIconBtn
    : styles.deleteIconBtn;

  return (
    <View
      style={[
        styles.card,
        themedStyles.card,
        isNarrowWidth && styles.cardCompact,
        item.is_answered && styles.answeredCard,
        item.is_answered && themedStyles.answeredCard,
      ]}
    >
      <View
        style={[
          styles.cardAccent,
          item.is_answered ? styles.cardAccentAnswered : null,
        ]}
      />

      <View style={styles.cardLeft}>
        <TouchableOpacity
          onPress={() => onToggleAnswered(item)}
          style={[
            styles.checkWrap,
            item.is_answered ? styles.checkWrapAnswered : null,
          ]}
        >
          <MaterialCommunityIcons
            name={
              item.is_answered
                ? 'check-circle'
                : 'checkbox-blank-circle-outline'
            }
            size={22}
            color={item.is_answered ? '#2D9C5A' : '#FFF'}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.cardBody}
        activeOpacity={0.95}
        onPress={() => onOpenDetail(item)}
      >
        <Text style={[styles.cardText, themedStyles.cardText]} numberOfLines={4}>
          {preview}
        </Text>
        {item.audio_uri ? (
          <View style={styles.voicePill}>
            <MaterialCommunityIcons name="microphone" size={14} color="#FFF" />
            <Text style={styles.voicePillText}>{strings.voice.fallbackTitle}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      <View
        style={[styles.cardActions, isNarrowWidth && styles.cardActionsCompact]}
      >
        <TouchableOpacity
          style={[
            styles.iconBtn,
            themedStyles.iconBtn,
            actionBorderStyle,
            item.is_answered && themedStyles.answeredIconBtn,
            editActionStyle,
            !item.is_answered && themedStyles.editIconBtn,
          ]}
          onPress={() => onOpenEdit(item)}
        >
          <MaterialCommunityIcons
            name="pencil"
            size={16}
            color={item.is_answered ? answeredActionColor : '#fff'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.iconBtn,
            themedStyles.iconBtn,
            actionBorderStyle,
            item.is_answered && themedStyles.answeredIconBtn,
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

export default React.memo(PrayerNoteCard);
