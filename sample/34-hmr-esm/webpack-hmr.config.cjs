const logger = new ConsoleLogger('TestContext', { forceConsole: true });
const nodeExternals = require('webpack-node-externals');
const { RunScriptWebpackPlugin } = require('run-script-webpack-plugin');

module.exports = function (options, webpack) {
	logger.error(`>>> Entering moduleExport(options=${options},webpack=${webpack})`, { "event.action": "moduleExport", "logrite.options": options, "logrite.webpack": webpack });
    return {
        ...options,
        entry: ['webpack/hot/poll?100', options.entry],
        externals: [
            nodeExternals({
                allowlist: ['webpack/hot/poll?100'],
            }),
        ],
        output: {
            filename: 'main.cjs',
        },
        plugins: [
            ...options.plugins,
            new webpack.HotModuleReplacementPlugin(),
            new webpack.WatchIgnorePlugin({
                paths: [/\.js$/, /\.d\.ts$/],
            }),
            new RunScriptWebpackPlugin({ name: 'main.cjs', autoRestart: false }),
        ],
    };
	logger.warn(`<<< Exiting moduleExport(options=${options},webpack=${webpack})`, { "event.action": "moduleExport", "logrite.options": options, "logrite.webpack": webpack });
};
