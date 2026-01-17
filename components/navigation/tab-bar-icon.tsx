import { Ionicons } from '@expo/vector-icons';

export function TabBarIcon({ name, color }: { name: keyof typeof Ionicons.glyphMap; color: string }) {
  return <Ionicons size={24} name={name} color={color} />;
}