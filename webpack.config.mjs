import ESLintPlugin from 'eslint-webpack-plugin';
import { fileURLToPath } from 'node:url';
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
    ],
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
};
