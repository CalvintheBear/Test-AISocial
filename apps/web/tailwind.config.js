/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './styles/**/*.css',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          500: 'var(--color-primary-500)',
          700: 'var(--color-primary-700)'
        },
        surface: 'var(--color-surface)',
        line: 'var(--color-line)'
      },
      borderRadius: { md: 'var(--radius-md)' },
      boxShadow: { md: 'var(--shadow-md)' }
    }
  },
  plugins: []
}


