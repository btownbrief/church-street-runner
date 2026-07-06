# Leaderboard setup (one time, ~5 minutes)

The game's monthly leaderboard runs on [Supabase](https://supabase.com) —
a free hosted Postgres database. No player ever logs in; each browser gets
a random anonymous ID, and the server keeps only each player's **best**
score per month. Boards roll over automatically on the 1st and past months
stay stored forever, so old boards are "cemented."

This same database is designed to be shared by **all** Btown games
(FILED, and whatever comes next) — every score row is tagged with which
game it belongs to, so you only ever do this setup once.

## Steps

1. Go to <https://supabase.com>, sign up (free), and click **New project**.
   - Name it something like `btown-games`.
   - Pick any database password (you won't need it day-to-day — save it
     in a password manager).
   - Region: **US East** (closest to Vermont).

2. Once the project finishes creating, open **SQL Editor** (left sidebar),
   paste the entire contents of `supabase/schema.sql` into the editor,
   and click **Run**. You should see "Success. No rows returned."

3. Open **Settings → API** (or "Project Settings → Data API") and copy two values:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon / public key** — a long string starting with `eyJ...`
     (this key is *meant* to be public; it can only call the three
     leaderboard functions, nothing else)

4. Open `src/leaderboard.js` in this project and paste them into the two
   constants at the top:

   ```js
   const SUPABASE_URL = 'https://abcdefgh.supabase.co';
   const SUPABASE_ANON_KEY = 'eyJ...';
   ```

5. Rebuild and publish: `npm run build`, then commit and push.

That's it. Until step 4 is done, the game simply hides the leaderboard
and works exactly as before.

## Adding another game later (e.g. FILED)

No new database work needed. In the other game's code, reuse
`src/leaderboard.js` with the same URL/key and change one line:

```js
const GAME = 'filed';
```

Players who've played on the same domain keep their name automatically
(it's stored under shared `btown-*` localStorage keys).

## Notes

- **Cheating:** scores come from the player's browser, so a determined
  nerd could post a fake score (true of every client-side game). The
  database rejects scores over 1,000,000 as a sanity cap. If someone
  griefs the board, you can delete their row in Supabase's Table Editor.
- **Free tier limits:** 500 MB database / 5 GB bandwidth per month —
  a leaderboard uses a tiny fraction of a percent of that.
- **Monthly reset:** nothing to do; the month key is computed from
  Vermont time (`America/New_York`) on the server.
