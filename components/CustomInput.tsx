import React, { useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardTypeOptions,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import TextInputInteractive from 'react-native-text-input-interactive';

interface Props {
  fieldLabel?: string;
  placeholder?: string;
  value: string; // real value
  onChangeText?: (text: string) => void; // receives real value
  icon: string;
  isPassword?: boolean;

  // when true => password is hidden (shows ***). when false => shows real text
  secureText?: boolean;
  setSecureText?: (val: boolean) => void;

  // NEW: if true, we will mask with '*' manually and NOT use secureTextEntry
  maskPasswordWithAsterisk?: boolean;

  error?: string;
  badge?: string;
  editable?: boolean;
  onPress?: () => void;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

const CustomInput: React.FC<Props> = ({
  fieldLabel,
  placeholder,
  value,
  onChangeText,
  icon,
  isPassword = false,
  secureText = true,
  setSecureText,
  maskPasswordWithAsterisk = false,
  error,
  badge,
  editable = true,
  onPress,
  keyboardType,
  autoCapitalize,
}) => {
  const lastRealValueRef = useRef(value);
  lastRealValueRef.current = value;

  const isManualAsteriskMask = isPassword;

  const displayValue = useMemo(() => {
    if (!isManualAsteriskMask) return value;
    return secureText ? '*'.repeat(value.length) : value;
  }, [isManualAsteriskMask, secureText, value]);

  const handleChangeText = (text: string) => {
    if (!onChangeText) return;

    // remove new lines always (your original behavior)
    const cleaned = text.replace(/\n/g, '');

    // normal input OR password visible => pass-through
    if (!isManualAsteriskMask || !secureText) {
      onChangeText(cleaned);
      return;
    }

    // Manual '*' masking + hidden:
    // We infer edits by comparing with the previous "display" (which was *****).
    // This works best for typical typing/backspace at the end.
    const prevReal = lastRealValueRef.current;
    const prevDisplay = '*'.repeat(prevReal.length);

    if (cleaned.length < prevDisplay.length) {
      // user deleted characters (assume delete from end)
      onChangeText(prevReal.slice(0, cleaned.length));
      return;
    }

    if (cleaned.length > prevDisplay.length) {
      // user added characters (assume typed/pasted at end)
      const addedCount = cleaned.length - prevDisplay.length;
      const added = cleaned.slice(-addedCount);
      onChangeText(prevReal + added);
      return;
    }

    // same length: ignore
    onChangeText(prevReal);
  };

  const inputArea = (
    <View style={styles.textInputContainer}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={
          isPassword && setSecureText
            ? () => setSecureText(!secureText)
            : undefined
        }
        style={styles.inputIconLeft}
        accessibilityLabel={
          isPassword
            ? secureText
              ? 'إظهار كلمة المرور'
              : 'إخفاء كلمة المرور'
            : fieldLabel
        }
      >
        <MaterialCommunityIcons
          name={
            isPassword ? (secureText ? 'eye-off-outline' : 'eye-outline') : icon
          }
          size={22}
          color="#999"
        />
      </TouchableOpacity>

      <TextInputInteractive
        style={{ width: '100%' }}
        textInputStyle={[
          styles.interactiveInput,
          onPress ? { paddingRight: 48 } : {},
        ]}
        placeholder={placeholder}
        value={displayValue}
        onChangeText={handleChangeText}
        multiline={true}
        // IMPORTANT:
        // - if manual mask => do NOT use secureTextEntry
        // - else use native secureTextEntry
        secureTextEntry={
          isManualAsteriskMask ? false : isPassword ? secureText : false
        }
        mainColor="#0A1124"
        originalColor="#E0E0E0"
        animatedPlaceholderTextColor="#999"
        enableIcon={!!onPress}
        ImageComponent={
          onPress
            ? () => (
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={22}
                  color="#999"
                />
              )
            : undefined
        }
        returnKeyType="done"
        textAlignVertical="center"
        editable={editable && !onPress}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );

  return (
    <View style={styles.inputWrapper}>
      {(!!fieldLabel || !!badge) && (
        <View style={styles.fieldLabelRow}>
          {!!fieldLabel && <Text style={styles.fieldLabel}>{fieldLabel}</Text>}
          {!!badge && <Text style={styles.optionalBadge}>{badge}</Text>}
        </View>
      )}

      {onPress ? (
        <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
          {inputArea}
        </TouchableOpacity>
      ) : (
        inputArea
      )}

      {!!error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  inputWrapper: { marginBottom: 14 },
  fieldLabelRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0A1124',
    textAlign: 'right',
  },
  optionalBadge: {
    fontSize: 11,
    color: '#AAA',
    backgroundColor: '#F0F0F0',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  textInputContainer: {
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
  },
  inputIconLeft: {
    position: 'absolute',
    left: 12,
    height: 54,
    justifyContent: 'center',
    zIndex: 2,
  },
  interactiveInput: {
    textAlign: 'right',
    paddingLeft: 48,
    paddingRight: 16,
    color: '#0A1124',
    fontSize: 14,
    backgroundColor: '#FFF',
    height: 54,
    borderRadius: 14,
    width: '100%',
  },
  fieldError: {
    color: '#E53935',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
});

export default CustomInput;
