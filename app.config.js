// Expo app configuration with hardcoded Supabase credentials
// This ensures credentials are ALWAYS available via Constants.expoConfig.extra
// No reliance on .env file loading at runtime

module.exports = {
  expo: {
    name: "home",
    slug: "home",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "home",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000"
          }
        }
      ]
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    },
    // Hardcoded credentials - bulletproof, no .env dependency
    extra: {
      supabaseUrl: "https://htdaqadkqolmpvvbbmez.supabase.co",
      supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZGFxYWRrcW9sbXB2dmJibWV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4OTU2NzYsImV4cCI6MjA4MDQ3MTY3Nn0.XKRtpnAuzPekjBuiUILDcMLQ49JoiBaNUYSXTAY7EBY"
    }
  }
};
