/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#013D28', // Dark Green from logo
          secondary: '#F9A03F', // Orange from logo
          accent: '#FF7043', // Lighter Orange for highlights
          background: '#FBF5EB', // Beige background from logo
          surface: '#FFFFFF', // For cards and panels
          'text-base': '#333333',
          'text-muted': '#666666',
        },
      }
    },
  },
  plugins: [],
};
