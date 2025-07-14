const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');

config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');
config.resolver.sourceExts.push('svg');
config.resolver.sourceExts.push('cjs'); // optional, but sometimes needed

config.resolver.unstable_enablePackageExports = false;

module.exports = config;
