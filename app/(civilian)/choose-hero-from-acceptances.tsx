import { StyleSheet, Text, View } from 'react-native';

export default function ChooseHeroFromAcceptancesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Hero</Text>
      <Text style={styles.subtitle}>This screen is not currently in use.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
