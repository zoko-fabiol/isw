/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        violet: {
          950: '#2e1065',
        },
        isw: {
          navy:    '#1B3A5C',  // Primary - bleu marine foncé
          blue:    '#2E8BC0',  // Secondary - bleu moyen  
          teal:    '#5BB8C9',  // Accent clair
          gold:    '#E8A817',  // Accent doré
          'navy-dark':  '#152E4A',
          'navy-light': '#2A5580',
          'blue-light': '#4BA3D4',
          'blue-50':    '#EBF5FB',
          'blue-100':   '#D6EBF7',
          'teal-50':    '#EDF8FA',
          'teal-100':   '#D5EFF4',
          'gold-50':    '#FEF9E7',
          'gold-100':   '#FCF0C8',
        },
      },
      borderRadius: {
        '2xl':  '1rem',
        '3xl':  '1.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: 0 },
          '100%': { opacity: 1 },
        },
        slideUp: {
          '0%':   { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
