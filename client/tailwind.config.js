/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta base de tonos oscuros ultra-premium
        noir: {
          950: '#070809',
          900: '#0e1013',
          850: '#13161b',
          800: '#191d24',
          700: '#232934',
          600: '#323a4a',
        },
        // Tonos industriales de metal y piedra
        industrial: {
          900: '#1b1d22',
          800: '#262930',
          700: '#353a44',
          600: '#484f5c',
          500: '#646d7e',
          400: '#949dae',
        },
        // Acentos de oro vintage, cobre y ámbar de barbería tradicional
        gold: {
          100: '#fdf7e7',
          200: '#faecc4',
          300: '#f5dc96',
          400: '#ecc45e',
          500: '#e5ab27', // Acento primario
          600: '#cb8b1b',
          700: '#a36616',
          800: '#844f19',
          900: '#6f4118',
        },
        barber: {
          red: '#dc2626',
          blue: '#2563eb',
          white: '#f8fafc'
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Cinzel"', 'serif']
      },
      boxShadow: {
        'glow-gold': '0 0 20px -3px rgba(229, 171, 39, 0.25)',
        'glow-subtle': '0 4px 25px -2px rgba(0, 0, 0, 0.7)',
        'inner-light': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInFast: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        fadeInFast: 'fadeInFast 0.15s ease-out forwards',
      }
    },
  },
  plugins: [],
}

