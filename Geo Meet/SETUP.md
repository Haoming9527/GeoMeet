# GeoMeet Setup Guide

## New Features Added

1. **Fixed Map Icons**: Resolved 404 errors for marker icons by using CDN URLs
2. **Red/Blue Dots**: Other users show as red dots, current user as blue dot
3. **Slide-over Panels**: Message/Pay buttons now open slide-over panels instead of new pages
4. **Messages System**: New messages button with unread indicators
5. **Invite Messages**: Invite button now sends a message to the other user
6. **Profile Integration**: "Go to Profile" button now opens inline profile form

## Database Setup

Your current schema is already correct! The app uses your existing tables:

```sql
-- Profiles (user credentials)
create table profiles (
  id text primary key, -- wallet address
  name text,
  industry text,
  role text,
  food_preference text,
  availability text check (availability in ('lunch','after-office', 'unavailable')),
  lat double precision,
  lng double precision,
  contacts text[] default '{}' -- exchanged namecards
);

-- Meetups
create table meetups (
  id uuid primary key default gen_random_uuid(),
  participants text[] not null, -- wallet addresses
  type text check (type in ('lunch','after-office')),
  start_time timestamptz default now(),
  status text default 'ongoing',
  feedback jsonb default '{}' -- { "0xabc": "👍", "0xdef": "👎" }
);

-- Messages (optional if you want chat)
create table messages (
  id uuid primary key default gen_random_uuid(),
  meetup_id uuid references meetups(id),
  sender text references profiles(id),
  content text,
  created_at timestamptz default now()
);
```

Just add these indexes for better performance:

```sql
-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_meetup_id ON messages(meetup_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
```

## New Components

- `SlideOver.tsx`: Slide-over panel for messages and Base Pay integration
- `MessagesPanel.tsx`: Messages list panel with unread indicators
  (Messages removed)

## Features

### Messages System

- Red dot indicator on Messages button when there are unread messages
- Messages panel shows all conversations with unread indicators
- Clicking a user in the messages list opens the chat slide-over


### Map Updates

- Fixed missing marker icons (404 errors resolved)
- Current user shows as blue dot
- Other users show as red dots
- All dots are clickable with popups

### Invite System

- Invite button now creates a meetup AND sends a message to the other user
- The message appears in the other user's messages list

### Profile Integration

- "Complete Profile" button opens the inline profile form
- No more navigation to separate profile page
- Profile form saves and closes automatically

## Usage

1. Connect your wallet
2. Grant location permission
3. Set your availability (Lunch/After-office/Unavailable)
4. View nearby users on the map (red dots)
5. Use Invite or Message/Pay buttons
6. Check Messages button for conversations and invites
7. Complete your profile using the inline form

## Notes

- The red dot on Messages button is currently always visible (you can implement real-time updates)
- Payment functionality uses Base Pay button (0.001 ETH default amount)
- Messages are stored in Supabase using your meetup-based schema
- No separate payments table needed - Base Pay handles the actual transactions
