/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#070a14',
          900: '#0B1120',
          800: '#111C38',
          700: '#1A2952',
        },
        purple: {
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
        },
        primary: "#0B1120",
        accent: "#7C3AED",
      },
    },
  },
  plugins: [],
};
