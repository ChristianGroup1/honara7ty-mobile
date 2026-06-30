import React from 'react';
import {
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { DevotionGroup } from '../../../lib/devotionGroups';
import { styles as defaultStyles } from './styles';
import { formatSharedReading, formatSharedTarget } from './utils';

type Props = {
  visible: boolean;
  group: DevotionGroup | null;
  strings: any;
  saving: boolean;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
  onClear: () => void;
  styles?: typeof defaultStyles;
};

const SharedReadingDetailsModal = ({
  visible,
  group,
  strings,
  saving,
  canManage,
  onClose,
  onEdit,
  onClear,
  styles = defaultStyles,
}: Props) => {
  const hasSharedReading = Boolean(group?.shared_reading_book);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.sharedReadingDetailsCard}>
          <View style={styles.editorHandle} />
          <View style={styles.sharedReadingDetailsHeader}>
            <View style={styles.sharedReadingDetailsIcon}>
              <MaterialCommunityIcons
                name="book-open-page-variant"
                size={24}
                color="#FFF"
              />
            </View>
            <View style={styles.sharedReadingDetailsHeading}>
              <Text style={styles.sharedReadingDetailsTitle}>
                {strings.sharedReadingTitle}
              </Text>
              <Text style={styles.sharedReadingDetailsSubtitle}>
                {formatSharedReading(
                  group?.shared_reading_book,
                  group?.shared_selected_chapters,
                )}
              </Text>
            </View>
          </View>

          <View style={styles.sharedReadingDetailsPanel}>
            <Text style={styles.sharedReadingDetailsLabel}>
              {strings.sharedTargetTitle}
            </Text>
            <Text style={styles.sharedReadingDetailsValue}>
              {formatSharedTarget(group?.shared_target_days)}
            </Text>
          </View>

          <View style={styles.modalActionsRow}>
            {canManage && hasSharedReading ? (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={onClear}
                disabled={saving}
              >
                <Text style={styles.clearBtnText}>
                  {strings.clearSharedReading}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeBtnText}>{strings.cancel}</Text>
              </TouchableOpacity>
            )}
            {canManage ? (
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={onEdit}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>
                  {hasSharedReading
                    ? strings.editSharedReading
                    : strings.setSharedReading}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default React.memo(SharedReadingDetailsModal);
