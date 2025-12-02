import js from "@eslint/js";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";
import stylistic from "@stylistic/eslint-plugin";

export default defineConfig([
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    ignores: [
      "**/node_modules/**",
      "**/lib/**",
      "**/coverage/**",
      "eslint.config.js",
      "docs/**",
    ]
  },
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        project: "./tsconfig.json",
      },
    },
    plugins: {
      js,
      tseslint,
      "@stylistic": stylistic,
    },
    rules: {
      // Stylistic rules
      "@stylistic/semi"         : ["error", "always"],
      "@stylistic/quotes"       : ["error", "double"],
      "@stylistic/comma-dangle" : ["error", "always-multiline"],
      "@stylistic/comma-style"  : ["error", "last"],
      // Spaces
      "@stylistic/no-trailing-spaces": ["error", {
        "skipBlankLines": true,
      }],
      "@stylistic/comma-spacing": ["error", {
        "before": false, "after": true, 
      }],
      "@stylistic/object-curly-spacing" : ["error", "always"],
      "@stylistic/array-bracket-spacing": ["error", "never"],
      "@stylistic/arrow-spacing"        : ["error", {
        "before": true, "after": true, 
      }],
      "@stylistic/space-before-function-paren": ["error", "always"],
      "@stylistic/space-in-parens"            : ["error", "never"],
      "@stylistic/space-infix-ops"            : ["error", {
        "int32Hint": false, 
      }],
      "@stylistic/space-unary-ops": ["error", {
        "words": true, "nonwords": false, 
      }],
      "@stylistic/key-spacing": ["error", {
        align: "colon", 
      }],
      "@/switch-colon-spacing": ["error", {
        "after" : true,
        "before": false, 
      }],
      // "sort-imports"                : "error", // TODO: Investigate further.
      // Doesn't seem to understand TS byt the typescript version of the rule works well.
      // "no-unused-vars"                 : "warn",
      "@stylistic/wrap-regex"          : "error",
      "@stylistic/indent"              : ["error", 2],
      // Newlines around braces
      "@/brace-style"                  : ["error", "1tbs"],
      // See https://eslint.style/rules/js/object-curly-newline
      "@stylistic/object-curly-newline": ["error", {
        "ObjectExpression": {
          "minProperties": 3,
          "consistent"   : true,
        },
        "ObjectPattern": {
          "minProperties": 3,
          "consistent"   : true,
        },
        "ImportDeclaration": {
          "minProperties": 5,
        },
        "ExportDeclaration": {
          "minProperties": 2,
        },
      }],
      // "@stylistic/object-property-newline" doesn't support a minProperties option yet.
      // Otherwise we'd use it.
      "@/max-statements-per-line": ["error", {
        "max": 1, 
      }],
      "@/multiline-ternary"      : ["error", "never"],
      "@stylistic/eol-last"      : ["error", "always"],
      "@/no-debugger"            : "error",
      "@typescript-eslint/no-unused-expressions": "off",
    },
  },
]);
