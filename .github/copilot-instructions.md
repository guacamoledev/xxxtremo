# Copilot Instructions for XXXTREMO Platform

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a live streaming betting platform for cockfighting events (palenques) built with React TypeScript, Material-UI, and Firebase.

## Key Technologies
- React 18 with TypeScript
- Material-UI (MUI) v5 for components
- Firebase (Firestore, Auth, Functions, Storage, Hosting)
- React Query for state management
- Socket.io for real-time updates
- React Router for navigation

## Business Rules
- Minimum bet: $100 MXN
- Maximum bet: User's available balance
- Withdrawal commission: 1%
- Platform commission from bets: 10%
- Users must bet 100% of deposits before withdrawal eligibility
- Automatic bet matching system
- 48-hour withdrawal processing time

## User Roles
- Admin: Full system access, can correct fight results
- Finance: Manage deposits/withdrawals, approve transactions
- Streaming: Manage events, fights, assign winners
- Viewer: Place bets, watch streams, manage account

## Key Collections (Firebase)
- users: User accounts and balances
- palenques: Fighting venues
- events: Competition events
- fights: Individual fights within events
- bets: User betting records
- deposits: Deposit requests with receipts
- withdrawals: Withdrawal requests
- platform_balances: Monthly commission tracking
- bet_corrections: Fight result corrections

## Banking Details
- Bank: Banregio
- Card: 4741 7406 0220 7885
- CLABE: 058320000000893020
- Beneficiary: XXXTREMO

## Code Style
- Use TypeScript strict mode
- Follow Material-UI design patterns
- Implement proper error handling
- Use React Query for server state
- Include loading states and error boundaries
- Follow Firebase security rules best practices
