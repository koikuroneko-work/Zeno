import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import React from 'react';
import { colors } from '@/design/tokens';

interface ButtonProps {
  onPress: () => void;
  title: string;
  disabled?: boolean;
  loading?: boolean;
  outline?: boolean;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  disabled = false,
  loading = false,
  outline = false,
  children,
}) => {
  const backgroundColor = outline ? 'transparent' : disabled ? colors.disabled : colors.coral;
  const borderColor = outline ? colors.coral : 'transparent';
  const textColor = outline ? (disabled ? colors.disabled : colors.coral) : disabled ? colors.disabled : colors.surface;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={{ width: 24, height: 24, borderWidth: 2, borderColor: colors.border, borderTopColor: 'transparent', borderRadius: 12 }} />
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[styles.container, { backgroundColor, borderColor, borderWidth: outline ? 1 : 0 }]}
    >
      <Text style={[styles.text, { color: textColor }]}>
        {children ?? title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    fontSize: 16,
  },
});