# Presentation

Three formats of the same deck, fourteen slides.

| File | Use it for |
|---|---|
| `readaloud-deck.html` | Presenting. Open in a browser, press F for fullscreen. |
| `ReadAloud.pptx` | PowerPoint or Keynote, if the venue wants a file. Editable text, entrance animations included. |
| `ReadAloud deck.pdf` | Submission and backup. Every reveal already shown. |

## Presenting from the HTML

Right arrow or space advances one reveal at a time, then moves to the next slide. Left arrow
goes back a whole slide, which is what you want when you overshoot. Press `a` to reveal
everything on the current slide at once if you need to skip ahead. Clicking anywhere also
advances, so a clicker works.

The slide number is bottom left and a progress bar runs along the bottom edge.

Present it from the same browser as the app. Then switching to the live demo is a tab change
rather than an application change, and nothing has to load.

## The shape of the talk

The deck is built around one reversal. Slides seven and eight set up the dialect layer as the
headline feature, and then report that it fires zero times. A room expects a pitch to escalate
its claims, so retracting one is what makes people pay attention.

Rehearse the silence after the zero. Every instinct will say fill it. Do not.

Slide four is the live demo. Turn the wifi off on stage, visibly, then hand the microphone to
someone and ask them to read. Say nothing while they read.

If the microphone fails, `Ctrl` `Shift` `D` in the app runs a bundled recording through the real
pipeline. Same decode, same model, same scorer.

## Rebuilding

The HTML file is the source. After editing it:

```sh
# PDF
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --no-pdf-header-footer --print-to-pdf="slides/ReadAloud deck.pdf" \
  "file://$PWD/slides/readaloud-deck.html"
```

The pptx is generated separately and does not read from the HTML, so it needs editing directly
in PowerPoint or regenerating from the scripts used to build it.
