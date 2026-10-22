import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  PATH_DEBUG_ENABLED,
  PATH_PREVIEW_STATES,
  ROMANS_VERSE_COUNTS,
  type PathPreviewState,
  type RomansPathPreview,
} from '../config/pathDebug';
import { pathWorldFor, regionForChapter } from '../lib/pathWorld';
import type { PathGameWorldProps, WorldNode } from './PathGameWorld';

const romansClosed = require('../../assets/game/romans/romans-1-gate-closed.jpg');
const romansOpen = require('../../assets/game/romans/romans-1-gate-open.jpg');
const traveler = require('../../assets/game/romans/roman-traveler.png');

type ScenePoint = { x: number; y: number; scale: number };

const ROMANS_ONE_POINTS: readonly ScenePoint[] = [
  { x: 50, y: 83.5, scale: 1 },
  { x: 52, y: 69.2, scale: 0.82 },
  { x: 53, y: 58.8, scale: 0.72 },
  { x: 58, y: 50.8, scale: 0.64 },
  { x: 60, y: 43.3, scale: 0.57 },
  { x: 62, y: 36.9, scale: 0.5 },
  { x: 65, y: 31.2, scale: 0.44 },
  { x: 65, y: 26.7, scale: 0.4 },
] as const;

const colors = {
  ink: '#2D1748',
  purple: '#55228A',
  purpleDeep: '#32134F',
  gold: '#E5B84F',
  cream: '#FFF9EA',
  mutedCream: '#F1E1C2',
  success: '#356443',
} as const;

function verseNumber(node: WorldNode) {
  return node.label.match(/:(\d+)/)?.[1] ?? String(node.index + 1);
}

function nodePress(props: PathGameWorldProps, node: WorldNode) {
  if (node.current) return props.started ? props.onContinue : props.onStart;
  if (node.available) return () => props.onSelectNode(node.id);
  if (node.complete) return () => props.onPracticeNode(node.id);
  return undefined;
}

export function RomansVerseWorld(props: PathGameWorldProps) {
  const { width, height } = useWindowDimensions();
  const sceneWidth = Math.min(Math.max(width, 320), 480);
  const sceneHeight = sceneWidth * 2.16;
  const viewportHeight = Math.min(sceneHeight, Math.max(520, height - 70));
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugChapter, setDebugChapter] = useState(1);
  const [debugVerse, setDebugVerse] = useState('1');
  const [debugState, setDebugState] = useState<PathPreviewState>('current');
  const [preview, setPreview] = useState<RomansPathPreview | null>(null);
  const nodes = useMemo(() => {
    if (!preview) return props.nodes.slice(0, ROMANS_ONE_POINTS.length);
    const maxVerse = ROMANS_VERSE_COUNTS[preview.chapter - 1] ?? 1;
    const start = Math.min(Math.max(1, preview.verse - 1), Math.max(1, maxVerse - 7));
    return Array.from({ length: Math.min(8, maxVerse) }, (_, index): WorldNode => {
      const verse = start + index;
      const focused = verse === preview.verse;
      return {
        id: `qa-romans-${preview.chapter}-${verse}`,
        index: verse - 1,
        label: `Romans ${preview.chapter}:${verse}`,
        complete: focused && preview.state === 'completed',
        current:
          focused &&
          (preview.state === 'current' ||
            preview.state === 'milestone' ||
            preview.state === 'guardian' ||
            preview.state === 'boss'),
        available: focused && preview.state === 'available',
        milestone: focused && preview.state === 'milestone',
        previewKind:
          focused && (preview.state === 'guardian' || preview.state === 'boss')
            ? preview.state
            : undefined,
      };
    });
  }, [preview, props.nodes]);
  const activeIndex = Math.max(
    0,
    preview
      ? nodes.findIndex((node) => node.label.endsWith(`:${preview.verse}`))
      : nodes.findIndex((node) => node.current),
  );
  const progressed =
    Boolean(preview && preview.chapter > 1) ||
    props.ratio > 0 ||
    activeIndex > 0 ||
    Boolean(nodes[0]?.complete);
  const world = pathWorldFor(props.pathId);
  const travelerX = useRef(new Animated.Value(0)).current;
  const travelerY = useRef(new Animated.Value(0)).current;
  const travelerScale = useRef(new Animated.Value(1)).current;
  const worldRef = useRef<ScrollView>(null);
  const activePoint = ROMANS_ONE_POINTS[Math.min(activeIndex, ROMANS_ONE_POINTS.length - 1)]!;
  const targetScrollY = Math.max(0, (activePoint.y / 100) * sceneHeight - viewportHeight * 0.62);

  useEffect(() => {
    const x = (activePoint.x / 100) * sceneWidth - 14;
    const y = (activePoint.y / 100) * sceneHeight - 52 * activePoint.scale;
    const update = [
      Animated.timing(travelerX, { toValue: x, duration: 650, useNativeDriver: false }),
      Animated.timing(travelerY, { toValue: y, duration: 650, useNativeDriver: false }),
      Animated.timing(travelerScale, {
        toValue: activePoint.scale,
        duration: 650,
        useNativeDriver: false,
      }),
    ];
    if (props.reduceMotion) {
      travelerX.setValue(x);
      travelerY.setValue(y);
      travelerScale.setValue(activePoint.scale);
    } else {
      Animated.parallel(update).start();
    }
    worldRef.current?.scrollTo({
      y: targetScrollY,
      animated: !props.reduceMotion,
    });
  }, [
    activePoint,
    props.reduceMotion,
    sceneHeight,
    sceneWidth,
    travelerScale,
    travelerX,
    travelerY,
    targetScrollY,
    viewportHeight,
  ]);

  return (
    <View style={[styles.shell, { width: sceneWidth, height: viewportHeight }]}>
      <ScrollView
        ref={worldRef}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        style={styles.worldViewport}
        contentContainerStyle={{ height: sceneHeight }}
        onContentSizeChange={() =>
          worldRef.current?.scrollTo({ y: targetScrollY, animated: false })
        }
      >
        <View style={[styles.scene, { height: sceneHeight }]}>
          <Image
            source={progressed ? romansOpen : romansClosed}
            resizeMode="stretch"
            accessibilityIgnoresInvertColors
            style={styles.backgroundImage}
          />

          {nodes.map((node, index) => {
            const point = ROMANS_ONE_POINTS[index]!;
            const locked = !node.current && !node.available && !node.complete;
            const distant = index > activeIndex + 3;
            const current = node.current || index === activeIndex;
            const special = node.milestone || Boolean(node.previewKind);
            const size = special ? 72 : current ? 62 : node.available ? 46 : 40;
            return (
              <Pressable
                key={node.id}
                accessibilityRole="button"
                accessibilityLabel={distant && locked ? 'Locked future verse' : node.label}
                accessibilityHint={current ? props.continueLabel : undefined}
                accessibilityState={{ disabled: locked }}
                disabled={locked}
                onPress={nodePress(props, node)}
                style={({ pressed }) => [
                  styles.nodeTouch,
                  {
                    left: `${point.x}%`,
                    top: `${point.y}%`,
                    width: size,
                    height: size,
                    marginLeft: -size / 2,
                    marginTop: -size / 2,
                    opacity: distant ? 0.34 : 1,
                    transform: [{ scale: pressed ? 0.94 : point.scale + (current ? 0.08 : 0) }],
                  },
                ]}
              >
                <View
                  style={[
                    styles.node,
                    current && styles.nodeCurrent,
                    special && styles.nodeSpecial,
                    node.available && !current && styles.nodeAvailable,
                    node.complete && !current && styles.nodeComplete,
                    locked && styles.nodeLocked,
                  ]}
                >
                  <Ionicons
                    name={
                      node.previewKind === 'boss'
                        ? 'flame'
                        : node.previewKind === 'guardian'
                          ? 'shield-checkmark'
                          : node.milestone
                            ? 'flag'
                            : node.complete
                              ? 'checkmark'
                              : locked
                                ? 'lock-closed'
                                : current
                                  ? 'book'
                                  : 'play'
                    }
                    size={current ? 25 : 17}
                    color={node.complete ? colors.success : current ? colors.cream : colors.ink}
                  />
                </View>
                {!distant && (
                  <View style={[styles.nodeCaption, current && styles.nodeCaptionCurrent]}>
                    <Text
                      numberOfLines={1}
                      style={[styles.nodeText, current && styles.nodeTextCurrent]}
                    >
                      {node.previewKind
                        ? `${node.previewKind.toUpperCase()} · ${node.label}`
                        : node.milestone
                          ? `MILESTONE · ${node.label}`
                          : current
                            ? node.label
                            : verseNumber(node)}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}

          {(!preview || preview.state === 'current') && (
            <Animated.Image
              source={traveler}
              resizeMode="contain"
              accessibilityLabel={`Traveler at ${nodes[activeIndex]?.label ?? props.chapterLabel}`}
              style={[
                styles.traveler,
                {
                  left: travelerX,
                  top: travelerY,
                  transform: [{ scale: travelerScale }],
                },
              ]}
            />
          )}
        </View>
      </ScrollView>

      {PATH_DEBUG_ENABLED && (
        <View style={styles.debugAnchor}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Romans Path QA navigator"
            onPress={() => setDebugOpen((value) => !value)}
            style={styles.debugToggle}
          >
            <Text style={styles.debugToggleText}>DEV QA</Text>
          </Pressable>
          {debugOpen && (
            <View style={styles.debugPanel}>
              <View style={styles.debugHeadingRow}>
                <Text style={styles.debugHeading}>PATH NAVIGATOR</Text>
                {preview && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Return to live Path progress"
                    onPress={() => setPreview(null)}
                  >
                    <Text style={styles.debugLive}>LIVE PROGRESS</Text>
                  </Pressable>
                )}
              </View>
              <Text style={styles.debugLabel}>REGION</Text>
              <Text style={styles.debugValue}>
                {world ? regionForChapter(world, debugChapter).titles.en : 'Romans'}
              </Text>
              <Text style={styles.debugLabel}>CHAPTER</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.debugOptions}>
                  {ROMANS_VERSE_COUNTS.map((_, index) => (
                    <Pressable
                      key={index + 1}
                      accessibilityRole="button"
                      accessibilityLabel={`Romans chapter ${index + 1}`}
                      accessibilityState={{ selected: debugChapter === index + 1 }}
                      onPress={() => {
                        setDebugChapter(index + 1);
                        setDebugVerse('1');
                      }}
                      style={[
                        styles.debugChip,
                        debugChapter === index + 1 && styles.debugChipSelected,
                      ]}
                    >
                      <Text style={styles.debugChipText}>{index + 1}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
              <View style={styles.debugFieldRow}>
                <View style={styles.debugVerseField}>
                  <Text style={styles.debugLabel}>VERSE / NODE</Text>
                  <TextInput
                    accessibilityLabel="Romans verse or node"
                    keyboardType="number-pad"
                    value={debugVerse}
                    onChangeText={setDebugVerse}
                    style={styles.debugInput}
                  />
                </View>
                <View style={styles.debugStateField}>
                  <Text style={styles.debugLabel}>STATE</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.debugOptions}>
                      {PATH_PREVIEW_STATES.map((state) => (
                        <Pressable
                          key={state}
                          accessibilityRole="button"
                          accessibilityLabel={`Preview state ${state}`}
                          accessibilityState={{ selected: debugState === state }}
                          onPress={() => setDebugState(state)}
                          style={[
                            styles.debugChip,
                            debugState === state && styles.debugChipSelected,
                          ]}
                        >
                          <Text style={styles.debugChipText}>{state}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Jump to Romans Path preview"
                onPress={() => {
                  const maxVerse = ROMANS_VERSE_COUNTS[debugChapter - 1] ?? 1;
                  const verse = Math.min(maxVerse, Math.max(1, Number(debugVerse) || 1));
                  setDebugVerse(String(verse));
                  setPreview({ chapter: debugChapter, verse, state: debugState });
                  setDebugOpen(false);
                }}
                style={styles.debugJump}
              >
                <Text style={styles.debugJumpText}>JUMP — VISUAL ONLY</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      <View style={styles.actionDock}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={props.continueLabel}
          disabled={props.complete && !preview}
          onPress={
            preview ? () => setDebugOpen(true) : props.started ? props.onContinue : props.onStart
          }
          style={({ pressed }) => [styles.continueButton, pressed && styles.continuePressed]}
        >
          <View style={styles.continueCopy}>
            <Text style={styles.continueLocation}>
              {nodes[activeIndex]?.label ?? props.chapterLabel}
            </Text>
            <Text style={styles.continueText}>
              {preview
                ? 'QA PREVIEW — NO SAVE'
                : props.complete
                  ? 'PATH COMPLETE'
                  : `${props.continueLabel} · ~3 min`}
            </Text>
          </View>
          {!props.complete && <Ionicons name="arrow-up" size={20} color={colors.cream} />}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignSelf: 'center',
    overflow: 'hidden',
    backgroundColor: '#D8C49D',
  },
  worldViewport: { flex: 1 },
  scene: { width: '100%', position: 'relative' },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  hud: { position: 'absolute', zIndex: 8, top: 0, right: 0, bottom: 0, left: 0 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, gap: 10 },
  pathPicker: {
    flexDirection: 'row',
    gap: 4,
    padding: 5,
    borderRadius: 22,
    backgroundColor: 'rgba(45,23,72,.9)',
  },
  pathButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  pathButtonSelected: { backgroundColor: 'rgba(229,184,79,.34)' },
  titleBlock: { flex: 1, alignItems: 'center' },
  eyebrow: {
    color: colors.purple,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(255,255,255,.9)',
    textShadowRadius: 5,
  },
  title: {
    color: colors.ink,
    fontFamily: 'Georgia',
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '800',
    textShadowColor: 'rgba(255,255,255,.95)',
    textShadowRadius: 7,
  },
  progressRow: {
    marginTop: 6,
    width: '82%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: 'rgba(255,249,234,.88)',
  },
  percent: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E8D8C5',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: colors.purple },
  nodeTouch: { position: 'absolute', zIndex: 5, alignItems: 'center', justifyContent: 'center' },
  node: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.gold,
    backgroundColor: 'rgba(255,249,234,.94)',
    shadowColor: '#24112E',
    shadowOpacity: 0.3,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 4 },
  },
  nodeCurrent: { backgroundColor: colors.purpleDeep, borderWidth: 4 },
  nodeSpecial: {
    borderWidth: 5,
    borderColor: colors.gold,
    shadowColor: colors.gold,
    shadowOpacity: 0.58,
    shadowRadius: 12,
  },
  nodeAvailable: { backgroundColor: 'rgba(255,249,234,.94)' },
  nodeComplete: { backgroundColor: 'rgba(234,244,220,.96)', borderColor: '#9EBC7C' },
  nodeLocked: { backgroundColor: 'rgba(83,79,82,.84)', borderColor: '#D8D0C6' },
  nodeCaption: {
    position: 'absolute',
    top: '82%',
    minWidth: 28,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255,249,234,.9)',
  },
  nodeCaptionCurrent: { top: '92%', minWidth: 98, borderWidth: 1, borderColor: colors.gold },
  nodeText: { color: colors.ink, textAlign: 'center', fontSize: 11, fontWeight: '900' },
  nodeTextCurrent: { fontFamily: 'Georgia', fontSize: 13 },
  traveler: { position: 'absolute', zIndex: 7, width: 28, height: 66 },
  debugAnchor: {
    position: 'absolute',
    zIndex: 20,
    top: 138,
    right: 10,
    alignItems: 'flex-end',
  },
  debugToggle: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: 'rgba(45,23,72,.94)',
  },
  debugToggleText: { color: colors.gold, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  debugPanel: {
    marginTop: 6,
    width: 330,
    maxWidth: '92%',
    gap: 5,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: 'rgba(36,17,46,.97)',
  },
  debugHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  debugHeading: { color: colors.cream, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  debugLive: { color: colors.gold, fontSize: 9, fontWeight: '900' },
  debugLabel: { color: colors.gold, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  debugValue: { color: colors.cream, fontSize: 12, fontWeight: '800' },
  debugOptions: { flexDirection: 'row', gap: 4 },
  debugChip: {
    minWidth: 28,
    paddingHorizontal: 7,
    paddingVertical: 5,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: 'rgba(255,249,234,.12)',
  },
  debugChipSelected: { backgroundColor: colors.purple },
  debugChipText: { color: colors.cream, fontSize: 10, fontWeight: '800' },
  debugFieldRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  debugVerseField: { width: 82, gap: 3 },
  debugStateField: { flex: 1, gap: 3 },
  debugInput: {
    height: 30,
    paddingHorizontal: 8,
    borderRadius: 9,
    color: colors.ink,
    fontWeight: '900',
    backgroundColor: colors.cream,
  },
  debugJump: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.gold,
  },
  debugJumpText: { color: colors.ink, fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
  actionDock: {
    position: 'absolute',
    zIndex: 10,
    left: 14,
    right: 14,
    bottom: 14,
  },
  lessonSteps: {
    position: 'absolute',
    zIndex: 10,
    top: 92,
    left: 24,
    right: 24,
    flexDirection: 'row',
    gap: 5,
    padding: 5,
    borderRadius: 18,
    backgroundColor: 'rgba(45,23,72,.88)',
  },
  lessonStep: {
    flex: 1,
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 5,
    borderRadius: 14,
  },
  lessonStepCurrent: { backgroundColor: colors.gold },
  lessonStepText: { color: colors.mutedCream, fontSize: 10, fontWeight: '800' },
  lessonStepTextCurrent: { color: colors.ink },
  continueButton: {
    minHeight: 68,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderRadius: 27,
    borderWidth: 3,
    borderColor: colors.gold,
    backgroundColor: 'rgba(85,39,122,.95)',
    shadowColor: '#24112E',
    shadowOpacity: 0.32,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  continuePressed: { transform: [{ scale: 0.98 }] },
  continueCopy: { flex: 1 },
  continueLocation: {
    color: colors.cream,
    fontFamily: 'Georgia',
    fontSize: 15,
    fontWeight: '900',
  },
  continueText: { marginTop: 2, color: colors.gold, fontSize: 12, fontWeight: '900' },
});
