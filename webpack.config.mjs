import ESLintPlugin from 'eslint-webpack-plugin';
import { execSync } from 'child_process';
import { fileURLToPath } from 'node:url';
import path from 'path';
import webpack from 'webpack';

const buildDate = new Date().toString().trim();
const fullHash = execSync('git rev-parse HEAD').toString().trim();
const shortHash = execSync('git rev-parse --short HEAD').toString().trim();
const version = execSync('git rev-list HEAD --count').toString().trim();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    devServer: {
        static: path.resolve(__dirname, 'railroad.studio'),
    },
    entry: './ts/index.ts',
    module: {
        rules: [
            {
                exclude: /node_modules/,
                test: /\.tsx?$/,
                use: 'ts-loader',
            },
        ],
    },
    output: {
        filename: 'studio.js',
        path: path.resolve(__dirname, 'railroad.studio'),
    },
    plugins: [
        new ESLintPlugin({
            context: __dirname,
            // failOnError: false,
        }),
        new webpack.DefinePlugin({
            BUILD_DATE: JSON.stringify(buildDate),
            FULL_HASH: JSON.stringify(fullHash),
            SHORT_HASH: JSON.stringify(shortHash),
            VERSION: JSON.stringify(version),
        }),
    ],
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
};
