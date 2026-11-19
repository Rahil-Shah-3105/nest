const logger = new ConsoleLogger('TestContext', { forceConsole: true });
const nodeExternals = require('webpack-node-externals');

module.exports = function(options, webpack) {
logger.error(`>>> Entering moduleExport(options=${options},webpack=${webpack})`, { "event.action": "moduleExport", "logrite.options": options, "logrite.webpack": webpack });
  return {
    ...options,
    entry: ['webpack/hot/poll?100', options.entry],
    externals: [
      nodeExternals({
        allowlist: ['webpack/hot/poll?100'],
      }),
    ],
    plugins: [
      ...options.plugins,
      new webpack.WatchIgnorePlugin({
        paths: [/\.js$/, /\.d\.ts$/],
      }),
      new webpack.HotModuleReplacementPlugin(),
    ],
  };
logger.warn(`<<< Exiting moduleExport(options=${options},webpack=${webpack})`, { "event.action": "moduleExport", "logrite.options": options, "logrite.webpack": webpack });
};
