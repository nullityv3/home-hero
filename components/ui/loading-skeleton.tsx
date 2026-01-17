import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const HeroCardSkeleton: React.FC = () => {
  return (
    <View style={styles.heroCard}>
      <View style={styles.heroHeader}>
        <Skeleton width={50} height={50} borderRadius={25} style={styles.avatar} />
        <View style={styles.heroInfo}>
          <Skeleton width="60%" height={16} style={styles.marginBottom4} />
          <Skeleton width="40%" height={12} style={styles.marginBottom4} />
          <Skeleton width="30%" height={14} style={styles.marginBottom2} />
          <Skeleton width="50%" height={12} />
        </View>
      </View>
      <View style={styles.skillsContainer}>
        <Skeleton width={80} height={24} borderRadius={12} style={styles.marginRight6} />
        <Skeleton width={100} height={24} borderRadius={12} style={styles.marginRight6} />
        <Skeleton width={90} height={24} borderRadius={12} />
      </View>
    </View>
  );
};

export const RequestCardSkeleton: React.FC = () => {
  return (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <Skeleton width="70%" height={18} style={styles.marginBottom8} />
        <Skeleton width={80} height={24} borderRadius={12} />
      </View>
      <Skeleton width="100%" height={14} style={styles.marginBottom4} />
      <Skeleton width="80%" height={14} style={styles.marginBottom12} />
      <View style={styles.requestFooter}>
        <Skeleton width={100} height={14} />
        <Skeleton width={120} height={14} />
      </View>
    </View>
  );
};

export const StatsCardSkeleton: React.FC = () => {
  return (
    <View style={styles.statCard}>
      <Skeleton width={32} height={32} borderRadius={16} style={styles.marginBottom8} />
      <Skeleton width={60} height={28} style={styles.marginBottom4} />
      <Skeleton width={80} height={14} />
    </View>
  );
};

export const ListSkeleton: React.FC<{ count?: number; type?: 'hero' | 'request' | 'stats' }> = ({
  count = 3,
  type = 'hero',
}) => {
  const SkeletonComponent =
    type === 'hero'
      ? HeroCardSkeleton
      : type === 'request'
      ? RequestCardSkeleton
      : StatsCardSkeleton;

  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonComponent key={index} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E1E9EE',
  },
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    marginRight: 12,
  },
  heroInfo: {
    flex: 1,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  marginBottom4: {
    marginBottom: 4,
  },
  marginBottom2: {
    marginBottom: 2,
  },
  marginBottom8: {
    marginBottom: 8,
  },
  marginBottom12: {
    marginBottom: 12,
  },
  marginRight6: {
    marginRight: 6,
  },
});
