import React from 'react';
import { Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { spiritualReflectionStyles as styles } from './styles';
import { Reflection } from './types';
import { formatDate } from './utils';
import { getStrings } from '../../localization';

interface ReflectionDetailModalProps {
  visible: boolean;
  keyboardVisible: boolean;
  detailItem: Reflection | null;
  windowHeight: number;
  isCompactWidth: boolean;
  onClose: () => void;
  onEdit: (item: Reflection) => void;
  onDelete: (item: Reflection) => void;
}

const ReflectionDetailModal = ({
  visible,
  keyboardVisible,
  detailItem,
  windowHeight,
  isCompactWidth,
  onClose,
  onEdit,
  onDelete,
}: ReflectionDetailModalProps) => {
  const strings = getStrings().spiritualReflection;
  const modalOverlayStyle = keyboardVisible ? styles.modalOverlayTransparent : null;
  const scrollStyle = { maxHeight: Math.min(windowHeight * 0.6, 420) };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View
        style={[
          styles.modalOverlay,
          modalOverlayStyle,
        ]}
      >
        <Pressable style={styles.modalPressable} onPress={onClose} />
        <View style={[styles.modalBox, styles.modalBoxPadded]}>
          <Text style={styles.modalTitle}>{strings.detailTitle}</Text>
          <Text style={styles.modalHint}>
            {detailItem ? formatDate(detailItem.date) : ''}
          </Text>

          <ScrollView
            style={[styles.modalScrollArea, scrollStyle]}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.cardContent}>{detailItem?.content ?? ''}</Text>
          </ScrollView>

          <View
            style={[
              styles.modalActions,
              isCompactWidth && styles.modalActionsCompact,
            ]}
          >
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>{strings.close}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => {
                if (detailItem) {
                  onClose();
                  onEdit(detailItem);
                }
              }}
            >
              <Text style={styles.saveBtnText}>{strings.edit}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => {
                if (detailItem) {
                  onDelete(detailItem);
                  onClose();
                }
              }}
            >
              <Text style={styles.deleteBtnText}>{strings.delete}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ReflectionDetailModal;
