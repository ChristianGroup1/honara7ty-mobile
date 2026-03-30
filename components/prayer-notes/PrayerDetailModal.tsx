import React from 'react';
import { Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { prayerNotesStyles as styles } from './styles';
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
}: PrayerDetailModalProps) => {
  const strings = getStrings().prayerNotes;
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

          <ScrollView
            style={[styles.modalScroll, scrollStyle]}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.cardText}>{detailItem?.content ?? ''}</Text>
          </ScrollView>

          <View
            style={[
              styles.detailActions,
              isCompactWidth && styles.detailActionsCompact,
            ]}
          >
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>{strings.close}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, styles.saveBtnPrimary]}
              onPress={() => {
                if (detailItem) {
                  onClose();
                  onEdit(detailItem);
                }
              }}
            >
              <Text style={[styles.saveBtnText, styles.saveBtnTextLight]}>
                {strings.edit}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelBtn, styles.dangerBtn]}
              onPress={() => {
                if (detailItem) {
                  onDelete(detailItem);
                  onClose();
                }
              }}
            >
              <Text style={styles.dangerBtnText}>{strings.delete}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default PrayerDetailModal;
