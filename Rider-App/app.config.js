module.exports = ({ config }) => ({
  ...config,
  plugins: [
    "./plugins/withLocationForegroundService",
    "@react-native-community/datetimepicker",
    ...(config.plugins || []).map((plugin) => {
      if (Array.isArray(plugin) && plugin[0] === "expo-location") {
        return [
          plugin[0],
          {
            ...plugin[1],
            isAndroidForegroundServiceEnabled: true,
          },
        ];
      }

      return plugin;
    }),
  ],
  extra: {
    ...config.extra,
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
});
