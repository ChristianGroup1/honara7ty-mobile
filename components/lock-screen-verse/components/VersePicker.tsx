import React from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { PickerStep } from '../hooks/useLockScreenVerse';
import bibleDataJson from '../../data/bible.json';

const bibleData: any = bibleDataJson;

interface Props {
  visible: boolean;
  pickerStep: PickerStep;
  selectedBookIndex: number | null;
  selectedChapterIndex: number | null;
  selectedVerses: number[];
  onClose: () => void;
  onBack: () => void;
  onBookSelect: (index: number) => void;
  onChapterSelect: (index: number) => void;
  onVerseSelect: (index: number) => void;
  onConfirm: () => void;
  // colors
  background: string;
  cardColor: string;
  borderColor: string;
  textColor: string;
  mutedTextColor: string;
  accentColor: string;
}

const VersePicker = ({
  visible,
  pickerStep,
  selectedBookIndex,
  selectedChapterIndex,
  selectedVerses,
  onClose,
  onBack,
  onBookSelect,
  onChapterSelect,
  onVerseSelect,
  onConfirm,
  background,
  cardColor,
  borderColor,
  textColor,
  mutedTextColor,
  accentColor,
}: Props) => {
  const currentBook =
    selectedBookIndex !== null ? bibleData.books[selectedBookIndex] : null;
  const currentChapter =
    currentBook && selectedChapterIndex !== null
      ? currentBook.chapters[selectedChapterIndex]
      : null;

  const getTitle = () => {
    switch (pickerStep) {
      case 'book':
        return 'اختر السفر';
      case 'chapter':
        return `${currentBook?.name} - اختر الإصحاح`;
      case 'verse':
        return `${currentBook?.name} ${currentChapter?.chapter} - اختر العدد`;
    }
  };

  const renderContent = () => {
    switch (pickerStep) {
      case 'book':
        return (
          <FlatList
            key="book-list"
            data={bibleData.books}
            keyExtractor={(_, i) => `b-${i}`}
            numColumns={3}
            columnWrapperStyle={styles.pickerGrid}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[
                  styles.pickerItem,
                  { backgroundColor: cardColor, borderColor },
                ]}
                onPress={() => onBookSelect(index)}
              >
                <Text style={[styles.pickerItemText, { color: textColor }]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
          />
        );
      case 'chapter':
        return (
          <FlatList
            key="chapter-list"
            data={currentBook?.chapters || []}
            keyExtractor={(_, i) => `c-${i}`}
            numColumns={5}
            columnWrapperStyle={styles.pickerGrid}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[
                  styles.pickerNumItem,
                  { backgroundColor: cardColor, borderColor },
                ]}
                onPress={() => onChapterSelect(index)}
              >
                <Text style={[styles.pickerNumText, { color: textColor }]}>
                  {item.chapter}
                </Text>
              </TouchableOpacity>
            )}
          />
        );
      case 'verse':
        return (
          <View style={{ flex: 1 }}>
            <Text style={[styles.selectionHint, { color: mutedTextColor }]}>
              اضغط لاختيار آية أو أكثر
            </Text>
            <FlatList
              key="verse-list"
              style={{ flex: 1 }}
              data={currentChapter?.verses || []}
              keyExtractor={(_, i) => `v-${i}`}
              numColumns={5}
              columnWrapperStyle={styles.pickerGrid}
              contentContainerStyle={{ paddingBottom: 80 }}
              renderItem={({ index }) => {
                const isSelected = selectedVerses.includes(index);
                return (
                  <TouchableOpacity
                    style={[
                      styles.pickerNumItem,
                      { backgroundColor: cardColor, borderColor },
                      isSelected && {
                        backgroundColor: accentColor,
                        borderColor: accentColor,
                      },
                    ]}
                    onPress={() => onVerseSelect(index)}
                  >
                    <Text
                      style={[
                        styles.pickerNumText,
                        { color: textColor },
                        isSelected && { color: '#FFF' },
                      ]}
                    >
                      {index + 1}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
            <View
              style={[
                styles.confirmWrapper,
                { backgroundColor: background, borderTopColor: borderColor },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  { backgroundColor: accentColor },
                  selectedVerses.length === 0 && { opacity: 0.5 },
                ]}
                onPress={onConfirm}
                disabled={selectedVerses.length === 0}
              >
                <Text style={styles.confirmButtonText}>
                  تأكيد ({selectedVerses.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: background }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onBack}>
              <MaterialCommunityIcons
                name={pickerStep === 'book' ? 'close' : 'arrow-right'}
                size={24}
                color={textColor}
              />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: textColor }]}>
              {getTitle()}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={textColor}
              />
            </TouchableOpacity>
          </View>

          {/* Breadcrumb */}
          <View style={[styles.breadcrumb, { backgroundColor: cardColor }]}>
            {(['book', 'chapter', 'verse'] as PickerStep[]).map((step, i) => (
              <React.Fragment key={step}>
                {i > 0 && (
                  <MaterialCommunityIcons
                    name="chevron-left"
                    size={16}
                    color={mutedTextColor}
                  />
                )}
                <Text
                  style={[
                    styles.breadcrumbText,
                    { color: mutedTextColor },
                    pickerStep === step && {
                      color: accentColor,
                      fontWeight: '700',
                    },
                  ]}
                >
                  {step === 'book'
                    ? 'السفر'
                    : step === 'chapter'
                    ? 'الإصحاح'
                    : 'العدد'}
                </Text>
              </React.Fragment>
            ))}
          </View>

          {renderContent()}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    height: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '900' },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  breadcrumbText: { fontSize: 13 },
  pickerGrid: { paddingVertical: 8 },
  pickerItem: {
    flex: 1,
    maxWidth: '31%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  pickerItemText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  pickerNumItem: {
    flex: 1,
    maxWidth: '18%',
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 4,
  },
  pickerNumText: { fontSize: 16, fontWeight: 'bold' },
  selectionHint: { fontSize: 13, textAlign: 'center', marginVertical: 10 },
  confirmWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  confirmButton: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  confirmButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});

export default VersePicker;
