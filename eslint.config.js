import js from "@eslint/js"
import tseslint from "typescript-eslint"
import { globalIgnores } from "eslint/config"

export default tseslint.config(
    globalIgnores(["dist", "coverage"]),
    {
        files: ["**/*.ts"],
        extends: [
            js.configs.recommended,
            tseslint.configs.recommended,
        ],
        rules: {
            "@typescript-eslint/no-unused-vars": ["error", { varsIgnorePattern: "^_", argsIgnorePattern: "^_" }],
        },
    },
    {
        files: ["tests/**/*.ts", "scripts/**/*.ts"],
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unsafe-function-type": "off",
        },
    },
)
