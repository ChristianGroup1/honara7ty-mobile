import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  prayerNotesStyles as styles,
  ThemedPrayerNotesStyles,
} from './styles';
import { PrayerNote } from './types';
import { getStrings } from '../../localization';

interface PrayerDetailModalProps {
  visible: boolean;
  keyboardVisible: boolean;
  detailItem: PrayerNote | null;
  windowHeight: number;
  isCompactWidth: boolean;
  onClose: () => void;
  onEdit: (note: PrayerNote) => void;
  onDelete: (note: PrayerNote) => void;
  themedStyles: ThemedPrayerNotesStyles;
}

const PrayerDetailModal = ({
  visible,
  keyboardVisible,
  detailItem,
  windowHeight,
  isCompactWidth,
  onClose,
  onEdit,
  onDelete,
  themedStyles,
}: PrayerDetailModalProps) => {
  const strings = getStrings().prayerNotes;
  const modalOverlayStyle = keyboardVisible
    ? styles.modalOverlayTransparent
    : null;
  const scrollStyle = { maxHeight: Math.min(windowHeight * 0.6, 420) };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.modalOverlay, modalOverlayStyle]}>
        <Pressable style={styles.modalPressable} onPress={onClose} />
        <View
          style={[styles.modalBox, styles.modalBoxPadded, themedStyles.modalBox]}
        >
          <Text style={[styles.modalTitle, themedStyles.modalTitle]}>
            {strings.detailTitle}
          </Text>

          <ScrollView
            style={[
              styles.modalScrollArea,
              themedStyles.modalScrollArea,
              scrollStyle,
            ]}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.cardText, themedStyles.cardText]}>
              {detailItem?.content ?? ''}
            </Text>
          </ScrollView>

          <View
            style={[
              styles.detailActions,
              isCompactWidth && styles.detailActionsCompact,
            ]}
          >
            <TouchableOpacity
              style={[styles.secondaryBtn, themedStyles.secondaryBtn]}
              onPress={onClose}
            >
              <Text style={[styles.cancelBtnText, themedStyles.cancelBtnText]}>
                {strings.close}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, themedStyles.saveBtn]}
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

export default PrayerDetailModal;
