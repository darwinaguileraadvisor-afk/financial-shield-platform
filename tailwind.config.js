/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: 'rgb(var(--color-navy) / <alpha-value>)',
          mid: 'rgb(var(--color-navy-mid) / <alpha-value>)',
          light: 'rgb(var(--color-navy-light) / <alpha-value>)',
        },
        gold: {
          DEFAULT: 'rgb(var(--color-gold) / <alpha-value>)',
          light: 'rgb(var(--color-gold-light) / <alpha-value>)',
        },
        cream: 'rgb(var(--color-cream) / <alpha-value>)',
        dim: 'rgb(var(--color-dim) / <alpha-value>)',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['"DM Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
