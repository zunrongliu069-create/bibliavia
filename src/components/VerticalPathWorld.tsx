import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  buildVerticalWorldLayout,
  focusOffsetForNode,
  interactionTargetForNode,
  travelerPositionForPoint,
  type VerticalWorldNode,
} from '../lib/verticalPathWorld';
import {
  markRouteXFractions,
  markWaterRouteNodeIds,
  markWorldObjects,
} from '../data/markJourneyWorld';
import { composeMarkWorld, isMarkHeroPosition } from '../lib/markWorldScene';
import { colors, shadow } from '../theme';
import { MarkActorLayer, MarkGroundLayer } from './MarkComposedWorld';
import { MarkTraveler } from './MarkWorldPrimitives';
import type { PathGameWorldProps, WorldNode } from './PathGameWorld';

const asVerticalNode = (node: WorldNode): VerticalWorldNode => ({
  id: node.id,
  parentId: node.parentId ?? node.id,
  index: node.index,
  regionId: node.regionId ?? node.id,
  chapterNumber: node.chapterNumber,
  label: node.label,
  kind: node.kind ?? (node.previewKind ? 'guardian' : 'verse'),
  complete: node.complete,
  current: node.current,
  available: Boolean(node.available),
  milestone: node.milestone,
  levels: node.levels,
  previewKind: node.previewKind,
});

const actionForNode = (props: PathGameWorldProps, node: VerticalWorldNode) => {
  if (node.current) return props.started ? props.onContinue : props.onStart;
  if (node.available) return () => props.onSelectNode(interactionTargetForNode(node));
  if (node.complete) return () => props.onPracticeNode(interactionTargetForNode(node));
  return undefined;
};

export function VerticalPathWorld(props: PathGameWorldProps) {
  const { width, height } = useWindowDimensions();
  const viewportHeight = Math.max(520, height - 104);
  const worldWidth = Math.max(320, Math.min(width, 760));
  const nodes = useMemo(() => props.nodes.map(asVerticalNode), [props.nodes]);
  const activeIndex = props.complete
    ? Math.max(0, nodes.length - 1)
    : Math.max(
        0,
        nodes.findIndex((node) => node.current),
      );
  const activeNode = nodes[activeIndex];
  const isMarkJourney = props.pathId === 'reading-mark';
  const layout = useMemo(
    () =>
      buildVerticalWorldLayout(nodes, {
        width: worldWidth,
        viewportHeight,
        xFractions: isMarkJourney ? markRouteXFractions : undefined,
      }),
    [isMarkJourney, nodes, viewportHeight, worldWidth],
  );
  const activePoint = layout.points[activeIndex];
  const illustratedTraveler =
    isMarkJourney &&
    activePoint !== undefined &&
    isMarkHeroPosition(activePoint.y, layout.contentHeight);
  const [visibleTop, setVisibleTop] = useState(() =>
    activePoint ? focusOffsetForNode(activePoint.y, viewportHeight, layout.contentHeight) : 0,
  );
  const markScene = useMemo(
    () =>
      isMarkJourney
        ? composeMarkWorld(markWorldObjects, layout.points, {
            contentHeight: layout.contentHeight,
            worldWidth,
            visibleTop,
            viewportHeight,
          })
        : undefined,
    [isMarkJourney, layout.contentHeight, layout.points, visibleTop, viewportHeight, worldWidth],
  );
  const worldRef = useRef<ScrollView>(null);
  const pendingFocus = useRef(true);
  const contentReady = useRef(false);
  const focusKey = `${props.pathId}:${activeNode?.id ?? 'none'}`;
  const previousFocusKey = useRef(focusKey);
  const travelerX = useRef(new Animated.Value(activePoint?.x ?? worldWidth / 2)).current;
  const travelerY = useRef(new Animated.Value(activePoint?.y ?? 0)).current;

  const focusCurrent = useCallback(
    (animated: boolean) => {
      if (!activePoint) return;
      worldRef.current?.scrollTo({
        y: focusOffsetForNode(activePoint.y, viewportHeight, layout.contentHeight),
        animated,
      });
    },
    [activePoint, layout.contentHeight, viewportHeight],
  );

  useEffect(() => {
    if (!activePoint) return;
    if (previousFocusKey.current !== focusKey) {
      pendingFocus.current = true;
      previousFocusKey.current = focusKey;
    }
    const { x, y } = travelerPositionForPoint(activePoint, worldWidth);
    if (props.reduceMotion) {
      travelerX.setValue(x);
      travelerY.setValue(y);
    } else {
      Animated.parallel([
        Animated.timing(travelerX, { toValue: x, duration: 480, useNativeDriver: false }),
        Animated.timing(travelerY, { toValue: y, duration: 480, useNativeDriver: false }),
      ]).start();
    }
    if (pendingFocus.current && contentReady.current) {
      focusCurrent(!props.reduceMotion);
      pendingFocus.current = false;
    }
  }, [activePoint, focusCurrent, focusKey, props.reduceMotion, travelerX, travelerY, worldWidth]);

  const fogTarget = layout.points[Math.min(activeIndex + 3, layout.points.length - 1)];
  const fogHeight =
    fogTarget && activeIndex + 3 < layout.points.length ? Math.max(0, fogTarget.y + 54) : 0;
  return (
    <View
      style={[
        styles.shell,
        {
          width: worldWidth,
          height: viewportHeight,
          minHeight: viewportHeight,
          maxHeight: viewportHeight,
        },
      ]}
    >
      <ScrollView
        ref={worldRef}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        style={styles.viewport}
        contentContainerStyle={{ height: layout.contentHeight }}
        scrollEventThrottle={16}
        onScroll={(event) => {
          if (!isMarkJourney) return;
          const nextTop = event.nativeEvent.contentOffset.y;
          setVisibleTop((previous) => (Math.abs(previous - nextTop) >= 120 ? nextTop : previous));
        }}
        onContentSizeChange={() => {
          contentReady.current = true;
          if (pendingFocus.current) {
            focusCurrent(false);
            pendingFocus.current = false;
          }
        }}
      >
        <View style={[styles.world, { width: worldWidth, height: layout.contentHeight }]}>
          {markScene && <MarkGroundLayer ground={markScene.ground} />}
          {layout.regions.map((region, index) => (
            <React.Fragment key={region.id}>
              {!isMarkJourney && (
                <View
                  pointerEvents="none"
                  style={[
                    styles.region,
                    index % 2 === 0 ? styles.regionWarm : styles.regionCool,
                    { top: region.top, height: region.bottom - region.top },
                  ]}
                />
              )}
              <View
                pointerEvents="none"
                style={[
                  styles.regionIdentity,
                  isMarkJourney && styles.markRegionIdentity,
                  { top: region.top + 18 },
                ]}
              >
                <Text style={[styles.regionLabel, isMarkJourney && styles.markRegionLabel]}>
                  {region.label}
                </Text>
                {!isMarkJourney && (
                  <View style={styles.regionLandmark}>
                    <Ionicons
                      name={index % 2 === 0 ? 'trail-sign-outline' : 'navigate-circle-outline'}
                      size={18}
                      color={colors.primary}
                    />
                  </View>
                )}
              </View>
            </React.Fragment>
          ))}

          {layout.points.slice(1).map((point, index) => {
            const previous = layout.points[index]!;
            const dx = point.x - previous.x;
            const dy = point.y - previous.y;
            const length = Math.hypot(dx, dy);
            const revealed = index < activeIndex || props.complete;
            const waterCrossing = isMarkJourney && markWaterRouteNodeIds.has(point.nodeId);
            const previousInHero = isMarkHeroPosition(previous.y, layout.contentHeight);
            const pointInHero = isMarkHeroPosition(point.y, layout.contentHeight);
            const heroRoute = isMarkJourney && (previousInHero || pointInHero) && !waterCrossing;
            const heroRouteEdge = heroRoute && previousInHero !== pointInHero;
            return (
              <View
                key={`route-${point.nodeId}`}
                pointerEvents="none"
                style={[
                  styles.routeSegment,
                  isMarkJourney && styles.markRouteSegment,
                  revealed && styles.routeSegmentComplete,
                  isMarkJourney && revealed && styles.markRouteComplete,
                  waterCrossing && styles.routeWaterCrossing,
                  heroRoute && styles.heroRouteSegment,
                  {
                    left: (previous.x + point.x) / 2 - length / 2,
                    top: (previous.y + point.y) / 2,
                    width: length,
                    transform: [{ rotate: `${Math.atan2(dy, dx) * (180 / Math.PI)}deg` }],
                  },
                ]}
              >
                {heroRoute && (
                  <Image
                    source={require('../../assets/game/mark/hero/road-curve.png')}
                    resizeMode="stretch"
                    style={[
                      styles.heroRoadImage,
                      heroRouteEdge && styles.heroRoadTransition,
                      !revealed && styles.heroRoadFuture,
                    ]}
                  />
                )}
                {isMarkJourney && !waterCrossing && !heroRoute && (
                  <>
                    <View style={styles.routeRuts} />
                    <View style={[styles.routeStone, { left: '24%' }]} />
                    <View style={[styles.routeStone, { left: '61%' }]} />
                  </>
                )}
              </View>
            );
          })}

          {isMarkJourney &&
            layout.points.slice(1, -1).map((point, index) => {
              const revealed = index + 1 < activeIndex || props.complete;
              const waterCrossing = markWaterRouteNodeIds.has(point.nodeId);
              if (isMarkHeroPosition(point.y, layout.contentHeight) && !waterCrossing) return null;
              return (
                <View
                  key={`route-joint-${point.nodeId}`}
                  pointerEvents="none"
                  style={[
                    styles.routeJoint,
                    styles.markRouteJoint,
                    revealed && styles.routeSegmentComplete,
                    revealed && styles.markRouteComplete,
                    waterCrossing && styles.routeWaterCrossingJoint,
                    { left: point.x - 13, top: point.y - 13 },
                  ]}
                />
              );
            })}

          {markScene && <MarkActorLayer actors={markScene.actors} />}

          {nodes.map((node, index) => {
            const point = layout.points[index]!;
            const locked = !node.current && !node.available && !node.complete;
            const future = index > activeIndex + 2 && locked;
            const size = node.kind === 'recap' || node.milestone ? 54 : node.current ? 52 : 44;
            const heroNode = isMarkJourney && isMarkHeroPosition(point.y, layout.contentHeight);
            const onPress = actionForNode(props, node);
            return (
              <Pressable
                key={node.id}
                accessibilityRole="button"
                accessibilityLabel={future ? `Locked. ${node.label}` : node.label}
                accessibilityState={{ disabled: locked }}
                disabled={!onPress}
                onPress={onPress}
                style={({ pressed }) => [
                  styles.nodeTouch,
                  {
                    left: point.x - size / 2,
                    top: point.y - size / 2,
                    width: size,
                    minHeight: size + (node.current ? 58 : 0),
                  },
                  pressed && styles.pressed,
                ]}
              >
                {heroNode && (
                  <View
                    pointerEvents="none"
                    style={[styles.heroNodeGround, { width: size + 14, top: size * 0.57 }]}
                  />
                )}
                <View
                  style={[
                    styles.node,
                    { width: size, height: size, borderRadius: size / 2 },
                    heroNode && styles.heroNode,
                    locked && styles.nodeLocked,
                    node.available && styles.nodeAvailable,
                    node.current && styles.nodeCurrent,
                    node.complete && styles.nodeComplete,
                    node.kind === 'recap' && styles.nodeRecap,
                  ]}
                >
                  {heroNode && <View pointerEvents="none" style={styles.heroNodeInset} />}
                  <Ionicons
                    name={
                      node.complete
                        ? 'checkmark'
                        : locked
                          ? 'lock-closed'
                          : node.kind === 'recap'
                            ? 'flag'
                            : 'book-outline'
                    }
                    size={node.kind === 'recap' ? 22 : 18}
                    color={node.complete ? '#335A42' : locked ? '#716A78' : colors.ink}
                  />
                </View>
                {node.current && (
                  <View style={[styles.currentLabel, heroNode && styles.heroCurrentLabel]}>
                    <Text numberOfLines={2} style={styles.currentLabelTitle}>
                      {node.label}
                    </Text>
                    <Text style={styles.currentLabelMeta}>
                      {node.kind === 'recap' ? 'Chapter recap' : 'Read · ~3 min'}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}

          {activePoint && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.traveler,
                isMarkJourney && styles.markTraveler,
                illustratedTraveler && styles.heroTraveler,
                {
                  left: travelerX,
                  top: travelerY,
                  zIndex: isMarkJourney ? 20 + Math.floor(activePoint.y + 9) : 6,
                },
              ]}
            >
              {isMarkJourney ? (
                <MarkTraveler illustrated={illustratedTraveler} />
              ) : (
                <Ionicons name="person" size={17} color={colors.white} />
              )}
            </Animated.View>
          )}

          {layout.points[0] && (
            <View
              pointerEvents="none"
              style={[styles.startMarker, { top: layout.points[0].y + 62 }]}
            >
              <Ionicons name="flag-outline" size={16} color={colors.primary} />
              <Text style={styles.startText}>START</Text>
            </View>
          )}

          {fogHeight > 0 && (
            <View
              pointerEvents="none"
              accessibilityLabel="Future Path hidden in mist"
              style={[styles.fog, isMarkJourney && styles.markFog, { height: fogHeight }]}
            >
              {isMarkJourney && (
                <>
                  <View style={styles.fogCore} />
                  <Image
                    source={require('../../assets/game/mark/hero/fog-veil.png')}
                    resizeMode="stretch"
                    style={styles.fogVeil}
                  />
                </>
              )}
              <Text style={styles.fogText}>THE JOURNEY CONTINUES</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 0, alignSelf: 'center', overflow: 'hidden', backgroundColor: '#AEBB7E' },
  viewport: { flex: 1 },
  world: { position: 'relative', overflow: 'hidden', backgroundColor: '#AEBB7E' },
  region: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  regionWarm: { backgroundColor: '#D7D4A9' },
  regionCool: { backgroundColor: '#B9C9A7' },
  regionIdentity: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9000,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  regionLabel: {
    color: '#2F2940',
    fontFamily: 'Georgia',
    fontSize: 18,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 251, 239, 0.82)',
    overflow: 'hidden',
  },
  markRegionIdentity: { left: 12, right: 'auto' },
  markRegionLabel: {
    fontSize: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 249, 229, 0.72)',
  },
  regionLandmark: {
    minHeight: 36,
    maxWidth: 148,
    flexDirection: 'row',
    gap: 6,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(47, 41, 64, 0.25)',
    backgroundColor: 'rgba(255, 251, 239, 0.82)',
  },
  routeSegment: {
    position: 'absolute',
    zIndex: 5,
    height: 14,
    marginTop: -7,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: 'rgba(112, 92, 57, 0.42)',
    backgroundColor: '#C6B487',
  },
  routeSegmentComplete: { backgroundColor: '#E1C778', borderColor: '#FFF0B8' },
  markRouteSegment: {
    height: 27,
    marginTop: -13,
    borderWidth: 0,
    borderTopWidth: 3,
    borderBottomWidth: 6,
    borderTopColor: 'rgba(255, 239, 190, 0.62)',
    borderBottomColor: 'rgba(105, 78, 43, 0.48)',
    backgroundColor: '#D4B77A',
    boxShadow: '3px 5px 7px rgba(61, 49, 31, 0.17)',
  },
  markRouteComplete: { backgroundColor: '#DFC58C', borderTopColor: '#FAE5B7' },
  heroRouteSegment: {
    height: 34,
    marginTop: -17,
    borderWidth: 0,
    backgroundColor: 'transparent',
    boxShadow: 'none',
  },
  heroRoadImage: {
    position: 'absolute',
    left: -8,
    top: -14,
    width: '112%',
    height: 62,
  },
  heroRoadTransition: { opacity: 0.78 },
  heroRoadFuture: { opacity: 0.72 },
  routeRuts: {
    position: 'absolute',
    top: 10,
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: 'rgba(121, 84, 47, 0.16)',
  },
  routeStone: {
    position: 'absolute',
    top: 6,
    width: 8,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 236, 192, 0.46)',
  },
  routeWaterCrossing: {
    height: 8,
    marginTop: -4,
    borderWidth: 2,
    borderColor: '#E8F5ED',
    backgroundColor: '#87B9C4',
  },
  routeJoint: {
    position: 'absolute',
    zIndex: 5,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: 'rgba(112, 92, 57, 0.42)',
    backgroundColor: '#C6B487',
  },
  routeWaterCrossingJoint: {
    borderWidth: 2,
    borderColor: '#E8F5ED',
    backgroundColor: '#87B9C4',
  },
  markRouteJoint: {
    width: 27,
    height: 27,
    borderRadius: 14,
    borderWidth: 0,
    backgroundColor: '#D4B77A',
  },
  nodeTouch: { position: 'absolute', alignItems: 'center', zIndex: 9000 },
  node: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderBottomWidth: 5,
    borderColor: '#8B7C63',
    backgroundColor: '#F2EAD7',
    ...shadow,
  },
  nodeLocked: { borderColor: '#817B76', backgroundColor: '#AAA7A0' },
  heroNode: {
    borderBottomWidth: 7,
    boxShadow: '1px 5px 8px rgba(56, 44, 28, 0.28)',
  },
  heroNodeGround: {
    position: 'absolute',
    left: -7,
    height: 25,
    borderRadius: 30,
    backgroundColor: 'rgba(53, 43, 28, 0.32)',
    transform: [{ scaleY: 0.48 }],
  },
  heroNodeInset: {
    position: 'absolute',
    left: 6,
    right: 6,
    top: 5,
    bottom: 9,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 252, 234, 0.44)',
  },
  nodeAvailable: { borderColor: '#D3A63A', backgroundColor: '#F5DC83' },
  nodeCurrent: { borderColor: '#FFFDF7', borderWidth: 5, backgroundColor: '#F5CF68' },
  nodeComplete: { borderColor: '#517657', backgroundColor: '#CDE1B7' },
  nodeRecap: { borderColor: '#6A4AA2' },
  currentLabel: {
    width: 190,
    marginTop: 7,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#B58C3E',
    backgroundColor: '#FFFDF7',
    ...shadow,
  },
  heroCurrentLabel: {
    width: 178,
    borderRadius: 8,
    borderColor: 'rgba(116, 80, 43, 0.8)',
    borderBottomWidth: 3,
    backgroundColor: 'rgba(246, 230, 194, 0.97)',
    boxShadow: '1px 4px 6px rgba(56, 44, 28, 0.26)',
  },
  currentLabelTitle: { color: colors.ink, fontSize: 12, fontWeight: '900', textAlign: 'center' },
  currentLabelMeta: {
    marginTop: 3,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  traveler: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFDF7',
    backgroundColor: colors.primary,
    ...shadow,
  },
  markTraveler: {
    width: 37,
    height: 51,
    marginTop: -27,
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
    shadowOpacity: 0,
  },
  heroTraveler: { width: 47, height: 65, marginTop: -38 },
  startMarker: {
    position: 'absolute',
    zIndex: 9000,
    left: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 249, 236, 0.8)',
  },
  startText: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  fog: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10000,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 28,
    borderBottomLeftRadius: 90,
    borderBottomRightRadius: 90,
    backgroundColor: 'rgba(235, 238, 222, 0.82)',
  },
  markFog: {
    paddingBottom: 38,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: 'transparent',
  },
  fogCore: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 198,
    backgroundColor: 'rgba(234, 236, 219, 0.97)',
  },
  fogVeil: { position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', height: 200 },
  fogText: { color: 'rgba(47, 41, 64, 0.55)', fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
