import { execSync } from 'child_process';
import ESLintPlugin from 'eslint-webpack-plugin';
import { fileURLToPath } from 'node:url';
import path from 'path';
import webpack from 'webpack';

const buildDate = new Date().toString().trim();

const commitCount = execSync('git rev-list --count HEAD').toString().trim();
const gitHash = execSync('git rev-parse --short HEAD').toString().trim();
const version = `${commitCount}-${gitHash}`;

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
            VERSION: JSON.stringify(version),
        }),
    ],
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
};
