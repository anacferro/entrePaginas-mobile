import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { View, Animated, PanResponder, StyleSheet, Easing, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const DISTANCE_TO_COMMIT = 0.3;
const VELOCITY_TO_COMMIT = 0.45;
const SWIPE_FALLBACK = 50;
const MAX_ANGLE = 90;
const RESISTANCE = 0.22;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const PageTurner = forwardRef(function PageTurner(
  { mode, enabled, index, count, background, renderPage, onCommit, children },
  ref
) {
  const [width, setWidth] = useState(() => Dimensions.get('window').width || 0);
  const [direction, setDirection] = useState(null);
  const [progress] = useState(() => new Animated.Value(0));
  const [nudge] = useState(() => new Animated.Value(0));
  const live = useRef({});
  const current = useRef({ direction: null, busy: false, value: 0, autoCommit: false });

  useEffect(() => {
    live.current = { mode, enabled, index, count, width, onCommit };
  }, [mode, enabled, index, count, width, onCommit]);

  useEffect(() => {
    const id = progress.addListener(({ value }) => {
      current.current.value = value;
    });
    return () => progress.removeListener(id);
  }, [progress]);

  const targetOf = useCallback((dir) => live.current.index + (dir === 'next' ? 1 : -1), []);

  const begin = useCallback((dir) => {
    const target = targetOf(dir);
    if (target < 0 || target >= live.current.count) return false;
    progress.setValue(0);
    current.current.direction = dir;
    setDirection(dir);
    return true;
  }, [progress, targetOf]);

  const finish = useCallback((commit) => {
    const state = current.current;
    const dir = state.direction;
    if (!dir) return;
    const target = targetOf(dir);
    const slide = live.current.mode === 'slide';
    const remaining = commit ? 1 - state.value : state.value;
    const duration = Math.round(clamp(remaining * (slide ? 340 : 520), 140, slide ? 340 : 520));
    state.busy = true;
    Animated.timing(progress, {
      toValue: commit ? 1 : 0,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      if (commit) live.current.onCommit(target);
      progress.setValue(0);
      nudge.setValue(0);
      state.direction = null;
      state.busy = false;
      setDirection(null);
    });
  }, [progress, targetOf, nudge]);

  useEffect(() => {
    if (direction && current.current.autoCommit) {
      current.current.autoCommit = false;
      finish(true);
    }
  }, [direction, finish]);

  useImperativeHandle(ref, () => ({
    turn(dir) {
      const state = current.current;
      if (state.busy || state.direction) return;
      const target = targetOf(dir);
      if (target < 0 || target >= live.current.count) return;
      if (live.current.mode === 'simple') {
        live.current.onCommit(target);
        return;
      }
      state.autoCommit = true;
      begin(dir);
    },
  }), [begin, targetOf]);

  const [gesture] = useState(() => ({ active: false, gestureDir: null }));
  const [pan, setPan] = useState(null);
  useEffect(() => {
    const responder = PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        live.current.enabled && !current.current.busy && Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
      onPanResponderTerminationRequest: () => !gesture.active,
      onPanResponderGrant: (_, g) => {
        gesture.gestureDir = g.dx < 0 ? 'next' : 'prev';
        gesture.active = live.current.mode !== 'simple' && begin(gesture.gestureDir);
      },
      onPanResponderMove: (_, g) => {
        if (live.current.mode === 'simple') return;
        if (gesture.active) {
          const w = Math.max(live.current.width, 1);
          const travelled = gesture.gestureDir === 'next' ? -g.dx : g.dx;
          progress.setValue(clamp(travelled / (w * 0.9), 0, 1));
        } else {
          nudge.setValue(clamp(g.dx * RESISTANCE, -48, 48));
        }
      },
      onPanResponderRelease: (_, g) => {
        if (live.current.mode === 'simple') {
          const dir = g.dx < -SWIPE_FALLBACK ? 'next' : g.dx > SWIPE_FALLBACK ? 'prev' : null;
          const target = dir ? live.current.index + (dir === 'next' ? 1 : -1) : -1;
          if (target >= 0 && target < live.current.count) live.current.onCommit(target);
          return;
        }
        if (!gesture.active) {
          Animated.spring(nudge, { toValue: 0, useNativeDriver: true, bounciness: 8 }).start();
          return;
        }
        gesture.active = false;
        const along = gesture.gestureDir === 'next' ? -g.vx : g.vx;
        const value = current.current.value;
        finish(value > DISTANCE_TO_COMMIT || (along > VELOCITY_TO_COMMIT && value > 0.02));
      },
      onPanResponderTerminate: () => {
        if (gesture.active) {
          gesture.active = false;
          finish(false);
        } else {
          Animated.spring(nudge, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    });
    setPan(responder);
  }, [begin, finish, gesture, nudge, progress]);

  const turning = direction && width > 0 && mode !== 'simple';
  const next = direction === 'next';
  const sign = next ? -1 : 1;
  const target = direction ? index + (next ? 1 : -1) : null;

  let mainTransform = [{ translateX: nudge }];
  let neighborStyle = null;
  let mainShade = null;
  let neighborShade = null;
  let neighborOnTop = false;

  if (turning && mode === 'slide') {
    mainTransform = [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, sign * width] }) }];
    neighborStyle = {
      transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-sign * width, 0] }) }],
    };
  }

  if (turning && mode === 'curl') {
    const angle = (from, to) => ({
      transform: [
        { perspective: 1600 },
        { translateX: -width / 2 },
        { rotateY: progress.interpolate({ inputRange: [0, 1], outputRange: [`${from}deg`, `${to}deg`] }) },
        { translateX: width / 2 },
      ],
    });
    if (next) {
      mainTransform = angle(0, -MAX_ANGLE).transform;
      mainShade = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] });
      neighborShade = progress.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] });
      neighborStyle = {};
    } else {
      neighborStyle = angle(-MAX_ANGLE, 0);
      neighborOnTop = true;
      neighborShade = progress.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
      mainShade = progress.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] });
    }
  }

  return (
    <View
      style={styles.stage}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) setWidth(w);
      }}
      {...(pan ? pan.panHandlers : null)}
    >
      {turning && target !== null && (
        <Animated.View
          pointerEvents="none"
          style={[styles.layer, { backgroundColor: background, zIndex: neighborOnTop ? 2 : 0 }, neighborStyle]}
        >
          {renderPage(target)}
          {neighborShade && <Shade opacity={neighborShade} flip={neighborOnTop} />}
        </Animated.View>
      )}
      <Animated.View
        style={[styles.layer, { backgroundColor: background, zIndex: 1, transform: mainTransform }]}
      >
        <View style={styles.childContainer}>
          {children}
        </View>
        {turning && mainShade && <Shade opacity={mainShade} flip={!neighborOnTop} />}
      </Animated.View>
    </View>
  );
});

function Shade({ opacity, flip }) {
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      <LinearGradient
        colors={flip ? ['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.55)'] : ['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.05)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  childContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

export default PageTurner;
