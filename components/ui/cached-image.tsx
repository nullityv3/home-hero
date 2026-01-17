import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Image, ImageProps, ImageStyle, StyleSheet, View } from 'react-native';

interface CachedImageProps extends Omit<ImageProps, 'source'> {
  uri?: string;
  style?: ImageStyle;
  placeholderIcon?: keyof typeof Ionicons.glyphMap;
  placeholderSize?: number;
  showLoadingIndicator?: boolean;
}

export const CachedImage: React.FC<CachedImageProps> = ({
  uri,
  style,
  placeholderIcon = 'person',
  placeholderSize = 24,
  showLoadingIndicator = true,
  ...props
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoadStart = () => {
    setLoading(true);
    setError(false);
  };

  const handleLoadEnd = () => {
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  // Show placeholder if no URI or error occurred
  if (!uri || error) {
    return (
      <View style={[styles.placeholder, style]}>
        <Ionicons name={placeholderIcon} size={placeholderSize} color="#8E8E93" />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Image
        {...props}
        source={{ uri, cache: 'force-cache' }}
        style={[styles.image, style]}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
      />
      {loading && showLoadingIndicator && (
        <View style={[styles.loadingOverlay, style]}>
          <ActivityIndicator size="small" color="#007AFF" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(242, 242, 247, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
