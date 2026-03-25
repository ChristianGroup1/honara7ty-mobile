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

interface ReflectionEditorModalProps {
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

const ReflectionEditorModal = ({
  visible,
  keyboardVisible,
  topInset,
  editMode,
  text,
  saving,
  onClose,
  onChangeText,
  onSave,
}: ReflectionEditorModalProps) => {
  const keyboardAvoidingViewStyle = styles.flexOne;
  const modalOverlayStyle = keyboardVisible ? styles.modalOverlayTransparent : null;
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
          <View
            style={[
              styles.modalOverlay,
              modalOverlayStyle,
            ]}
          >
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>
                {editMode ? 'تعديل التأمل' : 'تأمل جديد'}
              </Text>
              <Text style={styles.modalHint}>ماذا كلّمك الله اليوم؟</Text>

              <ScrollView
                contentContainerStyle={styles.modalScroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <TextInput
                  style={styles.modalInput}
                  multiline
                  placeholder="اكتب هنا..."
                  placeholderTextColor="#AAA"
                  value={text}
                  onChangeText={onChangeText}
                  textAlign="left"
                  textAlignVertical="top"
                />
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelBtnText}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, saveButtonStyle]}
                  onPress={onSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text
                      style={styles.saveBtnText}
                      accessibilityLabel={editMode ? 'حفظ التعديل' : 'إضافة التأمل'}
                    >
                      {editMode ? 'حفظ التعديل' : 'إضافة'}
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
