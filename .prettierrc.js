module.exports = {
  // 基本設定
  semi: false,
  singleQuote: true,
  trailingComma: 'es5',
  tabWidth: 2,
  useTabs: false,
  printWidth: 100,

  // JSX 相關
  jsxSingleQuote: false,
  jsxBracketSameLine: false,

  // 其他
  arrowParens: 'always',
  endOfLine: 'lf',
  bracketSpacing: true,

  // 檔案覆寫
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 80,
      },
    },
    {
      files: '*.md',
      options: {
        proseWrap: 'always',
        printWidth: 80,
      },
    },
  ],
}
