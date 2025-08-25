# GeoMeet 🌍

A location-based networking app built for the NTU x Base Web 3 Hackathon that helps professionals connect with nearby colleagues for lunch or after-office meetups.

## 🚀 Features

- **📍 Real-time Location Sharing**: See nearby professionals on an interactive map
- **🤝 Smart Matching**: Find colleagues based on availability and proximity
- **💬 Built-in Messaging**: Chat with potential meetup partners
- **💳 Web3 Integration**: Connect with Base wallet and use Base Pay for transactions
- **📱 Mobile-First Design**: Responsive interface optimized for mobile devices
- **🔔 Real-time Notifications**: Get notified about new messages and invites

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Maps**: Leaflet with React-Leaflet
- **Database**: Supabase (PostgreSQL)
- **Caching**: Upstash Redis
- **Web3**: Wagmi, Viem, Base Network
- **UI Components**: Coinbase OnchainKit
- **State Management**: TanStack React Query

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Upstash Redis account
- Base Network wallet

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/geomeet.git
   cd geomeet
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   UPSTASH_REDIS_REST_URL=your_redis_url
   UPSTASH_REDIS_REST_TOKEN=your_redis_token
   ```

4. **Set up the database**
   Run the following SQL in your Supabase SQL editor:
   ```sql
   -- Profiles table
   create table profiles (
     id text primary key,
     name text,
     industry text,
     role text,
     food_preference text,
     availability text check (availability in ('lunch','after-office', 'unavailable')),
     lat double precision,
     lng double precision,
     contacts text[] default '{}'
   );

   -- Meetups table
   create table meetups (
     id uuid primary key default gen_random_uuid(),
     participants text[] not null,
     type text check (type in ('lunch','after-office')),
     start_time timestamptz default now(),
     status text default 'ongoing',
     feedback jsonb default '{}'
   );

   -- Messages table
   create table messages (
     id uuid primary key default gen_random_uuid(),
     meetup_id uuid references meetups(id),
     sender text references profiles(id),
     content text,
     created_at timestamptz default now()
   );

   -- Performance indexes
   CREATE INDEX IF NOT EXISTS idx_messages_meetup_id ON messages(meetup_id);
   CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender);
   CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📱 How to Use

1. **Connect Your Wallet**: Click "Connect Wallet" and connect your Base Network wallet
2. **Grant Location Permission**: Allow the app to access your location
3. **Set Availability**: Choose your availability (Lunch/After-office/Unavailable)
4. **View Nearby Users**: See other professionals as red dots on the map
5. **Start Conversations**: Click on users to send invites or messages
6. **Complete Your Profile**: Add your name, industry, and preferences
7. **Arrange Meetups**: Use the messaging system to coordinate meetups

## 🗺️ Map Features

- **Interactive Map**: Built with Leaflet for smooth performance
- **Real-time Updates**: See users' locations update in real-time
- **Distance Calculation**: Automatic distance calculation between users
- **Clickable Markers**: Click on user markers to see details and actions

## 💬 Messaging System

- **Real-time Chat**: Instant messaging with other users
- **Meetup Coordination**: Send and receive meetup invitations
- **Unread Indicators**: Visual indicators for new messages
- **Message History**: Persistent chat history stored in Supabase

## 🔧 Development

### Project Structure
```
GeoMeet/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── components/        # React components
│   └── page.tsx          # Main application page
├── lib/                   # Utility libraries
├── public/               # Static assets
└── package.json          # Dependencies and scripts
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Key Components

- **GeoMap**: Interactive map component using Leaflet
- **MessagesPanel**: Chat interface for user conversations
- **PanelOverlay**: Slide-over panels for various actions
- **UI**: Reusable UI components

## 🌐 Deployment

The app is configured for deployment on Vercel with the following features:

- **Edge Functions**: API routes run on Vercel Edge
- **Environment Variables**: Configured for production
- **Database**: Supabase for data persistence
- **Caching**: Upstash Redis for performance

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for NTU x Base Web 3 Hackathon
- Powered by Base Network and Coinbase OnchainKit
- Maps powered by Leaflet
- Database hosted on Supabase


