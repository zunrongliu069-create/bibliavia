export type MarkWorldObjectType =
  | 'art'
  | 'terrain'
  | 'water'
  | 'vegetation'
  | 'building'
  | 'landmark'
  | 'foreground';

export type MarkHeroAsset =
  | 'earth-patch'
  | 'olive-ground'
  | 'olive-tree'
  | 'young-olive'
  | 'olive-saplings'
  | 'ancient-olive'
  | 'fisher-house'
  | 'market-house'
  | 'stone-wall'
  | 'courtyard'
  | 'shore-props';

type PositionedWorldObject = {
  id: string;
  type: MarkWorldObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
};

export type MarkWorldObject =
  | (PositionedWorldObject & {
      type: 'art';
      layer: 'ground' | 'actor';
      asset: MarkHeroAsset;
    })
  | (PositionedWorldObject & {
      type: 'terrain';
      tone: 'sand' | 'grass' | 'stone' | 'field';
    })
  | (PositionedWorldObject & {
      type: 'water';
      tone: 'clear' | 'deep';
    })
  | (PositionedWorldObject & {
      type: 'vegetation';
      variant: 'olive' | 'cypress' | 'grove';
      count: number;
    })
  | (PositionedWorldObject & {
      type: 'building';
      variant: 'village' | 'courtyard' | 'settlement';
      count: number;
    })
  | (PositionedWorldObject & {
      type: 'foreground';
      variant: 'rocks' | 'grass' | 'grain' | 'wall';
      count: number;
    })
  | {
      id: string;
      type: 'landmark';
      x: number;
      y: number;
      width: number;
      height: number;
      anchorNodeId: string;
      offsetY: number;
      label: string;
      variant: 'boat' | 'gate' | 'courtyard' | 'olive' | 'crossing' | 'settlement';
    };

export const markWaterRouteNodeIds: ReadonlySet<string> = new Set([
  'mark-4-recap',
  'mark-5-legion',
]);

export const markHeroWorldRange = { from: 0.29, to: 0.69 } as const;

export const markRouteXFractions = [
  0.34, 0.4, 0.48, 0.55, 0.62, 0.65, 0.6, 0.53, 0.45, 0.38, 0.34, 0.35,
] as const;

export const markWorldObjects: readonly MarkWorldObject[] = [
  {
    id: 'sand-low',
    type: 'terrain',
    tone: 'sand',
    x: 0.55,
    y: 0.06,
    width: 520,
    height: 620,
    rotation: -5,
  },
  {
    id: 'shore-low',
    type: 'water',
    tone: 'clear',
    x: 0.04,
    y: 0.24,
    width: 250,
    height: 520,
    rotation: 8,
  },
  {
    id: 'rock-low',
    type: 'terrain',
    tone: 'stone',
    x: 0.82,
    y: 0.15,
    width: 340,
    height: 430,
    rotation: 10,
  },
  {
    id: 'town-ground',
    type: 'terrain',
    tone: 'sand',
    x: 0.5,
    y: 0.27,
    width: 650,
    height: 720,
    rotation: 3,
  },
  {
    id: 'hill-stone',
    type: 'terrain',
    tone: 'stone',
    x: 0.15,
    y: 0.64,
    width: 390,
    height: 540,
    rotation: 12,
  },
  {
    id: 'lake-crossing',
    type: 'water',
    tone: 'deep',
    x: 0.72,
    y: 0.785,
    width: 600,
    height: 290,
    rotation: -8,
  },
  {
    id: 'far-shore',
    type: 'terrain',
    tone: 'stone',
    x: 0.42,
    y: 0.88,
    width: 650,
    height: 650,
    rotation: 7,
  },
  {
    id: 'far-grass',
    type: 'terrain',
    tone: 'grass',
    x: 0.76,
    y: 0.94,
    width: 450,
    height: 420,
    rotation: -9,
  },

  // One authored settlement-to-olive-hill slice; each asset stays independently positioned.
  {
    id: 'hero-earth-entry',
    type: 'art',
    layer: 'ground',
    asset: 'earth-patch',
    x: 0.76,
    y: 0.43,
    width: 590,
    height: 240,
    rotation: -7,
  },
  {
    id: 'hero-earth-town-threshold',
    type: 'art',
    layer: 'ground',
    asset: 'earth-patch',
    x: 0.74,
    y: 0.351,
    width: 590,
    height: 265,
    rotation: 4,
  },
  {
    id: 'hero-earth-settlement-approach',
    type: 'art',
    layer: 'ground',
    asset: 'earth-patch',
    x: 0.24,
    y: 0.306,
    width: 590,
    height: 245,
    rotation: -6,
  },
  {
    id: 'hero-earth-current',
    type: 'art',
    layer: 'ground',
    asset: 'earth-patch',
    x: 0.75,
    y: 0.52,
    width: 590,
    height: 245,
    rotation: 6,
  },
  {
    id: 'hero-earth-ascent',
    type: 'art',
    layer: 'ground',
    asset: 'earth-patch',
    x: 0.75,
    y: 0.6,
    width: 590,
    height: 230,
    rotation: -10,
  },
  {
    id: 'hero-olive-ground-current',
    type: 'art',
    layer: 'ground',
    asset: 'olive-ground',
    x: 0.25,
    y: 0.495,
    width: 590,
    height: 315,
    rotation: 7,
  },
  {
    id: 'hero-olive-ground-entry',
    type: 'art',
    layer: 'ground',
    asset: 'olive-ground',
    x: 0.25,
    y: 0.425,
    width: 590,
    height: 310,
    rotation: -9,
  },
  {
    id: 'hero-olive-ground-link',
    type: 'art',
    layer: 'ground',
    asset: 'olive-ground',
    x: 0.75,
    y: 0.461,
    width: 590,
    height: 310,
    rotation: -4,
  },
  {
    id: 'hero-olive-ground-courtyard',
    type: 'art',
    layer: 'ground',
    asset: 'olive-ground',
    x: 0.75,
    y: 0.391,
    width: 590,
    height: 310,
    rotation: 5,
  },
  {
    id: 'hero-olive-ground-threshold',
    type: 'art',
    layer: 'ground',
    asset: 'olive-ground',
    x: 0.25,
    y: 0.356,
    width: 590,
    height: 310,
    rotation: -6,
  },
  {
    id: 'hero-olive-ground-settlement-approach',
    type: 'art',
    layer: 'ground',
    asset: 'olive-ground',
    x: 0.75,
    y: 0.316,
    width: 590,
    height: 295,
    rotation: 3,
  },
  {
    id: 'hero-olive-ground-ascent',
    type: 'art',
    layer: 'ground',
    asset: 'olive-ground',
    x: 0.25,
    y: 0.59,
    width: 590,
    height: 310,
    rotation: -7,
  },
  {
    id: 'hero-olive-ground-ascent-link',
    type: 'art',
    layer: 'ground',
    asset: 'olive-ground',
    x: 0.54,
    y: 0.575,
    width: 590,
    height: 305,
    rotation: 5,
  },
  {
    id: 'hero-olive-ground-roadside-link',
    type: 'art',
    layer: 'ground',
    asset: 'olive-ground',
    x: 0.47,
    y: 0.475,
    width: 590,
    height: 315,
    rotation: -5,
  },
  {
    id: 'hero-olive-ground-courtyard-link',
    type: 'art',
    layer: 'ground',
    asset: 'olive-ground',
    x: 0.46,
    y: 0.35,
    width: 590,
    height: 305,
    rotation: 7,
  },
  {
    id: 'hero-courtyard-edge',
    type: 'art',
    layer: 'actor',
    asset: 'courtyard',
    x: 0.84,
    y: 0.415,
    width: 190,
    height: 127,
  },
  {
    id: 'hero-house-left',
    type: 'art',
    layer: 'actor',
    asset: 'fisher-house',
    x: 0.13,
    y: 0.47,
    width: 120,
    height: 85,
  },
  {
    id: 'hero-house-right',
    type: 'art',
    layer: 'actor',
    asset: 'fisher-house',
    x: 0.89,
    y: 0.545,
    width: 112,
    height: 79,
  },
  {
    id: 'hero-olive-foreground',
    type: 'art',
    layer: 'actor',
    asset: 'olive-tree',
    x: 0.74,
    y: 0.49,
    width: 125,
    height: 139,
  },
  {
    id: 'hero-olive-left',
    type: 'art',
    layer: 'actor',
    asset: 'olive-tree',
    x: 0.12,
    y: 0.55,
    width: 108,
    height: 120,
  },
  {
    id: 'hero-saplings-entry',
    type: 'art',
    layer: 'actor',
    asset: 'olive-saplings',
    x: 0.17,
    y: 0.425,
    width: 87,
    height: 82,
  },
  {
    id: 'hero-saplings-ascent',
    type: 'art',
    layer: 'actor',
    asset: 'olive-saplings',
    x: 0.93,
    y: 0.59,
    width: 100,
    height: 94,
  },
  {
    id: 'hero-shore-props',
    type: 'art',
    layer: 'actor',
    asset: 'shore-props',
    x: 0.11,
    y: 0.485,
    width: 97,
    height: 66,
  },
  {
    id: 'hero-hill-props',
    type: 'art',
    layer: 'actor',
    asset: 'shore-props',
    x: 0.85,
    y: 0.565,
    width: 86,
    height: 59,
  },

  {
    id: 'olives-low',
    type: 'vegetation',
    variant: 'olive',
    count: 4,
    x: 0.72,
    y: 0.09,
    width: 210,
    height: 180,
  },
  {
    id: 'cypress-road',
    type: 'vegetation',
    variant: 'cypress',
    count: 4,
    x: 0.2,
    y: 0.18,
    width: 170,
    height: 230,
  },
  {
    id: 'town-grove',
    type: 'art',
    layer: 'actor',
    asset: 'young-olive',
    x: 0.8,
    y: 0.34,
    width: 142,
    height: 150,
  },
  {
    id: 'shore-grove',
    type: 'art',
    layer: 'actor',
    asset: 'young-olive',
    x: 0.18,
    y: 0.67,
    width: 143,
    height: 150,
  },
  {
    id: 'far-olives',
    type: 'vegetation',
    variant: 'olive',
    count: 5,
    x: 0.78,
    y: 0.9,
    width: 230,
    height: 210,
  },

  {
    id: 'village-low',
    type: 'building',
    variant: 'village',
    count: 3,
    x: 0.78,
    y: 0.2,
    width: 210,
    height: 170,
  },
  {
    id: 'capernaum',
    type: 'art',
    layer: 'actor',
    asset: 'courtyard',
    x: 0.72,
    y: 0.31,
    width: 200,
    height: 155,
  },
  {
    id: 'courtyard-homes',
    type: 'art',
    layer: 'actor',
    asset: 'market-house',
    x: 0.68,
    y: 0.4,
    width: 132,
    height: 100,
  },
  {
    id: 'courtyard-homes-edge',
    type: 'art',
    layer: 'actor',
    asset: 'fisher-house',
    x: 0.93,
    y: 0.394,
    width: 116,
    height: 81,
  },
  {
    id: 'far-settlement',
    type: 'building',
    variant: 'settlement',
    count: 4,
    x: 0.72,
    y: 0.93,
    width: 250,
    height: 200,
  },

  {
    id: 'rocks-low',
    type: 'foreground',
    variant: 'rocks',
    count: 7,
    x: 0.48,
    y: 0.12,
    width: 300,
    height: 130,
  },
  {
    id: 'market-grass',
    type: 'art',
    layer: 'actor',
    asset: 'olive-saplings',
    x: 0.7,
    y: 0.28,
    width: 112,
    height: 75,
  },
  {
    id: 'capernaum-wall',
    type: 'art',
    layer: 'actor',
    asset: 'stone-wall',
    x: 0.58,
    y: 0.34,
    width: 146,
    height: 92,
  },
  {
    id: 'hill-rocks',
    type: 'art',
    layer: 'actor',
    asset: 'shore-props',
    x: 0.48,
    y: 0.66,
    width: 115,
    height: 72,
  },
  {
    id: 'shore-grass',
    type: 'art',
    layer: 'actor',
    asset: 'olive-saplings',
    x: 0.58,
    y: 0.7,
    width: 116,
    height: 78,
  },
  {
    id: 'far-rocks',
    type: 'foreground',
    variant: 'rocks',
    count: 9,
    x: 0.42,
    y: 0.9,
    width: 350,
    height: 150,
  },

  {
    id: 'call-boat',
    type: 'landmark',
    variant: 'boat',
    anchorNodeId: 'mark-1-recap',
    offsetY: 130,
    label: 'Fishing shore',
    x: 0.18,
    y: 0,
    width: 116,
    height: 90,
  },
  {
    id: 'settlement-gate',
    type: 'landmark',
    variant: 'gate',
    anchorNodeId: 'mark-1-recap',
    offsetY: -54,
    label: 'Settlement entrance',
    x: 0.78,
    y: 0,
    width: 126,
    height: 112,
  },
  {
    id: 'town-courtyard',
    type: 'landmark',
    variant: 'courtyard',
    anchorNodeId: 'mark-2-recap',
    offsetY: -72,
    label: 'Capernaum courtyard',
    x: 0.2,
    y: 0,
    width: 144,
    height: 116,
  },
  {
    id: 'prominent-olive',
    type: 'landmark',
    variant: 'olive',
    anchorNodeId: 'mark-3-divided',
    offsetY: 10,
    label: 'Olive hillside',
    x: 0.76,
    y: 0,
    width: 170,
    height: 175,
  },
  {
    id: 'lake-boat',
    type: 'landmark',
    variant: 'crossing',
    anchorNodeId: 'mark-4-recap',
    offsetY: -80,
    label: 'Lake crossing',
    x: 0.48,
    y: 0,
    width: 138,
    height: 100,
  },
  {
    id: 'opposite-shore',
    type: 'landmark',
    variant: 'settlement',
    anchorNodeId: 'mark-5-recap',
    offsetY: -68,
    label: 'Settlement ahead',
    x: 0.76,
    y: 0,
    width: 156,
    height: 126,
  },
] as const;
