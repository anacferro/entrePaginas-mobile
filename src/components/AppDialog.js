import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius, shadow } from '../theme/tokens';
import { dialog } from '../services/dialog';

export default function AppDialog() {
  const { colors } = useTheme();
  const [item, setItem] = useState(null);

  useEffect(() => dialog.subscribe(setItem), []);

  if (!item) return <Modal visible={false} transparent />;

  const buttons = item.buttons?.length ? item.buttons : [{ text: 'OK' }];
  const cancel = buttons.find((b) => b.style === 'cancel');
  const ordered = [...buttons.filter((b) => b.style === 'cancel'), ...buttons.filter((b) => b.style !== 'cancel')];

  const choose = (button) => {
    dialog.dismiss();
    button.onPress?.();
  };
  const close = () => {
    if (cancel) choose(cancel);
    else if (buttons.length === 1) choose(buttons[0]);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={close}>
        <Pressable
          accessibilityRole="alert"
          style={[styles.box, shadow.raised, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {}}
        >
          <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
          {!!item.message && <Text style={[styles.message, { color: colors.textSecondary }]}>{item.message}</Text>}
          <View style={styles.actions}>
            {ordered.map((button, index) => {
              const primary = index === ordered.length - 1;
              const destructive = button.style === 'destructive';
              const fill = destructive ? colors.danger : colors.primary;
              return (
                <Pressable
                  key={`${button.text}-${index}`}
                  accessibilityRole="button"
                  onPress={() => choose(button)}
                  style={({ pressed }) => [
                    styles.button,
                    primary ? { backgroundColor: fill, borderColor: fill } : { borderColor: colors.border },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={[styles.buttonText, { color: primary ? colors.onPrimary : colors.text }]}>{button.text || 'OK'}</Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  box: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    lineHeight: 21,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  button: {
    minWidth: 88,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
