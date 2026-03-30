import React from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { MUTED, NAVY } from './constants';
import { prayerNotesStyles as styles } from './styles';
import { getStrings } from '../../localization';

interface PrayerComposerProps {
  bottomOffset: number;
  composerHeight: number;
  editMode: boolean;
  newNote: string;
  saving: boolean;
  inputRef: React.RefObject<TextInput | null>;
  onLayoutHeight: (height: number) => void;
  onChangeText: (value: string) => void;
  onReset: () => void;
  onSubmit: () => void;
}

const PrayerComposer = ({
  bottomOffset,
  composerHeight,
  editMode,
  newNote,
  saving,
  inputRef,
  onLayoutHeight,
  onChangeText,
  onReset,
  onSubmit,
}: PrayerComposerProps) => {
  const strings = getStrings().prayerNotes;
  const quickAddWrapStyle = { bottom: bottomOffset };
  const secondaryFabStyle = saving ? styles.secondaryFabDisabled : null;
  const fabStyle = saving ? styles.fabDisabled : null;
  const sendIconStyle = editMode ? undefined : styles.sendIcon;

  return (
    <View
      style={[styles.quickAddWrap, quickAddWrapStyle]}
      onLayout={event => {
        const nextHeight = Math.ceil(event.nativeEvent.layout.height);
        if (nextHeight !== composerHeight) {
          onLayoutHeight(nextHeight);
        }
      }}
    >
      {editMode ? (
        <View style={styles.editBanner}>
          <Text style={styles.editBannerText}>{strings.editBanner}</Text>
          <TouchableOpacity onPress={onReset} hitSlop={8}>
            <MaterialCommunityIcons name="close" size={18} color={MUTED} />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.quickInputWrap}>
        <TextInput
          ref={inputRef}
          placeholder={
            editMode ? strings.editPlaceholder : strings.addPlaceholder
          }
          placeholderTextColor={MUTED}
          style={styles.quickInput}
          value={newNote}
          onChangeText={onChangeText}
          multiline
          textAlign="left"
        />
      </View>

      <View style={styles.quickActions}>
        {editMode ? (
          <TouchableOpacity
            style={[styles.secondaryFab, secondaryFabStyle]}
            onPress={onReset}
            disabled={saving}
          >
            <MaterialCommunityIcons name="close" size={18} color={NAVY} />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[styles.fab, fabStyle]}
          onPress={onSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <MaterialCommunityIcons
              name={editMode ? 'content-save' : 'send'}
              size={18}
              color="#FFF"
              style={sendIconStyle}
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PrayerComposer;
