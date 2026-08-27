import type { ImageSourcePropType } from 'react-native';

const chestImages: ImageSourcePropType[] = [
  require('../../assets/chests/chest-wood.png'),
  require('../../assets/chests/chest-bronze.png'),
  require('../../assets/chests/chest-scroll.png'),
  require('../../assets/chests/chest-royal.png'),
  require('../../assets/chests/chest-glory.png'),
];

export const chestImageForTier = (tier: number): ImageSourcePropType =>
  chestImages[Math.max(1, Math.min(5, Math.floor(tier))) - 1]!;
