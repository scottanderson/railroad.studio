const path = require('path');
const ESLintPlugin = require('eslint-webpack-plugin');

module.exports = {
    entry: './ts/index.ts',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    plugins: [
        new ESLintPlugin({
            context: 'ts/*.ts',
            // failOnError: false,
        }),
    ],
    output: {
        filename: 'studio.js',
        path: path.resolve(__dirname, 'railroad.studio'),
    },
};
