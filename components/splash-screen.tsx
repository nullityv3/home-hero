import { LinearGradient } from 'expo-linear-gradient';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import KanwayLogo from './ui/kanway-logo';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  return (
    <LinearGradient
      colors={['#007AFF', '#4A90E2']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <View style={styles.content}>
        {/* Kanway Logo */}
        <View style={styles.logoContainer}>
          <KanwayLogo 
            size={Math.min(width * 0.35, 140)} 
            color="#FFFFFF" 
          />
        </View>
        
        {/* App Name */}
        <Text style={styles.appName}>Kanway</Text>
        
        {/* Tagline */}
        <Text style={styles.tagline}>Connecting skills with opportunity</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  appName: {
    fontSize: Math.min(width * 0.12, 48),
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 2,
    fontFamily: 'System',
  },
  tagline: {
    fontSize: Math.min(width * 0.045, 18),
    fontWeight: '400',
    color: '#E6F4FE',
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 24,
    letterSpacing: 0.5,
    fontFamily: 'System',
  },
});