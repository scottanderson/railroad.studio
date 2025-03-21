import globals from 'globals';
import js from '@eslint/js';
import stylisticTs from '@stylistic/eslint-plugin-ts';
import tsParser from '@typescript-eslint/parser';
import typescriptEslint from '@typescript-eslint/eslint-plugin';

const mjsConfig = {
    files: ['*.config.mjs'],
    languageOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    rules: {
        'eqeqeq': 'error',
        'indent': 'error',
        'sort-imports': 'error',
        'sort-keys': ['error', 'asc', { caseSensitive: false, minKeys: 2, natural: false }],
        'space-infix-ops': ['error', { int32Hint: false }],
    },
};

const tsConfig = {
    files: ['ts/**/*.ts'],
    languageOptions: {
        ecmaVersion: 'latest',
        globals: globals.browser,
        parser: tsParser,
        parserOptions: {
            project: 'tsconfig.json',
        },
        sourceType: 'script',
    },
    plugins: {
        '@stylistic/ts': stylisticTs,
        '@typescript-eslint': typescriptEslint,
    },
    rules: {
        '@stylistic/ts/indent': 'error',
        '@stylistic/ts/semi': 'error',
        '@stylistic/ts/space-infix-ops': ['error', { int32Hint: false }],
        '@stylistic/ts/type-annotation-spacing': [
            'error',
            {
                after: true,
                before: true,
                overrides: {
                    colon: {
                        before: false,
                    },
                },
            },
        ],
        '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
        '@typescript-eslint/no-duplicate-enum-values': 'error',
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-inferrable-types': 'error',
        '@typescript-eslint/no-mixed-enums': 'error',
        '@typescript-eslint/no-require-imports': 'error',
        '@typescript-eslint/no-type-alias': [
            'error',
            {
                allowAliases: 'always',
                allowCallbacks: 'always',
                allowConditionalTypes: 'never',
                allowConstructors: 'never',
                allowGenerics: 'always',
                allowLiterals: 'always',
                allowMappedTypes: 'never',
                allowTupleTypes: 'always',
            },
        ],
        '@typescript-eslint/no-unnecessary-type-assertion': 'error',
        '@typescript-eslint/no-unsafe-argument': 'error',
        '@typescript-eslint/no-unsafe-assignment': 'error',
        '@typescript-eslint/no-unsafe-member-access': 'error',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/prefer-as-const': 'error',
        '@typescript-eslint/prefer-for-of': 'error',
        '@typescript-eslint/prefer-function-type': 'error',
        '@typescript-eslint/prefer-includes': 'error',
        '@typescript-eslint/prefer-literal-enum-member': 'error',
        '@typescript-eslint/prefer-nullish-coalescing': 'error',
        'eqeqeq': 'error',
        'indent': 'off', // @stylistic/ts/indent
        'max-depth': ['error', { max: 5 }],
        'max-len': ['error', { code: 120 }],
        'max-lines': ['error', { max: 2000, skipBlankLines: true, skipComments: true }],
        'max-lines-per-function': ['error', { max: 508 }],
        'no-constant-condition': 'off',
        'no-loss-of-precision': 'error',
        'no-undef': 'error',
        'no-unused-vars': 'off', // @typescript-eslint/no-unused-vars
        'sort-imports': 'error',
        'sort-keys': ['error', 'asc', { caseSensitive: false, minKeys: 2, natural: false }],
        'space-infix-ops': 'off',
    },
};

export default [js.configs.recommended, mjsConfig, tsConfig];
