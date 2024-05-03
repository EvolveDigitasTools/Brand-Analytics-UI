/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'brand-navy': '#141b21',
        'brand-teal': '#75bfb0',
        'brand-teal-alt': '#42a9a8',
        'brand-highlight': '#f1b84c',
        'yellow-test': '#f1b84c',
        'white-shade': '#fafafa',

        // Consider these if you want a more traditional light/dark approach:
        background: {
          light: '#a0d4c6',
          dark: '#141b21',
        },
        text: {
          light: '#333333',
          dark: '#EDEDED'
        },
        navbar: {
          dark: '#19242d',
          light: '#EDEDED'
        }
      }
    }
  },
  plugins: []
}
