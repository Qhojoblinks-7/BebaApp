const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure react-native-svg resolves correctly
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];

// Ensure proper resolution of CJS modules
config.resolver.unstable_conditionNames = ['require', 'default', 'expo'];

module.exports = config;