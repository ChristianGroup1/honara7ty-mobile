import React from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { prayerNotesStyles as styles } from './styles';
import { getStrings } from '../../localization';

interface PrayerEditorModalProps {
  visible: boolean;
  keyboardVisible: boolean;
  topInset: number;
  editMode: boolean;
  text: string;
  saving: boolean;
  onClose: () => void;
  onChangeText: (value: string) => void;
  onSave: () => void;
}

const PrayerEditorModal = ({
  visible,
  keyboardVisible,
  topInset,
  editMode,
  text,
  saving,
  onClose,
  onChangeText,
  onSave,
}: PrayerEditorModalProps) => {
  const strings = getStrings().prayerNotes;
  const modalOverlayStyle = keyboardVisible
    ? styles.modalOverlayTransparent
    : null;
  const saveButtonStyle = saving ? styles.saveBtnDisabled : null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <TouchableWithoutFeedback
        onPress={() => {
          if (keyboardVisible) {
            Keyboard.dismiss();
          } else {
            onClose();
          }
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={topInset}
          style={styles.flexOne}
        >
          <View style={[styles.modalOverlay, modalOverlayStyle]}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>
                {editMode ? strings.editor.editTitle : strings.editor.newTitle}
              </Text>
              <Text style={styles.modalHint}>{strings.editor.hint}</Text>

              <ScrollView
                contentContainerStyle={styles.modalScroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <TextInput
                  style={styles.modalInput}
                  multiline
                  placeholder={strings.editor.placeholder}
                  placeholderTextColor="#AAA"
                  value={text}
                  onChangeText={onChangeText}
                  textAlign="right"
                  textAlignVertical="top"
                />
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelBtnText}>{strings.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, saveButtonStyle]}
                  onPress={onSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>
                      {editMode ? strings.editor.saveEdit : strings.editor.add}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default PrayerEditorModal;
