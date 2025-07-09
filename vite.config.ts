import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dôležité: názov repa v base!
export default defineConfig({
  base: '/consign-app/', // <-- presne podľa názvu tvojho repa!
  plugins: [react()],
});
