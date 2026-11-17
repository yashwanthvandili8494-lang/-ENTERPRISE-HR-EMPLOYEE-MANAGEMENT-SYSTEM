/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        navy: {
          50: '#eff6ff',
          100: '#dbeafe',
          600: '#1d4ed8',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#0f172a',
          950: '#090e1a',
        },
      },
    },
  },
  plugins: [],
};
