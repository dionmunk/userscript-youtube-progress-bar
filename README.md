# YouTube Progress Bar

A userscript that keeps a progress bar visible on YouTube videos at all times.

It's essentially a copy of YouTube's own progress bar, with the same width, colors, red‑to‑pink
leading edge, buffered segment, and scrubber dot, floated up slightly from the bottom of
the video. It fades in exactly when YouTube's own controls (and its progress bar) fade out,
and fades away while you're interacting with the player, so the two never overlap.

## Features

- Mirrors YouTube's bar: brand‑red played fill with the pink leading‑edge gradient
- Translucent **buffered‑ahead** segment, updated live (even while paused)
- Round **scrubber dot** at the playhead
- Rounded (pill) ends, matching YouTube
- Shows/hides in sync with YouTube's own controls via the player's `ytp-autohide` state
- Works across SPA navigations and in fullscreen

## Install

1. Install a userscript manager for your browser (e.g. [Violentmonkey](https://violentmonkey.github.io/)
   or [Greasemonkey](https://www.greasespot.net/)).
2. Open the raw script and your manager will offer to install it:

   [`youtube-progress-bar.user.js`](https://raw.githubusercontent.com/dionmunk/userscript-youtube-progress-bar/main/youtube-progress-bar.user.js)

The script declares `@downloadURL`/`@updateURL`, so your manager can keep it up to date
automatically.

## Configuration

Tweak the constants at the top of the script:

| Constant          | Default                    | Purpose                                             |
| ----------------- | -------------------------- | --------------------------------------------------- |
| `alsoInFullscreen`| `true`                     | Keep the bar visible in fullscreen                  |
| `barColor`        | `#f03`                     | Played‑fill / scrubber color (YouTube brand red)    |
| `barLeadColor`    | `#ed4686`                  | Pink the fill fades into at the leading edge        |
| `leadWidth`       | `100px`                    | Width of the leading‑edge fade                      |
| `trackColor`      | `rgba(255,255,255,0.2)`    | Faint unplayed track                                |
| `loadedColor`     | `rgba(255,255,255,0.4)`    | Buffered‑ahead segment                              |
| `barHeight`       | `4px`                      | Bar thickness                                       |
| `dotSize`         | `12px`                     | Scrubber dot diameter                               |
| `sideInset`       | `12px`                     | Horizontal inset each side (matches YouTube's width)|
| `bottomOffset`    | `12px`                     | How far the bar floats up from the bottom           |

## License

MIT
