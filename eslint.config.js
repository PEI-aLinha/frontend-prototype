import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// Plugin isolation: features/assets and features/assessment only communicate
// through src/api/contracts and each feature's public.ts file.
const isolation = (other) => ({
  'no-restricted-imports': ['error', {
    patterns: [{
      regex: `features/${other}/(?!public$)`,
      message: `Importa só de features/${other}/public (isolamento entre plugins).`,
    }, {
      regex: 'api/mock',
      message: 'Os componentes nunca leem o mock diretamente: usa src/api/queries.',
    }],
  }],
})

export default defineConfig([
  globalIgnores(['dist', 'test-results', 'playwright-report']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  { files: ['src/features/assets/**'], rules: isolation('assessment') },
  { files: ['src/features/assessment/**'], rules: isolation('assets') },
  { files: ['src/features/organization/**'], rules: isolation('(assets|assessment)') },
  { files: ['src/ui/**', 'src/features/home/**', 'src/features/tasks/**', 'src/features/portfolio/**'], rules: isolation('__none__') },
])
