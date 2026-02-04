import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default [
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["**/*.{ts,tsx}"],
        plugins: {
            react: reactPlugin,
            "react-hooks": reactHooksPlugin,
        },
        languageOptions: {
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        settings: {
            react: {
                version: "detect",
            },
        },
        rules: {
            // React rules
            "react/react-in-jsx-scope": "off",
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",
            "react/function-component-definition": ["warn", {
                namedComponents: "function-declaration",
            }],
            
            // TypeScript rules
            "@typescript-eslint/no-unused-vars": ["warn", {
                argsIgnorePattern: "^_",
                varsIgnorePattern: "^_"
            }],
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/explicit-function-return-type": "off",
            
            // Code quality rules
            "max-lines": ["warn", {
                max: 250,
                skipBlankLines: true,
                skipComments: true
            }],
            "max-lines-per-function": ["warn", {
                max: 80,
                skipBlankLines: true,
                skipComments: true
            }],
            "complexity": ["warn", 15],
            "no-console": ["warn", { allow: ["warn", "error", "info"] }],
            
            // Best practices
            "prefer-const": "error",
            "no-var": "error",
            "eqeqeq": ["error", "always"],
            "curly": ["error", "all"],
        },
    },
    {
        ignores: [".next/**", "node_modules/**", "dist/**", "coverage/**"],
    },
];
