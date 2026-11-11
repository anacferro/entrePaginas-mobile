import React, { useEffect, useRef } from 'react';
import { View, Text, TextInput, Platform, StyleSheet } from 'react-native';
import { buildSegments } from '../services/marks';

function splitParagraphs(segments) {
  const paragraphs = [[]];
  segments.forEach((s) => {
    s.text.split(/\n{2,}/).forEach((part, i) => {
      if (i > 0) paragraphs.push([]);
      if (part) paragraphs[paragraphs.length - 1].push({ ...s, text: part });
    });
  });
  return paragraphs.filter((p) => p.length > 0);
}

const INDENT = '\u2003\u2002';
const HYPHENS = Platform.OS === 'web' ? { hyphens: 'auto', overflowWrap: 'break-word' } : null;

function isHeadingLike(list) {
  const text = list.map((s) => s.text).join('').trim();
  return text.length > 0 && text.length <= 60 && !/[.!?…,;:]$/.test(text) && text === text.toUpperCase() && /[A-ZÀ-Þ]{3}/.test(text);
}

export default function AnnotatedText({ content, marks, style, annotating, onSelect, paragraphGap = null, indent = false, skipFirstIndent = false, lang }) {
  const webRef = useRef(null);
  const segments = buildSegments(content, marks);

  const render = (list, prefix = '') => list.map((s, i) => (
    <Text
      key={i}
      style={[
        s.pin && { backgroundColor: `${s.pin}30`, textDecorationLine: 'underline', textDecorationStyle: 'dotted', textDecorationColor: s.pin },
        s.highlight && { backgroundColor: s.highlight, color: '#2B2523' },
        s.bold && styles.bold,
        s.italic && styles.italic,
        s.underline && styles.underline,
      ]}
    >
      {i === 0 ? `${prefix}${s.text}` : s.text}
    </Text>
  ));
  const children = render(segments);

  useEffect(() => {
    if (Platform.OS !== 'web' || !annotating) return undefined;

    const handleSelection = () => {
      const node = webRef.current;
      const selection = window.getSelection();
      if (!node || !selection?.rangeCount) return;

      const range = selection.getRangeAt(0);
      if (range.collapsed) return;
      if (!node.contains(range.startContainer) || !node.contains(range.endContainer)) return;

      const before = document.createRange();
      before.selectNodeContents(node);
      before.setEnd(range.startContainer, range.startOffset);
      const start = before.toString().length;
      onSelect(start, start + range.toString().length);
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, [annotating, onSelect]);

  if (annotating && Platform.OS !== 'web') {
    return (
      <TextInput
        style={[style, styles.input]}
        multiline
        scrollEnabled={false}
        showSoftInputOnFocus={false}
        contextMenuHidden
        caretHidden
        onChangeText={() => {}}
        onSelectionChange={(e) => onSelect(e.nativeEvent.selection.start, e.nativeEvent.selection.end)}
      >
        {children}
      </TextInput>
    );
  }

  if (!annotating && paragraphGap !== null) {
    const paragraphs = splitParagraphs(segments);
    return (
      <View>
        {paragraphs.map((list, i) => (
          <Text
            key={i}
            lang={lang}
            android_hyphenationFrequency="normal"
            style={[style, HYPHENS, i < paragraphs.length - 1 && { marginBottom: paragraphGap }]}
          >
            {render(list, indent && !(i === 0 && skipFirstIndent) && !list.some((s) => /\n/.test(s.text)) && !isHeadingLike(list) ? INDENT : '')}
          </Text>
        ))}
      </View>
    );
  }

  return (
    <Text ref={webRef} style={style} selectable={annotating}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  input: {
    padding: 0,
    textAlignVertical: 'top',
  },
  bold: {
    fontWeight: '700',
  },
  italic: {
    fontStyle: 'italic',
  },
  underline: {
    textDecorationLine: 'underline',
  },
});
