# Video

Two minute film, built with Remotion, narrated with ElevenLabs.

The rendered file is not committed here because it is 42MB. It lives on the Desktop as
`ReadAloud.mp4` and can be rebuilt from this source.

```sh
npm install
npm run studio    # scrubbable preview
npm run render    # writes out/readaloud.mp4
```

Narration audio is already generated and committed under `public/audio`, sixteen files, one per
line of `script.json`. Regenerating it needs an ElevenLabs key in a local `.env`, which is
gitignored and deliberately not included.

`src/theme.js` holds the palette and the timeline. The timeline is derived from the measured
length of each audio file plus a pause, so if you change the narration you change the durations
there and everything reflows.
