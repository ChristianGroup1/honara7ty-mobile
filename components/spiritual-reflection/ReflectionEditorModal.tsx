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
import { spiritualReflectionStyles as styles } from './styles';
import type { ThemedSpiritualReflectionStyles } from './styles';
import { getStrings } from '../../localization';
import VoiceMemoRecorder from '../shared/VoiceMemoRecorder';

interface ReflectionEditorModalProps {
  visible: boolean;
  keyboardVisible: boolean;
  topInset: number;
  editMode: boolean;
  text: string;
  audioUri?: string | null;
  audioDurationMs?: number | null;
  saving: boolean;
  onClose: () => void;
  onChangeText: (value: string) => void;
  onChangeAudio: (audioUri: string | null, durationMs: number | null) => void;
  onSave: () => void;
  themedStyles: ThemedSpiritualReflectionStyles;
  placeholderTextColor: string;
}

const ReflectionEditorModal = ({
  visible,
  keyboardVisible,
  topInset,
  editMode,
  text,
  audioUri,
  audioDurationMs,
  saving,
  onClose,
  onChangeText,
  onChangeAudio,
  onSave,
  themedStyles,
  placeholderTextColor,
}: ReflectionEditorModalProps) => {
  const strings = getStrings().spiritualReflection;
  const keyboardAvoidingViewStyle = styles.flexOne;
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
          style={keyboardAvoidingViewStyle}
        >
          <View style={[styles.modalOverlay, modalOverlayStyle]}>
            <View style={[styles.modalBox, themedStyles.modalBox]}>
              <Text style={[styles.modalTitle, themedStyles.modalTitle]}>
                {editMode ? strings.editor.editTitle : strings.editor.newTitle}
              </Text>
              <Text style={[styles.modalHint, themedStyles.modalHint]}>
                {strings.editor.hint}
              </Text>

              <ScrollView
                contentContainerStyle={styles.modalScroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <TextInput
                  style={[styles.modalInput, themedStyles.modalInput]}
                  multiline
                  placeholder={strings.editor.placeholder}
                  placeholderTextColor={placeholderTextColor}
                  value={text}
                  onChangeText={onChangeText}
                  textAlign="right"
                  textAlignVertical="top"
                />
                <VoiceMemoRecorder
                  audioUri={audioUri}
                  durationMs={audioDurationMs}
                  onChange={onChangeAudio}
                  disabled={saving}
                  labels={strings.voice}
                />
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelBtn, themedStyles.cancelBtn]}
                  onPress={onClose}
                >
                  <Text style={[styles.cancelBtnText, themedStyles.cancelBtnText]}>
                    {strings.cancel}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, themedStyles.saveBtn, saveButtonStyle]}
                  onPress={onSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text
                      style={styles.saveBtnText}
                      accessibilityLabel={
                        editMode
                          ? strings.editor.saveEdit
                          : strings.editor.addReflection
                      }
                    >
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

export default ReflectionEditorModal;
