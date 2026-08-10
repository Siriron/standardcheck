/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F5F2EA',
        ink: '#141B22',
        beacon: '#2F7A5C',
        rust: '#B5502E',
        fog: '#8A8577',
        'paper-dim': '#EBE6D8',
        'ink-soft': '#3A4650',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
