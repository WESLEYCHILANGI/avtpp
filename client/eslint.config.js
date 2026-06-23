import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // This SPA loads data on mount via effects (no external data-fetching
      // library is in scope for the project). The react-hooks v7
      // `set-state-in-effect` rule flags that conventional pattern, so it is
      // disabled here while all other react-hooks rules remain enforced.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
