# XXXTREMO - Live Streaming Betting Platform

A real-time streaming and betting platform for cockfighting events built with React, TypeScript, Material-UI, and Firebase.

## Features

- **Live Event Streaming**: Watch cockfighting events in real-time
- **Real-time Betting**: Place bets on fights with automatic matching
- **User Roles**: Admin, Finance, Streaming, and Viewer roles
- **Financial Management**: Deposits, withdrawals with commission tracking
- **Multi-panel Interface**: Role-based dashboards and controls

## Technology Stack

- **Frontend**: React 18 + TypeScript + Material-UI v5
- **Backend**: Firebase (Firestore, Auth, Functions, Storage, Hosting)
- **State Management**: React Query + Context API
- **Real-time**: Socket.io for live updates
- **Routing**: React Router v6
- **Build Tool**: Vite

## Business Rules

- Minimum bet: $100 MXN
- Maximum bet: User's available balance
- Withdrawal commission: 1%
- Platform commission: 10% from bets
- Users must bet 100% of deposits before withdrawal eligibility
- 48-hour withdrawal processing time

## Banking Information

- **Bank**: Banregio
- **Card**: 4741 7406 0220 7885
- **CLABE**: 058320000000893020
- **Beneficiary**: XXXTREMO

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase project configured

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd XXXTREMO
```

2. Install dependencies
```bash
npm install
```

3. Configure Firebase
   - Update `src/config/firebase.ts` with your Firebase configuration
   - Set up Firestore security rules
   - Configure Firebase Functions

4. Start development server
```bash
npm run dev
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/          # Reusable UI components
├── contexts/           # React contexts (Auth, etc.)
├── pages/              # Page components
├── types/              # TypeScript type definitions
├── config/             # Configuration files
├── theme/              # Material-UI theme
├── hooks/              # Custom React hooks
├── services/           # API services
└── utils/              # Utility functions
```

## User Roles

### Admin
- Full system access
- User management
- Fight result corrections
- System configuration

### Finance
- Approve/reject deposits
- Process withdrawals
- View financial reports
- Manage commission tracking

### Streaming
- Manage events and fights
- Control fight status
- Assign fight winners
- Configure streaming channels

### Viewer
- Watch live streams
- Place bets
- View betting history
- Manage account balance

## Firebase Collections

- `users` - User accounts and balances
- `palenques` - Fighting venues
- `events` - Competition events
- `fights` - Individual fights
- `bets` - User betting records
- `deposits` - Deposit requests
- `withdrawals` - Withdrawal requests
- `platform_balances` - Monthly commission tracking
- `bet_corrections` - Fight result corrections

## Development Guidelines

1. Use TypeScript strict mode
2. Follow Material-UI design patterns
3. Implement proper error handling
4. Include loading states
5. Use React Query for server state
6. Follow Firebase security best practices

## License

Private - All rights reserved
