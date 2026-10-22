import React from 'react';
import { Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import type { MarkHeroAsset } from '../data/markJourneyWorld';
import type { MarkSceneActor, MarkSceneGround } from '../lib/markWorldScene';

const heroArt: Record<MarkHeroAsset, ImageSourcePropType> = {
  'earth-patch': require('../../assets/game/mark/hero/earth-patch.png'),
  'olive-ground': require('../../assets/game/mark/hero/olive-ground.png'),
  'olive-tree': require('../../assets/game/mark/hero/olive-tree.png'),
  'young-olive': require('../../assets/game/mark/hero/young-olive.png'),
  'olive-saplings': require('../../assets/game/mark/hero/olive-saplings.png'),
  'ancient-olive': require('../../assets/game/mark/hero/ancient-olive.png'),
  'fisher-house': require('../../assets/game/mark/hero/fisher-house.png'),
  'market-house': require('../../assets/game/mark/hero/market-house.png'),
  'stone-wall': require('../../assets/game/mark/hero/stone-wall.png'),
  courtyard: require('../../assets/game/mark/hero/courtyard.png'),
  'shore-props': require('../../assets/game/mark/hero/shore-props.png'),
};

const palette = {
  light: '#FFF0C4',
  shade: '#665744',
  sand: '#DCC992',
  grass: '#94AA70',
  stone: '#B8AC90',
  field: '#D7B96B',
  water: '#6FAFC0',
  waterDeep: '#568CA4',
} as const;

const terrainTones = {
  sand: palette.sand,
  grass: palette.grass,
  stone: palette.stone,
  field: palette.field,
} as const;

function TerrainPiece({ ground }: { ground: MarkSceneGround }) {
  const { object } = ground;
  if (object.type === 'water') {
    return (
      <View
        style={[
          styles.water,
          { backgroundColor: object.tone === 'deep' ? palette.waterDeep : palette.water },
          { transform: [{ rotate: `${object.rotation ?? 0}deg` }] },
        ]}
      >
        <View style={styles.waterInner} />
        {[0.25, 0.47, 0.7].map((top) => (
          <View key={top} style={[styles.waterGlint, { top: `${top * 100}%` }]} />
        ))}
      </View>
    );
  }
  if (object.type !== 'terrain') return null;
  return (
    <View
      style={[
        styles.terrain,
        { backgroundColor: terrainTones[object.tone] },
        { transform: [{ rotate: `${object.rotation ?? 0}deg` }] },
      ]}
    >
      <View style={styles.terrainSun} />
      <View style={styles.terrainTerrace} />
      <View style={styles.terrainLower} />
      <View style={styles.terrainContour} />
    </View>
  );
}

function TreePiece({ variant }: { variant: string }) {
  const cypress = variant === 'cypress';
  return (
    <View style={styles.piece}>
      <View style={styles.treeShadow} />
      <View style={[styles.trunk, cypress && styles.cypressTrunk]} />
      <View style={[styles.canopyBack, cypress && styles.cypressBack]} />
      <View style={[styles.canopyFront, cypress && styles.cypressFront]} />
      <View style={[styles.canopyHighlight, cypress && styles.cypressHighlight]} />
    </View>
  );
}

function HousePiece() {
  return (
    <View style={styles.piece}>
      <View style={styles.houseShadow} />
      <View style={styles.houseSide} />
      <View style={styles.houseFront} />
      <View style={styles.houseRoofSide} />
      <View style={styles.houseRoofTop} />
      <View style={styles.houseRoofLight} />
      <View style={styles.houseDoor} />
      <View style={styles.houseWindow} />
    </View>
  );
}

function RockPiece() {
  return (
    <View style={styles.piece}>
      <View style={styles.rockShadow} />
      <View style={styles.rockSide} />
      <View style={styles.rockTop} />
      <View style={styles.rockHighlight} />
    </View>
  );
}

function WallPiece() {
  return (
    <View style={styles.piece}>
      <View style={styles.wallShadow} />
      <View style={styles.wallSide} />
      <View style={styles.wallFace} />
      <View style={styles.wallTop} />
      <View style={styles.wallCap} />
    </View>
  );
}

function PlantPiece({ grain }: { grain: boolean }) {
  return (
    <View style={styles.piece}>
      <View style={[styles.plantBlade, grain && styles.grainBlade]} />
      <View style={[styles.plantBlade, styles.plantBladeRight, grain && styles.grainBlade]} />
      {grain && <View style={styles.grainHead} />}
    </View>
  );
}

function GatePiece() {
  return (
    <View style={styles.gateScene}>
      <View style={styles.landmarkShadow} />
      <View style={styles.gateLeftSide} />
      <View style={styles.gateRightSide} />
      <View style={styles.gateLeft} />
      <View style={styles.gateRight} />
      <View style={styles.gateLintelSide} />
      <View style={styles.gateLintelTop} />
    </View>
  );
}

function BoatPiece() {
  return (
    <View style={styles.boatScene}>
      <View style={styles.boatWaterShadow} />
      <View style={styles.boatHullSide} />
      <View style={styles.boatHullTop} />
      <View style={styles.boatMast} />
      <View style={styles.boatSail} />
    </View>
  );
}

function LandmarkPiece({ actor }: { actor: MarkSceneActor }) {
  const variant = actor.landmark?.variant;
  return (
    <View style={styles.landmark}>
      {actor.id === 'prominent-olive' || actor.id === 'town-courtyard' ? (
        <>
          <View style={styles.heroLandmarkGroundShadow} />
          <Image
            source={heroArt[actor.id === 'prominent-olive' ? 'ancient-olive' : 'courtyard']}
            style={styles.heroLandmarkImage}
            resizeMode="contain"
          />
        </>
      ) : variant === 'boat' || variant === 'crossing' ? (
        <BoatPiece />
      ) : variant === 'gate' ? (
        <GatePiece />
      ) : variant === 'olive' ? (
        <View style={styles.landmarkTree}>
          <TreePiece variant="olive" />
        </View>
      ) : (
        <View style={styles.landmarkVillage}>
          <View style={styles.landmarkHouseBack}>
            <HousePiece />
          </View>
          <View style={styles.landmarkHouseFront}>
            <HousePiece />
          </View>
          <View style={styles.villageWall} />
          <View style={styles.villageWallTop} />
        </View>
      )}
      <Text style={styles.landmarkLabel}>{actor.landmark?.label}</Text>
    </View>
  );
}

export function MarkGroundObject({ ground }: { ground: MarkSceneGround }) {
  if (ground.object.type === 'art') {
    return (
      <Image
        source={heroArt[ground.object.asset]}
        resizeMode="stretch"
        style={[
          styles.heroGroundImage,
          { transform: [{ rotate: `${ground.object.rotation ?? 0}deg` }] },
        ]}
      />
    );
  }
  return <TerrainPiece ground={ground} />;
}

export function MarkWorldActor({ actor }: { actor: MarkSceneActor }) {
  if (actor.kind === 'art' && actor.asset) {
    return (
      <View style={styles.heroActor}>
        <View style={styles.heroActorGroundShadow} />
        <Image source={heroArt[actor.asset]} resizeMode="contain" style={styles.heroActorImage} />
      </View>
    );
  }
  return (
    <View style={[styles.actorScale, { transform: [{ scale: actor.scale }] }]}>
      {actor.kind === 'tree' ? (
        <TreePiece variant={actor.variant ?? 'olive'} />
      ) : actor.kind === 'house' ? (
        <HousePiece />
      ) : actor.kind === 'rock' ? (
        <RockPiece />
      ) : actor.kind === 'wall' ? (
        <WallPiece />
      ) : actor.kind === 'grass' || actor.kind === 'grain' ? (
        <PlantPiece grain={actor.kind === 'grain'} />
      ) : (
        <LandmarkPiece actor={actor} />
      )}
    </View>
  );
}

export function MarkTraveler({ illustrated = false }: { illustrated?: boolean }) {
  if (illustrated) {
    return (
      <View style={styles.heroTravelerScene}>
        <View style={styles.heroTravelerGroundLight} />
        <View style={styles.heroTravelerGroundShadow} />
        <Image
          source={require('../../assets/game/mark/hero/traveler.png')}
          resizeMode="contain"
          style={styles.heroActorImage}
        />
      </View>
    );
  }
  return (
    <View style={styles.travelerPiece}>
      <View style={styles.travelerShadow} />
      <View style={styles.travelerFootLeft} />
      <View style={styles.travelerFootRight} />
      <View style={styles.travelerPack} />
      <View style={styles.travelerTunicSide} />
      <View style={styles.travelerTunic} />
      <View style={styles.travelerFace} />
      <View style={styles.travelerHair} />
    </View>
  );
}

const styles = StyleSheet.create({
  heroGroundImage: { width: '100%', height: '100%' },
  heroActorImage: { width: '100%', height: '100%' },
  heroActor: { width: '100%', height: '100%' },
  heroActorGroundShadow: {
    position: 'absolute',
    bottom: '7%',
    left: '18%',
    width: '64%',
    height: 11,
    borderRadius: 20,
    backgroundColor: 'rgba(46, 39, 25, 0.27)',
    boxShadow: '0px 5px 11px rgba(48, 40, 25, 0.18)',
  },
  heroLandmarkGroundShadow: {
    position: 'absolute',
    bottom: '13%',
    left: '15%',
    width: '70%',
    height: 19,
    borderRadius: 50,
    backgroundColor: 'rgba(47, 41, 27, 0.32)',
    boxShadow: '0px 6px 15px rgba(48, 40, 25, 0.22)',
  },
  heroLandmarkImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '88%',
    width: '100%',
  },
  heroTravelerScene: { width: '100%', height: '100%', position: 'relative' },
  heroTravelerGroundLight: {
    position: 'absolute',
    bottom: 1,
    left: '3%',
    width: '94%',
    height: 19,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 231, 169, 0.55)',
    boxShadow: '0px 0px 11px rgba(255, 229, 158, 0.52)',
  },
  heroTravelerGroundShadow: {
    position: 'absolute',
    bottom: 4,
    left: '20%',
    width: '60%',
    height: 9,
    borderRadius: 18,
    backgroundColor: 'rgba(50, 40, 29, 0.46)',
  },
  actorScale: { width: '100%', height: '100%' },
  piece: { width: '100%', height: '100%', position: 'relative' },
  terrain: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 210,
    borderBottomWidth: 17,
    borderBottomColor: 'rgba(86, 73, 48, 0.35)',
    boxShadow: '7px 13px 22px rgba(45, 39, 25, 0.19)',
  },
  terrainSun: {
    position: 'absolute',
    left: '8%',
    top: '5%',
    width: '72%',
    height: '32%',
    borderRadius: 150,
    backgroundColor: 'rgba(255, 244, 196, 0.20)',
  },
  terrainContour: {
    position: 'absolute',
    right: '4%',
    bottom: '9%',
    width: '50%',
    height: '12%',
    borderRadius: 90,
    borderTopWidth: 3,
    borderTopColor: 'rgba(105, 86, 56, 0.17)',
  },
  terrainTerrace: {
    position: 'absolute',
    top: '34%',
    left: '16%',
    width: '48%',
    height: '17%',
    borderRadius: 120,
    backgroundColor: 'rgba(255, 237, 185, 0.13)',
    transform: [{ rotate: '-9deg' }],
  },
  terrainLower: {
    position: 'absolute',
    bottom: '15%',
    right: '8%',
    width: '59%',
    height: '13%',
    borderRadius: 120,
    backgroundColor: 'rgba(76, 85, 54, 0.1)',
    transform: [{ rotate: '7deg' }],
  },
  water: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 240,
    borderWidth: 11,
    borderTopColor: '#E3D4A6',
    borderLeftColor: '#D4C28C',
    borderBottomColor: '#507E8D',
    borderRightColor: '#638D98',
    boxShadow: 'inset 3px 7px 10px rgba(35, 70, 80, 0.27)',
  },
  waterInner: {
    position: 'absolute',
    top: 7,
    left: 9,
    right: 9,
    bottom: 9,
    borderRadius: 180,
    borderTopWidth: 2,
    borderTopColor: 'rgba(234, 247, 227, 0.5)',
  },
  waterGlint: {
    position: 'absolute',
    left: '18%',
    width: '48%',
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(245, 252, 236, 0.53)',
  },
  treeShadow: {
    position: 'absolute',
    bottom: 1,
    left: 14,
    width: 47,
    height: 13,
    borderRadius: 20,
    backgroundColor: 'rgba(51, 57, 37, 0.29)',
    transform: [{ rotate: '-12deg' }],
  },
  trunk: {
    position: 'absolute',
    bottom: 8,
    left: 23,
    width: 11,
    height: 37,
    borderRadius: 4,
    borderRightWidth: 4,
    borderRightColor: '#5D4434',
    backgroundColor: '#967052',
  },
  cypressTrunk: { height: 47, width: 8, left: 25 },
  canopyBack: {
    position: 'absolute',
    top: 13,
    left: 8,
    width: 47,
    height: 39,
    borderRadius: 25,
    backgroundColor: '#344F3E',
    boxShadow: '4px 7px 9px rgba(35, 48, 30, 0.2)',
  },
  canopyFront: {
    position: 'absolute',
    top: 6,
    left: 3,
    width: 42,
    height: 36,
    borderRadius: 23,
    borderBottomWidth: 5,
    borderBottomColor: '#3D6245',
    backgroundColor: '#688953',
  },
  canopyHighlight: {
    position: 'absolute',
    top: 11,
    left: 9,
    width: 23,
    height: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(187, 207, 130, 0.62)',
  },
  cypressBack: { top: 5, left: 17, width: 28, height: 59, borderRadius: 18 },
  cypressFront: { top: 0, left: 12, width: 26, height: 55, borderRadius: 16 },
  cypressHighlight: { top: 9, left: 17, width: 8, height: 35, borderRadius: 8 },
  houseShadow: {
    position: 'absolute',
    left: 12,
    bottom: 1,
    width: 65,
    height: 13,
    borderRadius: 30,
    backgroundColor: 'rgba(58, 48, 34, 0.28)',
  },
  houseSide: {
    position: 'absolute',
    top: 27,
    right: 5,
    width: 20,
    height: 34,
    backgroundColor: '#A58B68',
    transform: [{ skewY: '-9deg' }],
  },
  houseFront: {
    position: 'absolute',
    top: 27,
    left: 5,
    width: 51,
    height: 34,
    borderBottomWidth: 3,
    borderBottomColor: '#977E5C',
    backgroundColor: '#E5D2A7',
  },
  houseRoofSide: {
    position: 'absolute',
    top: 21,
    left: 1,
    width: 68,
    height: 16,
    borderBottomWidth: 6,
    borderBottomColor: '#80593D',
    backgroundColor: '#9D7250',
    transform: [{ skewX: '-16deg' }],
  },
  houseRoofTop: {
    position: 'absolute',
    top: 6,
    left: 2,
    width: 65,
    height: 23,
    borderTopWidth: 2,
    borderTopColor: '#E6BE83',
    backgroundColor: '#BA8558',
    transform: [{ skewX: '-23deg' }],
  },
  houseRoofLight: {
    position: 'absolute',
    top: 10,
    left: 9,
    width: 49,
    height: 4,
    backgroundColor: 'rgba(255, 218, 157, 0.43)',
    transform: [{ skewX: '-23deg' }],
  },
  houseDoor: {
    position: 'absolute',
    bottom: 3,
    left: 29,
    width: 11,
    height: 20,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    backgroundColor: '#75583D',
  },
  houseWindow: {
    position: 'absolute',
    top: 36,
    left: 13,
    width: 8,
    height: 9,
    borderWidth: 2,
    borderColor: '#C7AF83',
    backgroundColor: '#536B68',
  },
  rockShadow: {
    position: 'absolute',
    bottom: 1,
    left: 6,
    width: 35,
    height: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(52, 48, 39, 0.26)',
  },
  rockSide: {
    position: 'absolute',
    bottom: 5,
    left: 3,
    width: 35,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#8F8875',
  },
  rockTop: {
    position: 'absolute',
    top: 3,
    left: 2,
    width: 32,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#C8BFA5',
    transform: [{ skewX: '-16deg' }],
  },
  rockHighlight: {
    position: 'absolute',
    top: 7,
    left: 7,
    width: 15,
    height: 4,
    borderRadius: 3,
    backgroundColor: 'rgba(250, 235, 193, 0.6)',
  },
  wallShadow: {
    position: 'absolute',
    bottom: 1,
    left: 8,
    width: 88,
    height: 11,
    borderRadius: 12,
    backgroundColor: 'rgba(60, 49, 34, 0.27)',
  },
  wallSide: {
    position: 'absolute',
    bottom: 8,
    right: 1,
    width: 18,
    height: 24,
    backgroundColor: '#8B795D',
    transform: [{ skewY: '-15deg' }],
  },
  wallFace: {
    position: 'absolute',
    bottom: 7,
    left: 4,
    width: 77,
    height: 25,
    borderBottomWidth: 4,
    borderBottomColor: '#9A8061',
    backgroundColor: '#CAB58E',
  },
  wallTop: {
    position: 'absolute',
    top: 5,
    left: 3,
    width: 84,
    height: 11,
    backgroundColor: '#E7D5AC',
    transform: [{ skewX: '-17deg' }],
  },
  wallCap: {
    position: 'absolute',
    top: 3,
    left: 2,
    width: 15,
    height: 15,
    backgroundColor: '#EBDCB8',
    borderBottomWidth: 4,
    borderBottomColor: '#AD9871',
  },
  plantBlade: {
    position: 'absolute',
    bottom: 2,
    left: 3,
    width: 5,
    height: 25,
    borderRadius: 3,
    backgroundColor: '#5E7B49',
    transform: [{ rotate: '-19deg' }],
  },
  plantBladeRight: { left: 7, height: 20, transform: [{ rotate: '22deg' }] },
  grainBlade: { backgroundColor: '#B58F43', height: 33 },
  grainHead: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 8,
    height: 13,
    borderRadius: 5,
    backgroundColor: '#E7CA78',
  },
  landmark: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  landmarkLabel: {
    maxWidth: 140,
    marginTop: 2,
    color: '#3D3227',
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(255, 245, 210, 0.96)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  landmarkShadow: {
    position: 'absolute',
    bottom: 4,
    left: 18,
    width: 90,
    height: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(53, 48, 34, 0.29)',
  },
  gateScene: { width: 116, height: 72, position: 'relative' },
  gateLeft: {
    position: 'absolute',
    bottom: 8,
    left: 13,
    width: 20,
    height: 47,
    backgroundColor: '#E4D0A2',
    borderBottomWidth: 5,
    borderBottomColor: '#9C8866',
  },
  gateRight: {
    position: 'absolute',
    bottom: 8,
    right: 15,
    width: 20,
    height: 47,
    backgroundColor: '#D8C294',
    borderBottomWidth: 5,
    borderBottomColor: '#927F61',
  },
  gateLeftSide: {
    position: 'absolute',
    bottom: 8,
    left: 31,
    width: 9,
    height: 47,
    backgroundColor: '#9D8C6B',
    transform: [{ skewY: '-12deg' }],
  },
  gateRightSide: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 9,
    height: 47,
    backgroundColor: '#8A795C',
    transform: [{ skewY: '-12deg' }],
  },
  gateLintelSide: {
    position: 'absolute',
    top: 13,
    left: 9,
    width: 101,
    height: 14,
    backgroundColor: '#9B7959',
  },
  gateLintelTop: {
    position: 'absolute',
    top: 4,
    left: 8,
    width: 98,
    height: 15,
    backgroundColor: '#E7D3A7',
    transform: [{ skewX: '-17deg' }],
  },
  boatScene: { width: 112, height: 66, position: 'relative' },
  boatWaterShadow: {
    position: 'absolute',
    bottom: 0,
    left: 13,
    width: 94,
    height: 17,
    borderRadius: 25,
    backgroundColor: 'rgba(34, 96, 111, 0.38)',
  },
  boatHullSide: {
    position: 'absolute',
    bottom: 8,
    left: 13,
    width: 87,
    height: 23,
    borderBottomLeftRadius: 38,
    borderBottomRightRadius: 38,
    backgroundColor: '#6B4C37',
  },
  boatHullTop: {
    position: 'absolute',
    bottom: 25,
    left: 15,
    width: 83,
    height: 10,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#B48354',
    backgroundColor: '#D6B27A',
  },
  boatMast: {
    position: 'absolute',
    bottom: 28,
    left: 56,
    width: 4,
    height: 35,
    backgroundColor: '#775A43',
  },
  boatSail: {
    position: 'absolute',
    bottom: 34,
    left: 34,
    width: 23,
    height: 29,
    borderTopLeftRadius: 18,
    backgroundColor: '#EFE0B6',
    transform: [{ skewX: '-18deg' }],
  },
  landmarkTree: { width: 74, height: 85, transform: [{ scale: 1.24 }] },
  landmarkVillage: { width: 125, height: 84, position: 'relative' },
  landmarkHouseBack: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 72,
    height: 64,
    transform: [{ scale: 0.85 }],
  },
  landmarkHouseFront: { position: 'absolute', bottom: 8, left: 0, width: 72, height: 64 },
  villageWall: {
    position: 'absolute',
    bottom: 5,
    left: 55,
    width: 70,
    height: 18,
    backgroundColor: '#B6A078',
    borderBottomWidth: 4,
    borderBottomColor: '#8F7C60',
  },
  villageWallTop: {
    position: 'absolute',
    bottom: 19,
    left: 54,
    width: 72,
    height: 7,
    backgroundColor: '#E5D1A7',
    transform: [{ skewX: '-15deg' }],
  },
  travelerPiece: { width: 37, height: 51, position: 'relative' },
  travelerShadow: {
    position: 'absolute',
    bottom: 0,
    left: 3,
    width: 36,
    height: 11,
    borderRadius: 20,
    backgroundColor: 'rgba(53, 44, 33, 0.32)',
  },
  travelerFootLeft: {
    position: 'absolute',
    bottom: 5,
    left: 11,
    width: 7,
    height: 15,
    borderRadius: 3,
    backgroundColor: '#553F37',
  },
  travelerFootRight: {
    position: 'absolute',
    bottom: 5,
    left: 23,
    width: 7,
    height: 15,
    borderRadius: 3,
    backgroundColor: '#604738',
  },
  travelerPack: {
    position: 'absolute',
    bottom: 18,
    left: 3,
    width: 12,
    height: 21,
    borderRadius: 5,
    backgroundColor: '#957044',
  },
  travelerTunicSide: {
    position: 'absolute',
    bottom: 16,
    left: 13,
    width: 21,
    height: 23,
    borderBottomRightRadius: 6,
    backgroundColor: '#315979',
  },
  travelerTunic: {
    position: 'absolute',
    bottom: 18,
    left: 12,
    width: 17,
    height: 22,
    borderBottomLeftRadius: 6,
    backgroundColor: '#6290A4',
  },
  travelerFace: {
    position: 'absolute',
    top: 5,
    left: 16,
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#DDAE7A',
  },
  travelerHair: {
    position: 'absolute',
    top: 2,
    left: 13,
    width: 19,
    height: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 9,
    backgroundColor: '#5B4638',
  },
});
