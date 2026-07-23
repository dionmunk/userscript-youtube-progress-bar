// ==UserScript==
// @name         YouTube Progress Bar
// @namespace    https://github.com/dionmunk
// @version      1.9
// @description  A copy of YouTube's progress bar (buffered + scrubber dot + chapter segments), floated up from the bottom, that fades in whenever YouTube's own controls fade out.
// @author       Dion Munk
// @match        https://www.youtube.com/*
// @grant        none
// @noframes
// @homepageURL  https://github.com/dionmunk/userscript-youtube-progress-bar
// @supportURL   https://github.com/dionmunk/userscript-youtube-progress-bar/issues
// @downloadURL  https://raw.githubusercontent.com/dionmunk/userscript-youtube-progress-bar/main/youtube-progress-bar.user.js
// @updateURL    https://raw.githubusercontent.com/dionmunk/userscript-youtube-progress-bar/main/youtube-progress-bar.user.js
// ==/UserScript==

const alsoInFullscreen = true;
const barColor = '#f03'; // YouTube's brand red (--yt-sys-color-baseline--static-brand-red)
const barLeadColor = '#ed4686'; // pink the fill fades into at the leading edge, like YouTube
const leadWidth = '100px'; // width of the leading-edge fade, nearest the playhead
const trackColor = 'rgba(255, 255, 255, 0.2)'; // faint unplayed track, matching YouTube
const loadedColor = 'rgba(255, 255, 255, 0.4)'; // buffered-ahead portion, matching YouTube
const barHeight = '4px';
const dotSize = '12px'; // scrubber "dot" diameter, matching YouTube's
const sideInset = '12px'; // horizontal inset on each side, matching YouTube's bar width
const bottomOffset = '12px'; // float the bar up from the bottom of the video
const showChapters = true; // split the bar into chapter segments (when the video has chapters)
const chapterGap = 4; // px gap punched into the bar at each chapter boundary, like YouTube

(function () {
    'use strict';

    // --- build the progress bar (created once, reused across navigations) ---
    // Essentially a copy of YouTube's own progress bar (same width/insets, rounded
    // ends, red-to-pink fill, round scrubber dot), floated up from the bottom:
    //   bar   = unclipped wrapper (so the dot isn't clipped by the track)
    //   track = faint, rounded, clipped container for the fill
    //   play  = red-to-pink played fill
    //   dot   = scrubber dot at the playhead
    const bar = document.createElement('div');
    bar.id = 'yt-progress-always';
    bar.style.height = barHeight;
    bar.style.position = 'absolute';
    bar.style.left = sideInset;
    bar.style.right = sideInset;
    bar.style.bottom = bottomOffset;
    bar.style.zIndex = alsoInFullscreen ? '60' : '10';
    bar.style.pointerEvents = 'none';
    bar.style.opacity = '0'; // corrected by syncVisibility() as soon as we attach
    bar.style.transition = 'opacity 0.2s ease';

    const track = document.createElement('div'); // faint unplayed track
    track.style.position = 'absolute';
    track.style.inset = '0';
    track.style.backgroundColor = trackColor;
    track.style.borderRadius = '9999px'; // fully rounded (pill) ends, like YouTube
    track.style.overflow = 'hidden'; // clip the fill to the rounded ends
    bar.appendChild(track);

    const loaded = document.createElement('div'); // buffered-ahead portion (behind the fill)
    loaded.style.backgroundColor = loadedColor;
    loaded.style.height = '100%';
    loaded.style.width = '0%';
    loaded.style.position = 'absolute';
    loaded.style.left = '0';
    loaded.style.top = '0';
    track.appendChild(loaded);

    const play = document.createElement('div'); // played portion (red fill)
    play.style.backgroundColor = barColor; // fallback while the fill is narrower than leadWidth
    // Fade the last leadWidth of the fill (nearest the playhead) to a pink, like YouTube.
    play.style.backgroundImage =
        `linear-gradient(90deg, ${barColor} 0, ${barColor} calc(100% - ${leadWidth}), ${barLeadColor} 100%)`;
    play.style.height = '100%';
    play.style.width = '0%';
    play.style.position = 'absolute';
    play.style.left = '0';
    play.style.top = '0';
    track.appendChild(play);

    const dot = document.createElement('div'); // scrubber "dot" at the playhead
    dot.style.backgroundColor = barColor;
    dot.style.width = dotSize;
    dot.style.height = dotSize;
    dot.style.borderRadius = '50%';
    dot.style.position = 'absolute';
    dot.style.left = '0%'; // updated to the played fraction on each timeupdate
    dot.style.top = '50%';
    dot.style.transform = 'translate(-50%, -50%)'; // center on the playhead
    bar.appendChild(dot);

    // Mirror YouTube's controls: YouTube toggles `ytp-autohide` on the player when
    // it hides its controls (and its own progress bar). Show ours exactly then, and
    // hide ours whenever YouTube's controls are visible. Also stay hidden during ads
    // (YouTube flags the player with `ad-showing`/`ad-interrupting`), since the bar
    // would otherwise track the ad's timeline, not the video's.
    let currentVideo = null;
    let visPlayer = null;
    const syncVisibility = () => {
        if (!visPlayer) return;
        const adShowing = visPlayer.classList.contains('ad-showing') ||
                          visPlayer.classList.contains('ad-interrupting');
        const controlsHidden = visPlayer.classList.contains('ytp-autohide');
        bar.style.opacity = (controlsHidden && !adShowing) ? '1' : '0';
    };
    const controlsObserver = new MutationObserver(syncVisibility);

    // Chapters: YouTube renders chaptered videos as a row of segments in
    // `.ytp-chapters-container`, each with a pixel width proportional to its
    // chapter's duration. We read those widths to find the chapter boundaries,
    // then punch matching transparent gaps into our track with a CSS mask — which
    // slices the track, buffered, and fill together, so the video shows through the
    // gaps exactly like YouTube. The scrubber dot sits above the mask, so it glides
    // across the gaps uninterrupted.
    const clearChapters = () => {
        track.style.webkitMaskImage = '';
        track.style.maskImage = '';
    };
    const applyChapters = () => {
        if (!showChapters || !visPlayer) return false;
        const container = visPlayer.querySelector('.ytp-chapters-container');
        const segs = container ? [...container.querySelectorAll('.ytp-chapter-hover-container')] : [];
        if (segs.length < 2) return false; // no chapters (single-segment or none)

        const widths = segs.map((s) => parseFloat(s.style.width) || s.offsetWidth || 0);
        const total = widths.reduce((a, b) => a + b, 0);
        if (!total) return false; // not laid out yet; caller will retry

        // Cumulative interior boundaries as a fraction of the timeline.
        const g = chapterGap / 2 + 'px'; // half-gap on each side of the boundary
        const stops = ['#000 0'];
        let acc = 0;
        for (let i = 0; i < widths.length - 1; i++) {
            acc += widths[i];
            const pos = (acc / total * 100).toFixed(3) + '%';
            stops.push(`#000 calc(${pos} - ${g})`);
            stops.push(`transparent calc(${pos} - ${g})`);
            stops.push(`transparent calc(${pos} + ${g})`);
            stops.push(`#000 calc(${pos} + ${g})`);
        }
        stops.push('#000 100%');
        const grad = `linear-gradient(90deg, ${stops.join(', ')})`;
        track.style.webkitMaskImage = grad;
        track.style.maskImage = grad;
        return true;
    };
    // The chapters container populates slightly after the player is ready, so retry
    // briefly on each new video until we find segments (or give up on plain videos).
    let chapterTimer = null;
    const refreshChapters = () => {
        clearChapters();
        if (chapterTimer) clearInterval(chapterTimer);
        if (!showChapters) return;
        let tries = 0;
        chapterTimer = setInterval(() => {
            if (applyChapters() || ++tries > 20) clearInterval(chapterTimer); // ~6s max
        }, 300);
        applyChapters();
    };

    const onProgress = (e) => {
        const v = e.target;
        if (!v.duration || isNaN(v.duration)) return; // guard against NaN early in load
        const pct = (v.currentTime / v.duration) * 100;
        play.style.width = pct + '%';
        dot.style.left = pct + '%';

        // Buffered-ahead: the loaded range that contains the playhead.
        let loadedPct = 0;
        const b = v.buffered;
        for (let i = 0; i < b.length; i++) {
            if (b.start(i) <= v.currentTime && v.currentTime <= b.end(i)) {
                loadedPct = (b.end(i) / v.duration) * 100;
                break;
            }
        }
        loaded.style.width = loadedPct + '%';
    };

    function attach() {
        if (document.location.pathname !== '/watch') {
            bar.remove();
            return;
        }

        // #movie_player is position:relative, so an absolutely-positioned child
        // anchors to it correctly (this was the main bug in the original).
        const player = document.querySelector('#movie_player');
        const v = player && player.querySelector('video');
        if (!player || !v) return false; // caller will retry

        if (bar.parentElement !== player) player.appendChild(bar);

        if (player !== visPlayer) {
            controlsObserver.disconnect();
            visPlayer = player;
            controlsObserver.observe(player, { attributes: true, attributeFilter: ['class'] });
            syncVisibility();
        }

        if (v !== currentVideo) {
            if (currentVideo) {
                currentVideo.removeEventListener('timeupdate', onProgress);
                currentVideo.removeEventListener('progress', onProgress);
            }
            currentVideo = v;
            play.style.width = '0%';
            dot.style.left = '0%';
            loaded.style.width = '0%';
            refreshChapters();
            v.addEventListener('timeupdate', onProgress, { passive: true });
            v.addEventListener('progress', onProgress, { passive: true });
        }
        return true;
    }

    // Poll briefly after each navigation until the player + video are ready.
    function attachWhenReady() {
        if (attach()) return;
        let tries = 0;
        const id = setInterval(() => {
            if (attach() || ++tries > 40) clearInterval(id); // ~10s max
        }, 250);
    }

    // YouTube fires this on every SPA navigation (including first watch page load).
    document.addEventListener('yt-navigate-finish', attachWhenReady);
    // Also run on script start in case we loaded directly onto a /watch page.
    attachWhenReady();
})();
