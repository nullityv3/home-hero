import { useColorScheme } from '@/hooks/use-color-scheme';
import { queryClient } from '@/services/react-query';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from "react-native";
import { ErrorBoundary } from "../components/error-boundary";
import { OfflineIndicator } from "../components/ui/offline-indicator";

export default function Layout() {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <ErrorBoundary>
          <View style={styles.container}>
            <OfflineIndicator />
            <Stack screenOptions={{ headerShown: false }} />
          </View>
          <StatusBar style="auto" />
        </ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
