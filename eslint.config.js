import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // 只启用经典的 Hooks 规则；react-hooks v7 默认还带 compiler 风格的
      // set-state-in-effect / refs / immutability 等，对本项目现有写法过于激进。
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // API 层暂时用 any 作为占位类型，补全 DTO 类型后再收紧该规则。
      '@typescript-eslint/no-explicit-any': 'off',
      // 文件名清洗正则中的 \x00-\x1f（控制字符）是刻意为之，关闭该误报。
      'no-control-regex': 'off',
      // shadcn 风格会导出 buttonVariants/badgeVariants、ConfirmDialog 会导出
      // useConfirm，与「文件只导出组件」的 HMR 提示冲突，关闭该提示。
      'react-refresh/only-export-components': 'off',
    },
  },
)
