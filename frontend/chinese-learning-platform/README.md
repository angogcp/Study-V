# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```

## Setting Up DeepSeek API Key

To use the chatbot functionality in this application, you need a DeepSeek API key. Here's how to obtain and set it up:\n\n### Obtaining a DeepSeek API Key\n1. Visit the [DeepSeek website](https://www.deepseek.com/) and sign up for an account if you don't have one.\n2. Navigate to the API section in your dashboard.\n3. Generate a new API key. Make sure to copy it securely, as it won't be shown again.\n\n**Note:** Keep your API key private and do not commit it to version control or share it publicly, as it could lead to unauthorized usage and costs.\n\n### Setting Up the API Key in the App\n1. Run the application locally using `npm run dev` or access the deployed version.\n2. Navigate to the Chatbot page or any component that uses the chatbot (e.g., Video Player with chat).\n3. If the API key is not set, a prompt will appear asking you to enter your DeepSeek API key.\n4. Enter the key and submit. It will be stored securely in your browser's localStorage.\n5. The chatbot should now function properly, making direct calls to the DeepSeek API.\n\nIf you need to update or remove the key, you can do so via the browser's developer tools or by clearing localStorage, but you'll be prompted again on next use.\n\nFor any issues, check the browser console for error messages related to API calls.
