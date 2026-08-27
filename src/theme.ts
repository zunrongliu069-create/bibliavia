import { Platform, type ViewStyle } from 'react-native';

export const colors = {
  ink: '#241A3F',
  inkSoft: '#3B3056',
  paper: '#F1E5CD',
  card: '#FFF9EC',
  primary: '#7442C8',
  primarySoft: '#E9DEFF',
  mint: '#35AE8B',
  mintSoft: '#D8F1E7',
  coral: '#E56658',
  gold: '#C8932F',
  muted: '#756B83',
  line: '#CBAA68',
  white: '#FFFFFF',
};

export const radius = { sm: 12, md: 18, lg: 28, pill: 999 };
export const shadow: ViewStyle = Platform.select({
  web: { boxShadow: '0 8px 16px rgba(36, 26, 63, 0.16)' },
  default: {
    shadowColor: '#17162F',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
}) as ViewStyle;
