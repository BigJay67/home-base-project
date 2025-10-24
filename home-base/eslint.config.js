const standard = require('eslint-config-standard');
const react = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');
const importPlugin = require('eslint-plugin-import');
const n = require('eslint-plugin-n');
const promise = require('eslint-plugin-promise');

module.exports = [
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        browser: true,
        node: true,
        es2021: true,
        window: true,
        document: true,
        fetch: true,
        setTimeout: true,
        clearTimeout: true,
        setInterval: true,
        clearInterval: true,
        FileReader: true,
        URL: true,
        URLSearchParams: true,
        AbortController: true,
        navigator: true,
        alert: true,
        btoa: true,
        process: true,
        console: true // Add console to globals
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true }
      }
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      import: importPlugin,
      n,
      promise
    },
    rules: {
      ...standard.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'no-console': ['warn', { allow: ['warn', 'error'] }], // Warn on console.log
      'react/prop-types': 'off', // Disable prop-types
      'import/order': ['error', { 'newlines-between': 'always' }],
      'n/no-missing-require': 'error',
      'promise/always-return': 'warn',
      'no-return-assign': 'warn',
      'react/no-unescaped-entities': 'warn',
      'no-useless-catch': 'warn',
      'no-unused-vars': 'warn',
      'no-use-before-define': 'warn' // Soften to warning
    },
    settings: {
      react: { version: 'detect' }
    }
  }
];