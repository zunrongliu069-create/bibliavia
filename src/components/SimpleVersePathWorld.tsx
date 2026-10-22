import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { PATH_DEBUG_ENABLED } from '../config/pathDebug';
import { colors, shadow } from '../theme';
import type { PathGameWorldProps, WorldNode } from './PathGameWorld';

type Point = { x: number; y: number; scale?: number };
type PreviewState = 'initial' | 'mid' | 'guardian' | 'completed';

const SCENE_HEIGHT = 900;
const PSALM_POINTS: Point[] = [
  { x: 28, y: 790, scale: 1.1 },
  { x: 56, y: 690 },
  { x: 38, y: 580 },
  { x: 67, y: 470 },
  { x: 43, y: 360 },
  { x: 61, y: 255, scale: 1.05 },
  { x: 50, y: 112, scale: 1.2 },
];

const previewNodes = (nodes: WorldNode[], preview: PreviewState | null): WorldNode[] => {
  if (!preview) return nodes;
  const active = preview === 'initial' ? 0 : preview === 'mid' ? 3 : 6;
  return nodes.map((node, index) => ({
    ...node,
    complete: preview === 'completed' || index < active,
    current: preview !== 'completed' && index === active,
    available: false,
  }));
};

const nodeAction = (props: PathGameWorldProps, node: WorldNode) => {
  if (node.current) return props.started ? props.onContinue : props.onStart;
  if (node.available) return () => props.onSelectNode(node.id);
  if (node.complete) return () => props.onPracticeNode(node.id);
  return undefined;
};

export function SimpleVersePathWorld(props: PathGameWorldProps) {
  const { width, height } = useWindowDimensions();
  const viewportHeight = Math.max(520, height - 110);
  const sceneWidth = Math.max(320, Math.min(width, 680));
  const worldRef = useRef<ScrollView>(null);
  const travelerX = useRef(new Animated.Value(0)).current;
  const travelerY = useRef(new Animated.Value(0)).current;
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const nodes = useMemo(() => previewNodes(props.nodes, preview), [preview, props.nodes]);
  const activeIndex =
    props.complete || preview === 'completed'
      ? nodes.length - 1
      : Math.max(
          0,
          nodes.findIndex((node) => node.current),
        );
  const activePoint = PSALM_POINTS[Math.min(activeIndex, PSALM_POINTS.length - 1)]!;
  const completed = props.complete || preview === 'completed';
  const guardianReached = activeIndex === nodes.length - 1 || completed;
  const fogBottom = Math.max(0, activePoint.y - 175);
  useEffect(() => {
    const x = (activePoint.x / 100) * sceneWidth + 26;
    const y = activePoint.y - 16;
    if (props.reduceMotion) {
      travelerX.setValue(x);
      travelerY.setValue(y);
    } else {
      Animated.parallel([
        Animated.timing(travelerX, { toValue: x, duration: 600, useNativeDriver: false }),
        Animated.timing(travelerY, { toValue: y, duration: 600, useNativeDriver: false }),
      ]).start();
    }
    worldRef.current?.scrollTo({
      y: Math.max(0, activePoint.y - viewportHeight / 2),
      animated: !props.reduceMotion,
    });
  }, [activePoint.x, activePoint.y, props.reduceMotion, sceneWidth, travelerX, travelerY]);

  return (
    <View style={[styles.shell, { width: sceneWidth, height: viewportHeight }]}>
      <ScrollView
        ref={worldRef}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        style={{ height: viewportHeight }}
        contentContainerStyle={{ height: SCENE_HEIGHT }}
        onContentSizeChange={() =>
          worldRef.current?.scrollTo({
            y: Math.max(0, activePoint.y - viewportHeight / 2),
            animated: false,
          })
        }
      >
        <View style={[styles.scene, { width: sceneWidth }]}>
          <View style={styles.sky} />
          <View style={[styles.hill, styles.hillFar]} />
          <View style={[styles.hill, styles.hillNear]} />
          <View style={styles.river} />
          {[90, 210, 405, 560].map((left, index) => (
            <View
              key={left}
              style={[styles.tree, { left: (left / 680) * sceneWidth, top: 310 + index * 105 }]}
            >
              <View style={styles.treeTop} />
              <View style={styles.treeTrunk} />
            </View>
          ))}

          {PSALM_POINTS.slice(1).map((point, index) => {
            const previous = PSALM_POINTS[index]!;
            const x1 = (previous.x / 100) * sceneWidth;
            const x2 = (point.x / 100) * sceneWidth;
            const dx = x2 - x1;
            const dy = point.y - previous.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const revealed = index < activeIndex || completed;
            return (
              <View
                key={`road-${index}`}
                style={[
                  styles.road,
                  revealed && styles.roadRevealed,
                  {
                    left: (x1 + x2) / 2 - length / 2,
                    top: (previous.y + point.y) / 2,
                    width: length,
                    transform: [{ rotate: `${Math.atan2(dy, dx) * (180 / Math.PI)}deg` }],
                  },
                ]}
              >
                <View style={styles.roadCenter} />
              </View>
            );
          })}

          <View style={[styles.destination, completed && styles.destinationOpen]}>
            <Ionicons
              name={completed ? 'sunny' : 'shield-checkmark'}
              size={38}
              color={completed ? '#FFF2A6' : '#F4D98A'}
            />
            <Text style={styles.destinationTitle}>
              {completed ? 'GREEN PASTURES' : 'FINAL GUARDIAN'}
            </Text>
            <Text style={styles.destinationDetail}>
              {completed
                ? 'Psalm 23 complete'
                : guardianReached
                  ? 'The final challenge awaits'
                  : 'A passage waits ahead'}
            </Text>
          </View>

          {nodes.map((node, index) => {
            const point = PSALM_POINTS[index];
            if (!point) return null;
            const isBoss = index === nodes.length - 1;
            if (isBoss) {
              const locked = !node.current && !node.available && !node.complete;
              return (
                <Pressable
                  key={node.id}
                  accessibilityRole="button"
                  accessibilityLabel={node.label}
                  accessibilityState={{ disabled: locked }}
                  disabled={locked || Boolean(preview)}
                  onPress={nodeAction(props, node)}
                  style={[
                    styles.guardianTouch,
                    guardianReached && styles.guardianTouchReached,
                    { left: sceneWidth / 2 - 55 },
                  ]}
                >
                  <View
                    style={[
                      styles.guardianSeal,
                      locked && styles.nodeLocked,
                      node.current && styles.nodeCurrent,
                    ]}
                  >
                    <Ionicons
                      name={node.complete ? 'checkmark' : 'key'}
                      size={22}
                      color="#FFF8E7"
                    />
                  </View>
                </Pressable>
              );
            }
            const locked = !node.current && !node.available && !node.complete;
            return (
              <Pressable
                key={node.id}
                accessibilityRole="button"
                accessibilityLabel={node.label}
                accessibilityState={{ disabled: locked }}
                disabled={locked || Boolean(preview)}
                onPress={nodeAction(props, node)}
                style={({ pressed }) => [
                  styles.nodeTouch,
                  {
                    left: `${point.x}%`,
                    top: point.y,
                    transform: [{ scale: pressed ? 0.94 : (point.scale ?? 1) }],
                  },
                ]}
              >
                <View
                  style={[
                    styles.node,
                    locked && styles.nodeLocked,
                    node.available && styles.nodeAvailable,
                    node.current && styles.nodeCurrent,
                    node.complete && styles.nodeComplete,
                  ]}
                >
                  <Ionicons
                    name={
                      node.complete
                        ? 'checkmark'
                        : locked
                          ? 'lock-closed'
                          : node.current
                            ? 'book'
                            : 'play'
                    }
                    size={node.current ? 23 : 18}
                    color={node.complete ? '#385642' : locked ? '#E7E0D3' : '#FFF8E7'}
                  />
                </View>
                <View style={[styles.nodeLabel, node.current && styles.nodeLabelCurrent]}>
                  <Text style={styles.nodeLabelText}>
                    {node.label.replace(/^.* 23:/, 'Verse ')}
                  </Text>
                </View>
              </Pressable>
            );
          })}

          {!completed && (
            <Animated.View style={[styles.traveler, { left: travelerX, top: travelerY }]}>
              <View style={styles.travelerHead} />
              <View style={styles.travelerBody}>
                <Ionicons name="compass" size={14} color="#F4D98A" />
              </View>
            </Animated.View>
          )}

          {!completed && fogBottom > 0 && (
            <View pointerEvents="none" style={[styles.fog, { height: fogBottom }]}>
              {[0, 1, 2, 3, 4].map((puff) => (
                <View key={puff} style={[styles.fogPuff, { left: `${puff * 24 - 6}%` }]} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {PATH_DEBUG_ENABLED && (
        <View style={styles.debugRow}>
          {(['initial', 'mid', 'guardian', 'completed'] as const).map((state) => (
            <Pressable
              key={state}
              onPress={() => setPreview(preview === state ? null : state)}
              style={[styles.debugChip, preview === state && styles.debugChipActive]}
            >
              <Text style={styles.debugText}>{state}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.actionPanel}>
        <Pressable
          accessibilityRole="button"
          disabled={(props.complete && !preview) || Boolean(preview)}
          onPress={props.started ? props.onContinue : props.onStart}
          style={({ pressed }) => [styles.continueButton, pressed && styles.pressed]}
        >
          <View style={styles.continueCopy}>
            <Text style={styles.continueLocation}>
              {nodes[activeIndex]?.label ?? props.chapterLabel}
            </Text>
            <Text style={styles.continueText}>
              {completed
                ? 'PATH COMPLETE'
                : guardianReached
                  ? 'START FINAL BOSS'
                  : `${props.started ? props.continueLabel : 'START PATH'} · ~3 min`}
            </Text>
          </View>
          <Ionicons name={completed ? 'checkmark-circle' : 'arrow-up'} size={20} color="#2D173F" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignSelf: 'center',
    overflow: 'hidden',
    backgroundColor: '#DDE9E2',
  },
  header: {
    minHeight: 104,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2D173F',
    borderBottomWidth: 3,
    borderBottomColor: '#D1A941',
  },
  eyebrow: { color: '#DDBF64', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  title: {
    maxWidth: 430,
    color: '#FFF8E7',
    fontFamily: 'Georgia',
    fontSize: 25,
    fontWeight: '700',
  },
  location: { marginTop: 3, color: '#D9CEE2', fontSize: 11, fontWeight: '700' },
  progressBadge: {
    minWidth: 62,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#FFF8E7',
  },
  progressValue: { color: '#55277A', fontSize: 18, fontWeight: '900' },
  progressLabel: { color: '#7C6C86', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  scene: { height: SCENE_HEIGHT, overflow: 'hidden', backgroundColor: '#DCECF0' },
  sky: { ...StyleSheet.absoluteFill, backgroundColor: '#DCECF0' },
  hill: { position: 'absolute', width: '130%', left: '-15%', borderRadius: 999 },
  hillFar: { height: 500, top: 180, backgroundColor: '#B8CFB0' },
  hillNear: { height: 500, top: 430, backgroundColor: '#87AA7E' },
  river: {
    position: 'absolute',
    width: 62,
    height: 540,
    left: '7%',
    top: 360,
    borderRadius: 40,
    backgroundColor: '#9DCFD2',
    transform: [{ rotate: '-8deg' }],
  },
  tree: { position: 'absolute', width: 26, height: 50, alignItems: 'center', zIndex: 1 },
  treeTop: { width: 28, height: 36, borderRadius: 18, backgroundColor: '#527A55' },
  treeTrunk: { width: 5, height: 15, backgroundColor: '#76583D' },
  road: {
    position: 'absolute',
    zIndex: 2,
    height: 38,
    marginTop: -19,
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#AD9366',
    backgroundColor: '#D8C49D',
    ...shadow,
  },
  roadRevealed: { borderColor: '#D3A72F', backgroundColor: '#E9D9B7' },
  roadCenter: {
    height: 3,
    marginHorizontal: 12,
    borderRadius: 3,
    backgroundColor: 'rgba(255,248,225,.72)',
  },
  destination: {
    position: 'absolute',
    zIndex: 3,
    width: 190,
    height: 104,
    top: 22,
    left: '50%',
    marginLeft: -95,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 52,
    borderWidth: 3,
    borderColor: '#D3A73F',
    backgroundColor: '#3C2352',
    ...shadow,
  },
  destinationOpen: { backgroundColor: '#527A55', borderColor: '#F1D471' },
  destinationTitle: {
    color: '#FFF8E7',
    fontFamily: 'Georgia',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  destinationDetail: { marginTop: 2, color: '#E5D9EA', fontSize: 9, fontWeight: '700' },
  nodeTouch: {
    position: 'absolute',
    zIndex: 5,
    width: 96,
    height: 78,
    marginLeft: -48,
    marginTop: -30,
    alignItems: 'center',
  },
  node: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#D6B64F',
    backgroundColor: '#664086',
    ...shadow,
  },
  nodeLocked: { opacity: 0.72, borderColor: '#B8B0AC', backgroundColor: '#777174' },
  nodeAvailable: { borderColor: '#FFF0A9', backgroundColor: '#7A4A91' },
  nodeCurrent: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 5,
    borderColor: '#F1D36B',
    backgroundColor: '#4E226D',
  },
  nodeComplete: { borderColor: '#E9D79A', backgroundColor: '#E9F0D9' },
  nodeLabel: {
    marginTop: 3,
    minWidth: 58,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255,248,231,.9)',
  },
  nodeLabelCurrent: { borderWidth: 1, borderColor: '#D1A941' },
  nodeLabelText: { color: '#3A2943', textAlign: 'center', fontSize: 10, fontWeight: '900' },
  guardianTouch: {
    position: 'absolute',
    zIndex: 5,
    top: 85,
    width: 110,
    height: 65,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardianTouchReached: { zIndex: 7 },
  guardianSeal: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#F1D36B',
    backgroundColor: '#5D307A',
  },
  traveler: { position: 'absolute', zIndex: 8, width: 30, height: 47, alignItems: 'center' },
  travelerHead: {
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#F1D36B',
    backgroundColor: '#7A4A2B',
  },
  travelerBody: {
    width: 29,
    height: 31,
    marginTop: -1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D6B64F',
    backgroundColor: '#48205F',
  },
  fog: {
    position: 'absolute',
    zIndex: 6,
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: 'rgba(238,244,242,.84)',
  },
  fogPuff: {
    position: 'absolute',
    bottom: -34,
    width: '34%',
    height: 68,
    borderRadius: 999,
    backgroundColor: 'rgba(238,244,242,.74)',
  },
  debugRow: {
    position: 'absolute',
    zIndex: 20,
    top: 66,
    left: 10,
    right: 10,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingTop: 7,
    borderRadius: 12,
    backgroundColor: 'rgba(33,21,45,.92)',
  },
  debugChip: {
    flex: 1,
    paddingVertical: 5,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6F5C7A',
  },
  debugChipActive: { backgroundColor: '#6A388A', borderColor: '#DDBF64' },
  debugText: { color: '#FFF8E7', fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  actionPanel: { position: 'absolute', zIndex: 12, left: 12, right: 12, bottom: 12 },
  steps: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  step: { minWidth: 62, flexDirection: 'row', alignItems: 'center', gap: 5 },
  stepIcon: {
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4B3B55',
  },
  stepDone: { backgroundColor: '#527A55' },
  stepCurrent: { borderWidth: 2, borderColor: '#DDBF64' },
  stepText: { color: '#FFF8E7', fontSize: 10, fontWeight: '800' },
  stepTextLocked: { color: '#8F8397' },
  continueButton: {
    minHeight: 68,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 9,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#F0D16D',
    backgroundColor: 'rgba(224,184,78,.96)',
    ...shadow,
  },
  continueCopy: { flex: 1 },
  continueLocation: {
    color: '#2D173F',
    fontFamily: 'Georgia',
    fontSize: 15,
    fontWeight: '900',
  },
  continueText: { marginTop: 2, color: '#2D173F', fontSize: 12, fontWeight: '900' },
  pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
});
