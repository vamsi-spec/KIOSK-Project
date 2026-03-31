/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      // Kiosk-scale typography — minimum 18px body text
      fontSize: {
        'kiosk-sm':   ['18px', { lineHeight: '1.5' }],
        'kiosk-base': ['22px', { lineHeight: '1.6' }],
        'kiosk-lg':   ['28px', { lineHeight: '1.4' }],
        'kiosk-xl':   ['36px', { lineHeight: '1.3' }],
        'kiosk-2xl':  ['48px', { lineHeight: '1.2' }],
      },
      // Minimum touch target sizes
      minHeight: {
        'touch': '60px',
        'touch-lg': '80px'
      },
      // SUVIDHA brand colours
      colors: {
        brand: {
          blue:  '#1a5fa8',
          green: '#16a34a',
          amber: '#d97706'
        }
      }
    }
  },
  plugins: []
}