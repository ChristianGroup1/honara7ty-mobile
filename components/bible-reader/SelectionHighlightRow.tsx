import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppTheme } from '../../lib/nightMode';
import { HIGHLIGHT_COLORS } from './constants';
import type { HighlightColor } from './types';

type SelectionHighlightRowStyles = ReturnType<
  typeof import('./styles').createStyles
>;

type Props = {
  styles: SelectionHighlightRowStyles;
  colors: AppTheme['colors'];
  selectedHighlightColor: HighlightColor | null;
  onHighlight: (color: HighlightColor) => void;
  onRemoveHighlight: () => void;
};

const SelectionHighlightRow = ({
  styles,
  colors,
  selectedHighlightColor,
  onHighlight,
  onRemoveHighlight,
}: Props) => (
  <>
    <View style={styles.selectionBarDivider} />

    {HIGHLIGHT_COLORS.map(highlightColor => {
      const active = selectedHighlightColor === highlightColor;
      return (
        <TouchableOpacity
          key={highlightColor}
          testID={`highlight-selected-${highlightColor}`}
          style={[
            styles.selectionBarSwatch,
            { backgroundColor: highlightColor },
            active && styles.selectionBarSwatchActive,
          ]}
          activeOpacity={0.82}
          onPress={() => onHighlight(highlightColor)}
        >
          {active ? (
            <MaterialCommunityIcons name="check" size={14} color="#0A1124" />
          ) : null}
        </TouchableOpacity>
      );
    })}

    <TouchableOpacity
      testID="remove-highlight-selected-verses-button"
      style={styles.selectionEraser}
      activeOpacity={0.82}
      onPress={onRemoveHighlight}
    >
      <MaterialCommunityIcons
        name="format-color-marker-cancel"
        size={18}
        color={colors.mutedText}
      />
    </TouchableOpacity>
  </>
);

export default React.memo(SelectionHighlightRow);
