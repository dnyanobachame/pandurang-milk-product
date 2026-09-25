import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: { 50: '#fffdf8', 100: '#fdf6e9', 200: '#f9ebc9' },
        brand: {
          50: '#f0f9f0', 100: '#dcf0dd', 300: '#8fce93',
          500: '#3f9b45', 600: '#2f7a35', 700: '#245e29',
        },
        gold: { 400: '#e0b84e', 500: '#c9a038' },
        amul: {
          red: '#ED1B24',
          redDark: '#B3131A',
          blue: '#0B3C74',
          blueDark: '#08294F',
          yellow: '#FFD200',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: { xl2: '1.25rem' },
    },
  },
  plugins: [],
};

export default config;
