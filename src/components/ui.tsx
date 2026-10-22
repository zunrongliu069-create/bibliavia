import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import { colors, radius, shadow } from '../theme';

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ProgressBar({ value, color = colors.primary }: { value: number; color?: string }) {
  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
    >
      <View
        style={[
          styles.fill,
          { width: `${Math.max(0, Math.min(1, value)) * 100}%`, backgroundColor: color },
        ]}
      />
    </View>
  );
}

export function Button({
  label,
  variant = 'primary',
  loading,
  ...props
}: PressableProps & {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
}) {
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      disabled={props.disabled || loading}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        pressed && styles.pressed,
        (props.disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.white : colors.ink} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant === 'primary' && styles.primaryText,
            variant === 'danger' && styles.dangerText,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function BottomNavigation({
  backLabel,
  continueLabel,
  onBack,
  onContinue,
  continueDisabled = false,
}: {
  backLabel: string;
  continueLabel: string;
  onBack: () => void;
  onContinue: () => void;
  continueDisabled?: boolean;
}) {
  return (
    <View style={styles.bottomNavigation}>
      <View style={styles.bottomNavigationAction}>
        <Button label={backLabel} variant="secondary" onPress={onBack} />
      </View>
      <View style={styles.bottomNavigationAction}>
        <Button label={continueLabel} disabled={continueDisabled} onPress={onContinue} />
      </View>
    </View>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 18,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.line,
    ...shadow,
  },
  track: {
    height: 9,
    borderRadius: radius.pill,
    backgroundColor: '#D4C49F',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#A98645',
  },
  fill: { height: '100%', borderRadius: radius.pill },
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: '#B3832F',
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.primarySoft },
  ghost: { backgroundColor: 'transparent', borderColor: colors.line },
  danger: { backgroundColor: '#FBE4E0' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.45 },
  buttonText: { color: colors.ink, fontSize: 15, fontWeight: '800', letterSpacing: 0.25 },
  primaryText: { color: colors.white },
  dangerText: { color: '#A83B2F' },
  eyebrow: { fontSize: 12, fontWeight: '900', color: '#8A641F', letterSpacing: 1.15 },
  bottomNavigation: { flexDirection: 'row', gap: 12, marginTop: 10 },
  bottomNavigationAction: { flex: 1 },
});
