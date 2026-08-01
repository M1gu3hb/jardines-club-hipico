import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginUnusedImports from "eslint-plugin-unused-imports";

export default [
  {
    files: [
      "src/components/**/*.{js,mjs,cjs,jsx}",
      "src/pages/**/*.{js,mjs,cjs,jsx}",
      "src/Layout.jsx",
    ],
    ignores: ["src/lib/**/*", "src/components/ui/**/*"],
    ...pluginJs.configs.recommended,
    ...pluginReact.configs.flat.recommended,
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
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
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "unused-imports": pluginUnusedImports,
    },
    rules: {
      // Atrapa identificadores inexistentes (el caso real: se borró la
      // definición de `nuevoToken` y sus dos llamadas siguieron ahí, así que
      // generar invitaciones lanzaba ReferenceError en tiempo de ejecución).
      // Antes esta regla NO estaba activa: este bloque `rules` sobrescribe por
      // completo el `rules` que trae pluginJs.configs.recommended al hacer spread.
      "no-undef": "error",
      "no-unused-vars": "off",
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "error",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react/no-unknown-property": [
        "error",
        { ignore: ["cmdk-input-wrapper", "toast-close"] },
      ],
      "react-hooks/rules-of-hooks": "error",
    },
  },

  // Capa de datos del navegador y funciones serverless de Vercel: no llevan JSX,
  // pero sí son código de seguridad, así que también se revisan por identificadores
  // inexistentes. Sin este bloque, `api/**` quedaba fuera del lint por completo.
  {
    files: ["src/api/**/*.{js,mjs,jsx}"],
    ...pluginJs.configs.recommended,
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": "off",
    },
  },
  {
    files: ["api/**/*.{js,mjs}"],
    ...pluginJs.configs.recommended,
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
      parserOptions: { ecmaVersion: 2022, sourceType: "module" },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": "off",
    },
  },
];
