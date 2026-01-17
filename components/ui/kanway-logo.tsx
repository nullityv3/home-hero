import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

interface KanwayLogoProps {
  size?: number;
  color?: string;
  testID?: string;
}

export default function KanwayLogo({ 
  size = 120, 
  color = '#FFFFFF',
  testID = 'kanway-logo'
}: KanwayLogoProps) {
  return (
    <View 
      style={[styles.container, { width: size, height: size }]}
      testID={testID}
    >
      <Svg 
        width={size} 
        height={size} 
        viewBox="0 0 120 120"
        accessibilityRole="image"
        accessibilityLabel="Kanway logo - connecting heroes with those who need help"
      >
        {/* Background circle */}
        <Circle
          cx="60"
          cy="60"
          r="55"
          fill="rgba(255, 255, 255, 0.1)"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="2"
        />
        
        {/* Letter K */}
        <G>
          <Path
            d="M25 25 L25 95 L35 95 L35 65 L50 65 L70 95 L82 95 L58 60 L80 25 L68 25 L50 50 L35 50 L35 25 Z"
            fill={color}
          />
        </G>
        
        {/* Location pin */}
        <G>
          <Path
            d="M75 35 C75 30 79 26 84 26 C89 26 93 30 93 35 C93 40 84 50 84 50 S75 40 75 35 Z"
            fill={color}
          />
          <Circle cx="84" cy="35" r="3" fill="#007AFF" />
        </G>
        
        {/* Handshake symbol */}
        <G>
          <Path
            d="M70 75 L75 70 L80 75 L85 70 L90 75 L85 80 L80 75 L75 80 Z"
            fill={color}
            opacity="0.8"
          />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});