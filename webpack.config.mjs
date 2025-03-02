import ESLintPlugin from 'eslint-webpack-plugin';
import {fileURLToPath} from 'node:url';
import path from 'path';

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
            context: __dirname,
            // failOnError: false,
        }),
    ],
    output: {
        filename: 'studio.js',
        path: path.resolve(__dirname, 'railroad.studio'),
    },
};
