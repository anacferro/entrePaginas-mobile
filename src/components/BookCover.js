import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function BookCover({
  title = 'Sem Título',
  coverColor = '#215C50',
  titleColor = '#FFFFFF',
  totalPages = 0,
  size = 'medium', // 'small' | 'medium' | 'large'
  style,
}) {
  const dimensions = {
    small: { width: 110, height: 160, titleSize: 13, pageCountSize: 9, spineWidth: 5 },
    medium: { width: 155, height: 230, titleSize: 16, pageCountSize: 11, spineWidth: 7 },
    large: { width: 220, height: 320, titleSize: 22, pageCountSize: 13, spineWidth: 10 },
  }[size] || { width: 155, height: 230, titleSize: 16, pageCountSize: 11, spineWidth: 7 };

  return (
    <View
      style={[
        styles.coverContainer,
        {
          width: dimensions.width,
          height: dimensions.height,
          backgroundColor: coverColor,
        },
        style,
      ]}
    >
      {/* Book spine crease */}
      <View
        style={[
          styles.spineStrip,
          {
            width: dimensions.spineWidth,
            borderRightWidth: 1,
            borderRightColor: 'rgba(0,0,0,0.25)',
          },
        ]}
      />

      {/* Book cover content */}
      <View style={styles.contentArea}>
        <View style={styles.centerSection}>
          <Text
            style={[
              styles.bookTitle,
              {
                color: titleColor,
                fontSize: dimensions.titleSize,
              },
            ]}
            numberOfLines={size === 'large' ? 4 : 3}
          >
            {title}
          </Text>
          <View
            style={[
              styles.titleDivider,
              { backgroundColor: titleColor, opacity: 0.4 },
            ]}
          />
        </View>

        {totalPages > 0 && (
          <Text
            style={[
              styles.pageCount,
              {
                color: titleColor,
                fontSize: dimensions.pageCountSize,
                opacity: 0.7,
              },
            ]}
          >
            {totalPages} pág.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  coverContainer: {
    borderRadius: 8,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  spineStrip: {
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  contentArea: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 4,
  },
  bookTitle: {
    fontFamily: 'serif',
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.4,
    lineHeight: 22,
  },
  titleDivider: {
    width: 24,
    height: 1.5,
    borderRadius: 1,
    marginTop: 8,
  },
  pageCount: {
    alignSelf: 'flex-end',
    fontFamily: 'serif',
    fontWeight: '500',
  },
});
