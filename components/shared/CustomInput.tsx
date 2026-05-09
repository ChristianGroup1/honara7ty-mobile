import React from 'react';
import {
  I18nManager,
  Platform,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardTypeOptions,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import TextInputInteractive from 'react-native-text-input-interactive';
import { getStrings } from '../../localization';

const ChevronDownIcon = () => (
  <MaterialCommunityIcons name="chevron-down" size={22} color="#999" />
);

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
  const strings = getStrings().shared;
  const isRTL = I18nManager.isRTL;

  const handleChangeText = (text: string) => {
    if (!onChangeText) return;
    onChangeText(text.replace(/\n/g, ''));
  };

  const isPressableField = Boolean(onPress);

  const inputArea = (
    <View style={styles.inputSurface}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={
          isPassword && setSecureText
            ? () => setSecureText(!secureText)
            : undefined
        }
        style={styles.inputIcon}
        accessibilityLabel={
          isPassword
            ? secureText
              ? strings.input.showPassword
              : strings.input.hidePassword
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

      {isPressableField ? (
        <View
          style={[
            styles.staticInputContent,
            isRTL ? styles.staticInputRtl : styles.staticInputLtr,
          ]}
        >
          <Text
            style={[
              styles.staticInputText,
              !value ? styles.staticInputPlaceholder : null,
              styles.staticInputTextAlign,
            ]}
            numberOfLines={1}
          >
            {value || placeholder}
          </Text>
          <ChevronDownIcon />
        </View>
      ) : (
        <TextInputInteractive
          style={styles.inputField}
          textInputStyle={[styles.interactiveInput]}
          placeholder={placeholder}
          value={value}
          onChangeText={handleChangeText}
          multiline={Platform.OS === 'ios' ? false : !isPassword}
          secureTextEntry={isPassword ? secureText : false}
          mainColor="#0A1124"
          originalColor="#E0E0E0"
          animatedPlaceholderTextColor="#999"
          returnKeyType="done"
          textAlignVertical="center"
          editable={editable}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          autoComplete="off"
          textContentType="none"
        />
      )}
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
    flexDirection: 'row',
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
  inputSurface: {
    width: '100%',
    height: 54,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 14,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  inputField: {
    flex: 1,
  },
  inputIcon: {
    width: 24,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  interactiveInput: {
    color: '#0A1124',
    fontSize: 14,
    backgroundColor: 'transparent',
    height: 54,
    borderRadius: 14,
    width: '100%',
    borderWidth: 0,
    textAlign: 'right',
  },
  interactiveInputRtl: {
    textAlign: 'right',
    paddingRight: 16,
    paddingLeft: 0,
  },
  interactiveInputLtr: {
    textAlign: 'left',
    paddingRight: 0,
    paddingLeft: 16,
  },
  staticInputContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  staticInputRtl: {
    flexDirection: 'row',
    paddingRight: 16,
    paddingLeft: 0,
    justifyContent: 'space-between',
  },
  staticInputLtr: {
    paddingLeft: 16,
    paddingRight: 0,
    justifyContent: 'space-between',
  },
  staticInputText: {
    flex: 1,
    fontSize: 14,
    color: '#0A1124',
  },
  staticInputTextAlign: {
    textAlign: 'left',
  },
  staticInputPlaceholder: {
    color: '#999',
  },
  staticInputTextRtl: {
    textAlign: 'right',
  },
  staticInputTextLtr: {
    textAlign: 'left',
  },
  fieldError: {
    color: '#E53935',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'left',
  },
});

export default CustomInput;
