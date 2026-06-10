export default {
  name: "Rider-App",
  slug: "Rider-App",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/adaptiveLogo2.png",
  userInterfaceStyle: "dark",
  newArchEnabled: true,
  
  // Fixed: Scheme must be a single string, not an array
  scheme: "beba", 

  splash: {
    image: "./assets/notification-icon.png",
    resizeMode: "contain",
    backgroundColor: "#115e59"
  },

  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.beba.rider",
    infoPlist: {
      NSCameraUsageDescription: "Camera access required for delivery signature capture",
      NSLocationAlwaysAndWhenInUseUsageDescription: "Location required for real-time fleet tracking and route optimization",
      NSLocationAlwaysUsageDescription: "Background location for continuous fleet telemetry",
      NSLocationWhenInUseUsageDescription: "Location needed to navigate delivery addresses",
      NSUserInterfaceStyle: "automatic",
      UIBackgroundModes: ["location", "fetch"]
    }
  },

  android: {
    package: "com.beba.rider",
    edgeToEdgeEnabled: true,
    permissions: [
      "NOTIFICATIONS",
      "POST_NOTIFICATIONS", // Fixed: Critical for Android 13+ permission popups
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
      "ACCESS_BACKGROUND_LOCATION",
      "FOREGROUND_SERVICE",
      "FOREGROUND_SERVICE_LOCATION"
    ]
  },

  plugins: [
    "./plugins/withLocationForegroundService",
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission: "Location required for real-time fleet tracking and route optimization",
        isAndroidForegroundServiceEnabled: true,
        isAndroidBackgroundLocationEnabled: true
      }
    ],
    [
      "expo-notifications",
      {
        icon: "./assets/notification-icon.png",
        color: "#115e59",
        // Keep your original array mapping file path here;
        // Just make sure your service file references 'cash_register' or 'cash_register.mp3' correctly.
        sounds: ["./assets/magiaz_cash_register_444842.mp3"] 
      }
    ]
  ],

  extra: {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    eas: {
      projectId: "cae0c3f7-6cb6-4b8c-9bec-820dcb54bb5c"
    }
  }
};