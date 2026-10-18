import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function CustomTabBar({ state, descriptors, navigation }) {
  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        // Custom render for the prominent center "Novo Livro" button
        if (route.name === 'CriarObra') {
          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.85}
              onPress={onPress}
              style={styles.centerButtonWrapper}
            >
              <View style={[styles.centerCircle, isFocused && styles.centerCircleActive]}>
                <Ionicons name="add" size={28} color="#FFFFFF" />
              </View>
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                Novo Livro
              </Text>
            </TouchableOpacity>
          );
        }

        // Standard tabs
        let iconName = 'book-outline';
        let label = 'Estante';

        if (route.name === 'Estante') {
          iconName = isFocused ? 'library' : 'library-outline';
          label = 'Estante';
        } else if (route.name === 'Bau') {
          iconName = isFocused ? 'archive' : 'archive-outline';
          label = 'Baú';
        } else if (route.name === 'Perfil') {
          iconName = isFocused ? 'person' : 'person-outline';
          label = 'Perfil';
        }

        return (
          <TouchableOpacity
            key={route.key}
            activeOpacity={0.7}
            onPress={onPress}
            style={styles.tabItem}
          >
            <Ionicons
              name={iconName}
              size={22}
              color={isFocused ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceWarm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingTop: 8,
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: Platform.OS === 'ios' ? 84 : 68,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  centerButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  centerCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  centerCircleActive: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 1.05 }],
  },
  tabLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
    marginTop: 3,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});
