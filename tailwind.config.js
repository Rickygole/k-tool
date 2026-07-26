/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Carried over from the sibling `myvoice` project for visual continuity.
        mist: '#F1F4F1',
        ink: '#22303A',
        harbor: '#3D6B66',
        marigold: '#E3A857',
        sage: '#7FA07A',

        // Scoring semantics. These are the only three colors that carry meaning, so they are
        // named for the meaning and not the hue -- and every use is paired with a text label,
        // because ~8% of men have a red/green deficiency and this is an equity tool.
        correct: { DEFAULT: '#2F7D4F', bg: '#E6F2EA' },
        miscue: { DEFAULT: '#B3261E', bg: '#FBE9E8' },
        // Amber = "we are not confident enough to call this an error, so we don't."
        // It is the visible form of the product's epistemic humility.
        unsure: { DEFAULT: '#8A5A00', bg: '#FDF1DC' },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        // The passage itself. Serif at a generous size is the convention in reading
        // assessment materials and it is genuinely easier to track along a line.
        passage: ['Literata', 'Georgia', 'Cambria', 'serif'],
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0, transform: 'translateY(4px)' }, '100%': { opacity: 1, transform: 'none' } },
      },
      animation: { fadeIn: 'fadeIn 200ms ease-out' },
    },
  },
  plugins: [],
}
