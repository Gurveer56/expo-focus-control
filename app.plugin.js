// This file is the entry point for the Expo config plugin.
// It delegates to the compiled TypeScript plugin.
let plugin;
try {
  plugin = require('./plugin/build');
} catch {
  // If the plugin hasn't been built yet, provide a no-op
  // This happens during initial npm install before the prepare script runs
  plugin = { default: (config) => config };
}
module.exports = plugin.default || plugin;
