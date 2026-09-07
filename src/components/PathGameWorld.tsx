import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  chapterFromNodeId,
  pathWorldFor,
  regionForChapter,
  type PathWorldRegion,
} from '../lib/pathWorld';
import { shadow } from '../theme';
import type { UiLanguage } from '../types';

const MAP_HEIGHT = 370;
const NODE_GAP = 118;
const ROUTE_Y = [218, 150, 198, 105, 170, 232, 144, 88, 176] as const;

type WorldPath = { id: string; title: string; selected: boolean };
type WorldStep = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  complete: boolean;
  locked?: boolean;
  onPress: () => void;
};
type WorldNode = {
  id: string;
  index: number;
  regionId?: string;
  label: string;
  complete: boolean;
  current: boolean;
  available?: boolean;
  milestone?: boolean;
};

const landmarkIcon: Record<PathWorldRegion['landmark'], keyof typeof Ionicons.glyphMap> = {
  gate: 'business-outline',
  bridge: 'git-compare-outline',
  overlook: 'sunny-outline',
  'olive-terrace': 'leaf-outline',
  'gathering-court': 'people-outline',
};

function RomanLandmark({ region, active }: { region: PathWorldRegion; active: boolean }) {
  return (
    <View style={[styles.landmark, active && styles.landmarkActive]}>
      <View style={styles.landmarkColumns}>
        <View style={styles.column} />
        <Ionicons name={landmarkIcon[region.landmark]} size={31} color="#2F2940" />
        <View style={styles.column} />
      </View>
      <Text style={styles.landmarkChapter}>ROMANS {region.landmarkChapter}</Text>
    </View>
  );
}

function RomanScenery({ climax, progressed }: { climax: boolean; progressed: boolean }) {
  return (
    <View style={[StyleSheet.absoluteFill, styles.ignorePointerEvents]}>
      <View style={[styles.sky, climax && styles.skyClimax]} />
      <View style={[styles.sun, climax && styles.sunClimax]} />
      <View style={[styles.hill, styles.hillFar]} />
      <View style={[styles.hill, styles.hillNear]} />
      <View style={styles.cityWall} />
      {[60, 150, 680, 780].map((left, index) => (
        <View key={left} style={[styles.cypress, { left, height: 45 + (index % 2) * 18 }]} />
      ))}
      {progressed && (
        <>
          <Ionicons name="leaf" size={22} color="#65724A" style={styles.reactionLeaf} />
          <Ionicons name="people" size={24} color="#6B3E35" style={styles.reactionPeople} />
        </>
      )}
    </View>
  );
}

export function PathGameWorld({
  pathId,
  title,
  ratio,
  chapterLabel,
  nextChapterLabel,
  currentVerseLabel,
  nextVerseLabel,
  paths,
  nodes,
  totalNodeCount,
  uiLanguage,
  reduceMotion,
  steps,
  continueLabel,
  started,
  complete,
  onContinue,
  onStart,
  onSelectPath,
  onSelectNode,
  onPracticeNode,
}: {
  pathId: string;
  title: string;
  ratio: number;
  chapterLabel: string;
  nextChapterLabel?: string;
  currentVerseLabel?: string;
  nextVerseLabel?: string;
  paths: WorldPath[];
  nodes: WorldNode[];
  totalNodeCount: number;
  uiLanguage: UiLanguage;
  reduceMotion: boolean;
  steps: WorldStep[];
  continueLabel: string;
  started: boolean;
  complete: boolean;
  onContinue: () => void;
  onStart: () => void;
  onSelectPath: (id: string) => void;
  onSelectNode: (id: string) => void;
  onPracticeNode: (id: string) => void;
}) {
  const { width } = useWindowDimensions();
  const world = pathWorldFor(pathId);
  const visibleNodes = nodes.slice(0, width >= 720 ? 13 : 9);
  const activeNodeIndex = Math.max(
    0,
    visibleNodes.findIndex((node) => node.current),
  );
  const activeNode = visibleNodes[activeNodeIndex];
  const chapter = activeNode ? chapterFromNodeId(activeNode.id) : undefined;
  const region = world ? regionForChapter(world, chapter) : undefined;
  const currentStepIndex = Math.max(
    0,
    steps.findIndex((step) => !step.complete && !step.locked),
  );
  const mapRef = useRef<ScrollView>(null);
  const travelerX = useRef(new Animated.Value(0)).current;
  const travelerY = useRef(new Animated.Value(0)).current;
  const placements = useMemo(
    () =>
      visibleNodes.map((node, index) => ({
        x: 82 + index * NODE_GAP,
        y: ROUTE_Y[node.index % ROUTE_Y.length]!,
      })),
    [visibleNodes],
  );
  const mapWidth = Math.max(width - 28, (placements.at(-1)?.x ?? 0) + 150);
  const percent = Math.round(ratio * 100);

  useEffect(() => {
    const placement = placements[activeNodeIndex];
    if (!placement) return;
    const x = placement.x - 17;
    const y = placement.y - 58;
    if (reduceMotion) {
      travelerX.setValue(x);
      travelerY.setValue(y);
    } else {
      Animated.parallel([
        Animated.timing(travelerX, { toValue: x, duration: 560, useNativeDriver: false }),
        Animated.timing(travelerY, { toValue: y, duration: 560, useNativeDriver: false }),
      ]).start();
    }
    mapRef.current?.scrollTo({
      x: Math.max(0, placement.x - width / 2),
      animated: !reduceMotion,
    });
  }, [activeNodeIndex, placements, reduceMotion, travelerX, travelerY, width]);

  const fogStart = placements[Math.min(activeNodeIndex + 3, placements.length - 1)]?.x;
  const isRomans = Boolean(world && region);

  return (
    <View style={styles.shell}>
      <View style={styles.header}>
        <View style={styles.pathPicker}>
          {paths.map((path) => (
            <Pressable
              key={path.id}
              accessibilityRole="button"
              accessibilityLabel={path.title}
              accessibilityState={{ selected: path.selected }}
              onPress={() => onSelectPath(path.id)}
              style={[styles.pathDot, path.selected && styles.pathDotSelected]}
            >
              <Ionicons
                name={path.selected ? 'map' : 'ellipse-outline'}
                size={16}
                color="#2F2940"
              />
            </Pressable>
          ))}
        </View>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        <Text numberOfLines={1} style={styles.regionTitle}>
          {region ? region.titles[uiLanguage] : chapterLabel}
        </Text>
        <View style={styles.progressRow}>
          <Text style={styles.percent}>{percent}%</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(3, percent)}%` }]} />
          </View>
        </View>
      </View>

      <ScrollView
        ref={mapRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.routeViewport}
        contentContainerStyle={[styles.route, { width: mapWidth }]}
        decelerationRate="fast"
      >
        {isRomans && (
          <RomanScenery climax={region?.landmark === 'overlook'} progressed={ratio > 0.08} />
        )}
        {!isRomans && <View style={styles.genericWorld} />}
        {region && <RomanLandmark region={region} active={chapter === region.landmarkChapter} />}

        {placements.slice(1).map((placement, index) => {
          const previous = placements[index]!;
          const dx = placement.x - previous.x;
          const dy = placement.y - previous.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          return (
            <View
              key={`road-${visibleNodes[index + 1]?.id}`}
              style={[
                styles.road,
                visibleNodes[index]?.complete && styles.roadComplete,
                {
                  left: (previous.x + placement.x) / 2 - length / 2,
                  top: (previous.y + placement.y) / 2,
                  width: length,
                  transform: [{ rotate: `${Math.atan2(dy, dx) * (180 / Math.PI)}deg` }],
                },
              ]}
            />
          );
        })}

        {visibleNodes.map((node, index) => {
          const placement = placements[index]!;
          const locked = !node.current && !node.available && !node.complete;
          const future = index > activeNodeIndex + 2 && locked;
          const size = node.milestone ? 70 : node.current ? 60 : node.available ? 52 : 48;
          return (
            <Pressable
              key={node.id}
              accessibilityRole="button"
              accessibilityLabel={future ? 'Locked future section' : node.label}
              accessibilityState={{ disabled: locked }}
              disabled={locked}
              onPress={
                node.current
                  ? started
                    ? onContinue
                    : onStart
                  : node.available
                    ? () => onSelectNode(node.id)
                    : node.complete
                      ? () => onPracticeNode(node.id)
                      : undefined
              }
              style={({ pressed }) => [
                styles.nodeTouch,
                {
                  left: placement.x - size / 2,
                  top: placement.y - size / 2,
                  width: size,
                  height: size + 36,
                },
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.node,
                  { width: size, height: size, borderRadius: size / 2 },
                  locked && styles.nodeLocked,
                  node.available && styles.nodeAvailable,
                  node.current && styles.nodeCurrent,
                  node.complete && styles.nodeComplete,
                  node.milestone && styles.nodeMilestone,
                ]}
              >
                {node.current && <View style={styles.currentInnerRing} />}
                <Ionicons
                  name={
                    node.complete
                      ? 'checkmark'
                      : node.milestone
                        ? 'flag'
                        : locked
                          ? 'lock-closed'
                          : 'play'
                  }
                  size={node.milestone ? 25 : 19}
                  color={node.current ? '#2F2940' : node.complete ? '#304A39' : '#FFF8E7'}
                />
              </View>
              {!future && (
                <Text numberOfLines={2} style={styles.nodeLabel}>
                  {node.label}
                </Text>
              )}
            </Pressable>
          );
        })}

        {placements[activeNodeIndex] && (
          <Animated.View style={[styles.traveler, { left: travelerX, top: travelerY }]}>
            <Ionicons name="person" size={18} color="#FFF8E7" />
            <View style={styles.travelerPack} />
          </Animated.View>
        )}

        {fogStart !== undefined && activeNodeIndex + 3 < placements.length && (
          <View
            accessible
            accessibilityLabel="Locked future section"
            style={[
              styles.fog,
              styles.ignorePointerEvents,
              { left: fogStart - 45, width: mapWidth - fogStart + 80 },
            ]}
          >
            <View style={styles.fogEdge} />
          </View>
        )}
        {visibleNodes[0]?.index === 0 && (
          <View style={[styles.startMarker, { top: (placements[0]?.y ?? 200) - 62 }]}>
            <Ionicons name="flag" size={18} color="#2F2940" />
            <Text style={styles.markerText}>START</Text>
          </View>
        )}
        {visibleNodes.at(-1)?.index === totalNodeCount - 1 && (
          <View
            style={[
              styles.goalMarker,
              { top: (placements.at(-1)?.y ?? 180) - 68, left: mapWidth - 76 },
            ]}
          >
            <Ionicons name="ribbon" size={23} color="#C99A3B" />
            <Text style={styles.markerText}>GOAL</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.actionStage}>
        <View style={styles.lessonSteps}>
          {steps.map((step, index) => {
            const current = index === currentStepIndex;
            return (
              <Pressable
                key={step.id}
                accessibilityRole="button"
                accessibilityLabel={step.label}
                accessibilityState={{ disabled: step.locked }}
                disabled={step.locked}
                onPress={step.onPress}
                style={[styles.lessonStep, current && styles.lessonStepCurrent]}
              >
                <Ionicons
                  name={step.complete ? 'checkmark' : step.locked ? 'lock-closed' : step.icon}
                  size={14}
                  color={current ? '#2F2940' : '#EADFCB'}
                />
                <Text style={[styles.lessonStepText, current && styles.lessonStepTextCurrent]}>
                  {step.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.nextAction}>
          <View style={styles.nextCopy}>
            <Text style={styles.nextKicker}>NEXT LESSON</Text>
            <Text style={styles.nextTitle}>{currentVerseLabel ?? chapterLabel}</Text>
            <Text numberOfLines={1} style={styles.nextHint}>
              {nextVerseLabel ?? nextChapterLabel ?? chapterLabel}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={complete}
            onPress={started ? onContinue : onStart}
            style={({ pressed }) => [styles.continueButton, pressed && styles.pressed]}
          >
            <Text style={styles.continueText}>
              {complete ? 'PATH COMPLETE' : started ? continueLabel : 'START'}
            </Text>
            <Ionicons
              name={complete ? 'checkmark-circle' : 'arrow-forward'}
              size={19}
              color="#2F2940"
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    height: 690,
    overflow: 'hidden',
    borderRadius: 30,
    borderWidth: 2,
    borderBottomWidth: 6,
    borderColor: '#9B6C3E',
    backgroundColor: '#2F2940',
    ...shadow,
  },
  header: {
    height: 118,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderColor: '#9B6C3E',
    backgroundColor: '#2F2940',
    zIndex: 8,
  },
  pathPicker: { position: 'absolute', left: 10, top: 12, flexDirection: 'row', gap: 5 },
  pathDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C99A3B',
    backgroundColor: '#D8C9AE',
  },
  pathDotSelected: { borderWidth: 3, backgroundColor: '#F2D477' },
  title: {
    maxWidth: '72%',
    color: '#F5E9D2',
    fontFamily: 'Georgia',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  regionTitle: {
    marginTop: 2,
    color: '#DDB968',
    fontFamily: 'Georgia',
    fontSize: 13,
    fontWeight: '800',
  },
  progressRow: { marginTop: 7, flexDirection: 'row', alignItems: 'center', gap: 8 },
  percent: { color: '#E9D7B5', fontSize: 10, fontWeight: '900' },
  progressTrack: {
    width: 132,
    height: 7,
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: '#574B62',
  },
  progressFill: { height: '100%', borderRadius: 8, backgroundColor: '#C99A3B' },
  routeViewport: { position: 'absolute', top: 118, left: 0, right: 0, height: MAP_HEIGHT },
  route: { height: MAP_HEIGHT, overflow: 'hidden', backgroundColor: '#B9C79A' },
  ignorePointerEvents: { pointerEvents: 'none' },
  genericWorld: {
    position: 'absolute',
    inset: 0,
    backgroundColor: '#B9C79A',
  },
  sky: {
    position: 'absolute',
    inset: 0,
    bottom: 155,
    backgroundColor: '#B7C8C8',
  },
  skyClimax: { backgroundColor: '#E8C17A' },
  sun: {
    position: 'absolute',
    top: 26,
    left: 520,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#E0B958',
    opacity: 0.76,
  },
  sunClimax: {
    width: 88,
    height: 88,
    borderRadius: 44,
    top: 12,
    backgroundColor: '#F2CF73',
    opacity: 0.96,
  },
  hill: { position: 'absolute', borderRadius: 999, backgroundColor: '#788262' },
  hillFar: { width: 600, height: 150, left: 250, top: 105, opacity: 0.75 },
  hillNear: { width: 720, height: 180, left: -120, top: 145, backgroundColor: '#65724A' },
  cityWall: {
    position: 'absolute',
    left: 250,
    right: 80,
    top: 116,
    height: 42,
    borderTopWidth: 7,
    borderColor: '#B39E7D',
    backgroundColor: '#D8C9AE',
    opacity: 0.92,
  },
  cypress: {
    position: 'absolute',
    top: 105,
    width: 16,
    borderRadius: 9,
    backgroundColor: '#3E5138',
  },
  reactionLeaf: { position: 'absolute', left: 610, top: 190 },
  reactionPeople: { position: 'absolute', left: 720, top: 205 },
  landmark: {
    position: 'absolute',
    right: 40,
    top: 64,
    width: 150,
    minHeight: 74,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#9B6C3E',
    backgroundColor: '#D8C9AE',
    opacity: 0.82,
  },
  landmarkActive: { borderColor: '#C99A3B', opacity: 1 },
  landmarkColumns: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  column: {
    width: 11,
    height: 40,
    borderWidth: 2,
    borderColor: '#9B6C3E',
    backgroundColor: '#E6D8BF',
  },
  landmarkChapter: {
    marginTop: 3,
    color: '#2F2940',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  road: {
    position: 'absolute',
    height: 18,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#88745C',
    backgroundColor: '#D8C9AE',
  },
  roadComplete: { borderColor: '#916238', backgroundColor: '#E8D6B5' },
  nodeTouch: {
    position: 'absolute',
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    zIndex: 4,
  },
  node: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderBottomWidth: 6,
    borderColor: '#675C68',
    backgroundColor: '#746C73',
    ...shadow,
  },
  nodeLocked: { opacity: 0.72, borderColor: '#625B62', backgroundColor: '#777075' },
  nodeAvailable: { borderColor: '#7B493B', backgroundColor: '#A85D45' },
  nodeCurrent: { borderWidth: 5, borderColor: '#C99A3B', backgroundColor: '#F0D277' },
  nodeComplete: { borderColor: '#49603F', backgroundColor: '#A8B592' },
  nodeMilestone: { borderRadius: 16, borderColor: '#C99A3B' },
  currentInnerRing: {
    position: 'absolute',
    inset: 4,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#9B6C3E',
  },
  nodeLabel: {
    width: 96,
    marginTop: 4,
    color: '#FFF8E7',
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: '#2F2940',
    textShadowRadius: 4,
  },
  traveler: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 6,
    borderWidth: 2,
    borderColor: '#C99A3B',
    backgroundColor: '#2F2940',
    ...shadow,
  },
  travelerPack: {
    position: 'absolute',
    right: -3,
    top: 10,
    width: 9,
    height: 13,
    borderRadius: 3,
    backgroundColor: '#A85D45',
  },
  fog: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    zIndex: 5,
    backgroundColor: 'rgba(55,54,65,.82)',
  },
  fogEdge: { width: 58, height: '100%', backgroundColor: 'rgba(224,219,204,.34)' },
  startMarker: { position: 'absolute', left: 13, alignItems: 'center' },
  goalMarker: { position: 'absolute', alignItems: 'center' },
  markerText: { color: '#2F2940', fontSize: 8, fontWeight: '900' },
  actionStage: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 14,
    zIndex: 9,
    alignItems: 'center',
  },
  lessonSteps: { flexDirection: 'row', gap: 6, marginBottom: 7 },
  lessonStep: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#6E6078',
    backgroundColor: '#2F2940',
  },
  lessonStepCurrent: { borderColor: '#C99A3B', backgroundColor: '#F0D277' },
  lessonStepText: { color: '#EADFCB', fontSize: 8, fontWeight: '900' },
  lessonStepTextCurrent: { color: '#2F2940' },
  nextAction: {
    width: '100%',
    minHeight: 112,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#C99A3B',
    backgroundColor: '#2F2940',
    ...shadow,
  },
  nextCopy: { flex: 1, minWidth: 0 },
  nextKicker: { color: '#DDB968', fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  nextTitle: {
    marginTop: 2,
    color: '#FFF8E7',
    fontFamily: 'Georgia',
    fontSize: 20,
    fontWeight: '900',
  },
  nextHint: { marginTop: 3, color: '#D7CCBA', fontSize: 9, fontWeight: '700' },
  continueButton: {
    minWidth: 116,
    minHeight: 50,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 25,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: '#9B6C3E',
    backgroundColor: '#F0C85D',
  },
  continueText: { color: '#2F2940', fontSize: 12, fontWeight: '900' },
  pressed: { transform: [{ translateY: 2 }] },
});
