import { SymbolView, SymbolViewProps } from 'expo-symbols';
import { StyleProp, ViewStyle } from 'react-native';

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  ...rest
}: {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
} & SymbolViewProps) {
  return (
    <SymbolView
      weight="regular"
      tintColor={color}
      resizeMode="scaleAspectFit"
      name={name}
      style={[
        {
          width: size,
          height: size,
        },
        style,
      ]}
      {...rest}
    />
  );
}