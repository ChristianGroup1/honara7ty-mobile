import React from 'react';
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
  value: string;
  onChangeText?: (text: string) => void;
  icon: string;
  isPassword?: boolean;
  secureText?: boolean;
  setSecureText?: (val: boolean) => void;
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
  error,
  badge,
  editable = true,
  onPress,
  keyboardType,
  autoCapitalize,
}) => {
  const handleChangeText = (text: string) => {
    if (!onChangeText) return;
    onChangeText(text.replace(/\n/g, ''));
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
        value={value}
        onChangeText={handleChangeText}
        multiline={!isPassword}
        secureTextEntry={isPassword ? secureText : false}
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
        autoCorrect={false}
        autoComplete="off"
        textContentType="none"
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
