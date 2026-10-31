# A Little Universe for Doctor 💗

A small interactive website, built by an Engineer for a Doctor. It's a ten-chapter journey with mini-games, a hand-drawn galaxy, a secret letter, and one final question.

Built with **Next.js 16 (Pages Router)**, React 19 and Tailwind CSS v4. There are no other runtime dependencies: every illustration is CSS or SVG, and every sound is synthesized in the browser with WebAudio, so there are no audio files to go missing.

## The journey

| # | Chapter | What happens |
|---|---------|--------------|
| 1 | The Magical Welcome | A glowing planet (tap it), a wiggling envelope, and "Enter Our Little Universe ✨" |
| 2 | Two Different Worlds | Doctor and Engineer cards; tap to merge two little worlds into one galaxy |
| 3 | The Five-Hour Mystery | A clock counts 00:00 → 05:00 while the phone battery drains and the tea goes cold |
| 4 | And Then, Today… | A phone: her good-morning message, then an incoming video call to accept, then the RCB loyalty confession |
| 5 | A Quick Check-up | She squeezes a BP pump bulb; "HeartOS" diagnoses slightly-high BP (reason: he found his dream girl) |
| 6 | The Patient's Report | The Engineer's lab report: the cause of his high BP turns out to be her — every quality confirmed, bad habits none |
| 7 | Catch the Hearts | A 20-second tap game: hearts +1, rasgullas +3, then one extra heart to open |
| 8 | Our First Date, Wherever It Is | A date menu (Pune? Panvel? somewhere in between): chaat, dosa, movies, long drives, rasgulla (with a real photo) and lots of shopping |
| 9 | The Distance Between Us | Spider-Man swings from Pune (Engineer) to Panvel (Doctor), then "whenever you have a bad day, I'll be there" |
| 10 | A Little Playlist | Tum Prem Ho, O Sanam, Pehla Nasha, Tum Se Hi, Kesariya (YouTube, loads on tap) |
| 11 | Universe of Possibilities | Six planets: exploring the world, personal photographer, festivals, and more |
| 12 | A Little Prayer | Tap the diya to light it and reveal his prayer |
| 13 | The Secret Envelope | The wax-sealed letter types itself out, with a P.S. |
| 14 | The Final Question | "Hey Doctor, I like you." YES, Of course!, or a "Can't Say" button that runs away |

**Extras**
- Six hidden secret stars to find
- A desktop sparkle cursor
- Optional music and sound effects (they never autoplay, and the music pauses when a YouTube song starts)
- The Journey Map (top-left) for replaying any chapter and resetting progress
- Progress saved in LocalStorage
- Full `prefers-reduced-motion` support

## Run it locally

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev          # http://localhost:3000
```

Production build:

```bash
npm run build
npm run start        # http://localhost:3000
```

To open it on your phone over the same Wi-Fi network, run `npm run dev -- -H 0.0.0.0` and visit `http://<your-computer-ip>:3000`.

## Deploy

### Vercel (recommended, zero config)
1. Push this folder to a GitHub repository. It can be private.
2. Go to <https://vercel.com/new>, import the repository, and press **Deploy**.
3. You get a URL like `https://your-project.vercel.app`. That's the link to send.

Or deploy from the terminal: `npx vercel` (first time), then `npx vercel --prod`.

### Netlify
1. Push to GitHub, then go to <https://app.netlify.com/start> and import the repo.
2. Netlify detects Next.js automatically. Build command: `npm run build`. Leave the publish directory as Netlify suggests (its Next.js runtime handles it).
3. Deploy.

> Tip: rename the project to something gentle before deploying (for example `a-little-universe`), because the project name becomes part of the URL.

## Customising the words

Almost all of the copy lives in [`src/lib/content.ts`](src/lib/content.ts): the BP readout, the lab-report qualities, the first-date menu, the playlist, planet messages, secret-star notes and the letter.

To change a song, replace its YouTube video ID (the part after `watch?v=`) in `SONGS`. The current IDs were checked to exist and to allow embedding.

Chapter order and titles are in [`src/lib/chapters.ts`](src/lib/chapters.ts).

## Project structure

```
public/
  D.png                 # her photo (polaroid under the letter)
  images/rasgulla.jpg   # real photo for the first-date menu (credit below)
  icon.svg              # heart favicon
src/
  pages/
    _app.tsx            # fonts (Playfair Display, DM Sans, Caveat)
    _document.tsx       # theme colour, noindex, favicon
    index.tsx           # page <head> + <Universe />
  components/
    Universe.tsx        # scene manager: transitions, sky, sound, celebrations, toasts
    universe-context.ts # shared API used by every chapter
    Backdrop.tsx        # skies, stars, sparkles, floating hearts
    TopBar.tsx          # constellation progress + music/sound toggles
    JourneyMenu.tsx     # chapter map, secrets counter, reset progress
    Effects.tsx         # heart bursts/rain, toast, warp transition, sparkle cursor
    Envelope.tsx        # CSS envelope with wax seal
    SecretStar.tsx      # hidden star easter eggs
    Modal.tsx           # accessible native <dialog>
    ui.tsx, icons.tsx   # chapter header/nav, inline SVG icons
    chapters/           # one file per chapter (14)
  lib/
    content.ts          # all the words
    chapters.ts         # chapter metadata
    progress.ts         # LocalStorage-backed progress store
    sound.ts            # WebAudio music box + sound effects
    random.ts, useReducedMotion.ts
  styles/globals.css    # design tokens, illustrations, animations
```

## Good to know

- **Her answer isn't sent anywhere.** The site has no backend, so the final choice only shows on her screen, and the page says so gently. If you'd like a way for her to reply, you could add a WhatsApp or email link in `FinalQuestion.tsx`.
- **Sound** starts off. She can turn it on from the welcome screen or the top bar. Music pauses automatically when the tab is hidden.
- **Accessibility:** everything is a real button, works with a keyboard, moves focus to each new chapter's heading, and gives screen readers the full letter immediately.

## Credits

- Rasgulla photo: [Mdsmds0](https://commons.wikimedia.org/wiki/File:Rasgulla_Sweet.JPG), CC BY-SA 4.0, via Wikimedia Commons
- Songs are embedded from their YouTube uploads (official labels where available); nothing is re-hosted.
# my-world
