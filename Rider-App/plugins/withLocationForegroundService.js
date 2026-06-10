const { withAndroidManifest } = require("@expo/config-plugins");

const withLocationForegroundService = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    
    if (manifest.manifest && manifest.manifest.application) {
      const app = manifest.manifest.application[0];
      
      const hasLocationService = app.service?.some(
        (s) => s.$ && s.$["android:name"]?.includes("LocationTaskService")
      );
      
      if (!hasLocationService) {
        app.service = [
          {
            $: {
              "android:name": "expo.modules.location.services.LocationTaskService",
              "android:exported": "false",
              "android:foregroundServiceType": "location"
            }
          }
        ];
      }
    }
    
    return config;
  });
};

module.exports = withLocationForegroundService;