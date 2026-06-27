module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json'
  },
  plugins: [
    'react',
    'react-hooks',
    'jsx-a11y',
    '@typescript-eslint'
  ],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'error',  // CLAUDE.md: any禁止
    '@typescript-eslint/no-unused-vars': 'warn',
    'no-extra-semi': 'off',
    '@typescript-eslint/no-extra-semi': 'off',
    'no-console': ['warn', { allow: ['error', 'warn'] }],  // console.log禁止、console.error/warnは許可
    'jsx-a11y/no-autofocus': 'warn',  // モーダル内のautoFocusは適切な場合があるためwarnに緩和
    'react-hooks/exhaustive-deps': 'warn',  // 依存配列の最適化は段階的に対応
    'react-hooks/set-state-in-effect': 'warn',  // useEffect内のsetState呼び出しは段階的に対応
    'react-hooks/preserve-manual-memoization': 'warn'  // 手動memoizationの最適化は段階的に対応
  },
  settings: {
    react: {
      version: 'detect'
    }
  }
};
