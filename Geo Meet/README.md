# GeoMeet Mini App (Base MiniKit)

This repo implements GeoMeet as a Base Mini App using MiniKit. Core features:

- Wallet-based identity (address = user id)
- Profile with availability and geolocation
- Nearby matching by availability and location
- Meetup creation and feedback (👍/👎)

Tech:

- [MiniKit](https://docs.base.org/builderkits/minikit/overview)
- [OnchainKit](https://www.base.org/builders/onchainkit)
- [Next.js](https://nextjs.org/docs)
- [Supabase](https://supabase.com) (DB + RPC)

## 1. Supabase Setup

Run the following SQL in the Supabase SQL editor:

```sql
-- Profiles (user credentials)
create table if not exists profiles (
  id text primary key, -- wallet address
  name text,
  industry text,
  role text,
  food_preference text,
  availability text check (availability in ('lunch','after-office')),
  lat double precision,
  lng double precision,
  contacts text[] default '{}' -- exchanged namecards
);

-- Meetups
create table if not exists meetups (
  id uuid primary key default gen_random_uuid(),
  participants text[] not null, -- wallet addresses
  type text check (type in ('lunch','after-office')),
  start_time timestamptz default now(),
  status text default 'ongoing',
  feedback jsonb default '{}' -- { "0xabc": "👍", "0xdef": "👎" }
);


-- RLS (optional if using Service Role exclusively on server)
alter table profiles enable row level security;
alter table meetups enable row level security;

-- Policies
create policy if not exists "Users can manage own profile" on profiles for all using (id = auth.jwt() ->> 'sub');
create policy if not exists "Profiles readable by anyone" on profiles for select using (true);
create policy if not exists "Participants can view meetups" on meetups for select using (auth.jwt() ->> 'sub' = any(participants));
create policy if not exists "Participants can update meetups" on meetups for update using (auth.jwt() ->> 'sub' = any(participants));

-- RPC for namecards
create or replace function exchange_namecards(user_a text, user_b text)
returns void as $$
begin
  update profiles set contacts = array_append(contacts, user_b) where id = user_a;
  update profiles set contacts = array_append(contacts, user_a) where id = user_b;
end;
$$ language plpgsql;
```

Note: This app uses the Service Role key server-side to bypass RLS for simplicity in MVP.

## 2. Environment Variables

1. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

2. Verify environment variables, these will be set up by the `npx create-onchain --mini` command:

You can regenerate the FARCASTER Account Association environment variables by running `npx create-onchain --manifest` in your project directory.

The environment variables enable the following features:

- Frame metadata - Sets up the Frame Embed that will be shown when you cast your frame
- Account association - Allows users to add your frame to their account, enables notifications
- Redis API keys - Enable Webhooks and background notifications for your application by storing users notification details

```bash
# Shared/OnchainKit variables
NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME=
NEXT_PUBLIC_URL=
NEXT_PUBLIC_ICON_URL=
NEXT_PUBLIC_ONCHAINKIT_API_KEY=

# Frame metadata
FARCASTER_HEADER=
FARCASTER_PAYLOAD=
FARCASTER_SIGNATURE=
NEXT_PUBLIC_APP_ICON=
NEXT_PUBLIC_APP_SUBTITLE=
NEXT_PUBLIC_APP_DESCRIPTION=
NEXT_PUBLIC_APP_SPLASH_IMAGE=
NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR=
NEXT_PUBLIC_APP_PRIMARY_CATEGORY=
NEXT_PUBLIC_APP_HERO_IMAGE=
NEXT_PUBLIC_APP_TAGLINE=
NEXT_PUBLIC_APP_OG_TITLE=
NEXT_PUBLIC_APP_OG_DESCRIPTION=
NEXT_PUBLIC_APP_OG_IMAGE=

# Redis config
REDIS_URL=
REDIS_TOKEN=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

## 3. Local Dev

```bash
npm run dev
```

## 4. API Endpoints

- POST `/api/profile` – upsert profile
- GET `/api/profile?id=0x...` – get profile
- GET `/api/match?lat=..&lng=..&type=lunch|after-office` – list nearby users
- POST `/api/meetup` – create meetup `{ participants, type }`
- PUT `/api/meetup` – submit feedback `{ meetupId, userId, feedback }`


## 5. Minimal Client Flow

- On wallet connect, browser geolocation is read and profile upserted with `id`, `availability`, `lat`, `lng`.
- Click Find nearby to load matches within ~1km bounding box.
- Create a meetup with a selected profile; then submit 👍/👎 as feedback.


## 6. 1-Day Timeline

- Morning: Supabase project + schema + RPC + env setup (1–2h)
- Late Morning: Implement API routes (1h)
- Afternoon: Minimal client integration for connect + geo + match + meetup + feedback (2–3h)
- Late Afternoon: Smoke test end-to-end; deploy if needed (1h)

## Template Features

### Frame Configuration

- `.well-known/farcaster.json` endpoint configured for Frame metadata and account association
- Frame metadata automatically added to page headers in `layout.tsx`

### Background Notifications

- Redis-backed notification system using Upstash
- Ready-to-use notification endpoints in `api/notify` and `api/webhook`
- Notification client utilities in `lib/notification-client.ts`

### Theming

- Custom theme defined in `theme.css` with OnchainKit variables
- Pixel font integration with Pixelify Sans
- Dark/light mode support through OnchainKit

### MiniKit Provider

The app is wrapped with `MiniKitProvider` in `providers.tsx`, configured with:

- OnchainKit integration
- Access to Frames context
- Sets up Wagmi Connectors
- Sets up Frame SDK listeners
- Applies Safe Area Insets


## Learn More

- [MiniKit Documentation](https://docs.base.org/builderkits/minikit/overview)
- [OnchainKit Documentation](https://docs.base.org/builderkits/onchainkit/getting-started)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
