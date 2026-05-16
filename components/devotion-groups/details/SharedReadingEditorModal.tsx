import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BibleBook, Testament } from '../../data/bibleMetadata';
import BiblePassagePicker from '../../shared/BiblePassagePicker';
import { CUSTOM_TARGET_VALUE, TARGET_DAY_OPTIONS } from './constants';
import { styles } from './styles';
import { formatSharedTarget } from './utils';

type Props = {
  visible: boolean;
  strings: any;
  saving: boolean;
  hasSharedReading: boolean;
  selectedTestament: Testament;
  selectedBook: string;
  selectedChapters: number[];
  selectedTargetDays: number | null;
  customTargetDays: string;
  booksForTestament: BibleBook[];
  chapterOptions: number[];
  canSave: boolean;
  onClose: () => void;
  onClear: () => void;
  onSave: () => void;
  onSetTestament: (value: Testament) => void;
  onSetBook: (value: string) => void;
  onClearChapters: () => void;
  onToggleChapter: (value: number) => void;
  onSelectAllChapters: () => void;
  onSelectTargetDays: (value: number | null) => void;
  onSetCustomTargetDays: (value: string) => void;
};

const SharedReadingEditorModal = ({
  visible,
  strings,
  saving,
  hasSharedReading,
  selectedTestament,
  selectedBook,
  selectedChapters,
  selectedTargetDays,
  customTargetDays,
  booksForTestament,
  chapterOptions,
  canSave,
  onClose,
  onClear,
  onSave,
  onSetTestament,
  onSetBook,
  onClearChapters,
  onToggleChapter,
  onSelectAllChapters,
  onSelectTargetDays,
  onSetCustomTargetDays,
}: Props) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.editorCard}>
        <View style={styles.editorHandle} />
        <Text style={styles.editorTitle}>
          {strings.sharedReadingEditorTitle}
        </Text>
        <Text style={styles.editorSubtitle}>
          {strings.sharedReadingEditorSubtitle}
        </Text>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.editorScrollContent}
        >
          <BiblePassagePicker
            labels={{
              bookTitle: strings.selectBook,
              chapterTitle: strings.selectChapters,
              chapterHint: strings.sharedReadingChapterHint,
              selectBookFirst: strings.selectBookFirst,
              oldTestament: strings.oldTestament,
              newTestament: strings.newTestament,
              bookCountSuffix: strings.bookCount,
              selectAllChapters: strings.selectAllChapters,
            }}
            selectedTestament={selectedTestament}
            books={booksForTestament}
            selectedBook={selectedBook}
            chapterOptions={chapterOptions}
            selectedChapters={selectedChapters}
            onSetTestament={onSetTestament}
            onSetBook={bookName => {
              onSetBook(bookName);
              onClearChapters();
            }}
            onSelectAllChapters={onSelectAllChapters}
            onClearChapters={onClearChapters}
            onToggleChapter={onToggleChapter}
          />
          <TargetPicker
            strings={strings}
            selectedTargetDays={selectedTargetDays}
            customTargetDays={customTargetDays}
            onSelectTargetDays={onSelectTargetDays}
            onSetCustomTargetDays={onSetCustomTargetDays}
          />
        </ScrollView>

        <View style={styles.modalActionsRow}>
          {hasSharedReading ? (
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
          <TouchableOpacity
            style={[
              styles.saveBtn,
              (saving || !canSave) && styles.saveBtnDisabled,
            ]}
            onPress={onSave}
            disabled={saving || !canSave}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveBtnText}>
                {strings.saveSharedReading}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const TargetPicker = ({
  strings,
  selectedTargetDays,
  customTargetDays,
  onSelectTargetDays,
  onSetCustomTargetDays,
}: any) => (
  <>
    <Text style={styles.fieldTitle}>{strings.sharedTargetTitle}</Text>
    <Text style={styles.rangeHint}>{strings.sharedTargetHint}</Text>
    <View style={styles.targetOptionsWrap}>
      {[...TARGET_DAY_OPTIONS, CUSTOM_TARGET_VALUE].map(targetDays => (
        <TouchableOpacity
          key={`target-${targetDays ?? 'none'}`}
          style={[
            styles.targetOption,
            selectedTargetDays === targetDays && styles.targetOptionSelected,
          ]}
          onPress={() => onSelectTargetDays(targetDays)}
        >
          <Text
            style={[
              styles.targetOptionText,
              selectedTargetDays === targetDays &&
                styles.targetOptionTextSelected,
            ]}
          >
            {targetDays === CUSTOM_TARGET_VALUE
              ? strings.customTarget
              : formatSharedTarget(targetDays)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
    {selectedTargetDays === CUSTOM_TARGET_VALUE ? (
      <TextInput
        style={styles.targetInput}
        value={customTargetDays}
        onChangeText={(value: string) =>
          onSetCustomTargetDays(value.replace(/[^0-9]/g, ''))
        }
        placeholder={strings.customTargetPlaceholder}
        placeholderTextColor="#98A2B3"
        keyboardType="number-pad"
        textAlign="center"
      />
    ) : null}
  </>
);

export default React.memo(SharedReadingEditorModal);
