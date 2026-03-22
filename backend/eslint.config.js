import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        project: path.join(__dirname, "tsconfig.eslint.json"),
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: ["interface", "typeAlias"],
          format: ["PascalCase"],
          custom: {
            regex: "^I[A-Z]",
            match: false,
          },
        },
      ],
    },
  },
  eslintConfigPrettier
);
