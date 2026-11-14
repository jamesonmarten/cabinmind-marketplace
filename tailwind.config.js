/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          900: '#064e3b',
        },
        // remap purple alias to green so existing purple- classes stay on-brand
        purple: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        dark: {
          800: '#0d0d14',
          900: '#0a0a0f',
        },
        // ── Dev Cabin cost calculator palette (isolated from the marketplace theme above) ──
        forest: {
          50:  '#f2f6f1',
          100: '#dfe9db',
          200: '#bcd2b4',
          300: '#93b485',
          400: '#6b9459',
          500: '#4c7538',
          600: '#3a5c2b',
          700: '#2f4823',
          800: '#26391d',
          900: '#1c2b16',
        },
        sand: {
          50:  '#faf7f2',
          100: '#f3ecdf',
          200: '#e6d8c0',
          300: '#d4bd97',
          400: '#bd9c6c',
          500: '#a6824f',
          600: '#8a6a3f',
          700: '#6d5233',
          800: '#4d3a26',
          900: '#33271a',
        },
        ember: {
          50:  '#fff4ed',
          100: '#ffe3d1',
          300: '#ffb27a',
          400: '#fd8f4c',
          500: '#f2711f',
          600: '#d95c14',
          700: '#b34811',
          800: '#8a3812',
          900: '#5e2810',
        },
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
        'gradient-x': 'gradient-x 8s ease infinite',
        'fade-up': 'fade-up 0.6s ease both',
        'spin-slow': 'spin 12s linear infinite',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-20px)' },
        },
        'gradient-x': {
          '0%,100%': { 'background-position': '0% 50%' },
          '50%':     { 'background-position': '100% 50%' },
        },
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backgroundSize: { '300%': '300%' },
    }
  },
  plugins: []
};