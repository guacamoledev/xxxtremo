import { Timestamp } from 'firebase/firestore';

// User roles constant
export const UserRole = {
  ADMIN: 'admin',
  FINANCE: 'finance',
  STREAMING: 'streaming',
  VIEWER: 'viewer'
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

// User interface
export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  birthdate: string;
  role: UserRole;
  balance: number;
  totalDeposited: number;
  totalBet: number;
  totalWon: number;
  registrationDate: Timestamp;
  active: boolean;
  withdrawalEligible: boolean; // totalBet >= totalDeposited
}

// Palenque interface
export interface Palenque {
  id: string;
  name: string;
  description: string;
  location?: string;
  creationDate: Timestamp;
  active: boolean;
}

// Event interface
export interface Event {
  id: string;
  palenqueId: string;
  name: string;
  description?: string;
  date: Timestamp;
  startTime: Timestamp;
  entryCost: number;
  requiredFights: number;
  confirmedTeams: string[];
  numberOfCocks: number;
  imageUrl?: string;
  streamingChannel: string;
  eventType: 'regular' | 'special' | 'tournament';
  status: 'scheduled' | 'in_progress' | 'finished' | 'cancelled';
}

// Fight interface
export interface Fight {
  id: string;
  eventId: string;
  fightNumber: number;
  redFighter: string;
  greenFighter: string;
  status: 'scheduled' | 'in_progress' | 'betting_open' | 'betting_closed' | 'finished';
  winner?: 'red' | 'green' | null;
  resolved?: boolean; // Indica si las apuestas han sido resueltas
  startDate?: Timestamp;
  endDate?: Timestamp;
  bettingEnabled: boolean;
  minBet: number;
  cock1: {
    name: string;
    breed: string;
    weight: number;
    owner: string;
  };
  cock2: {
    name: string;
    breed: string;
    weight: number;
    owner: string;
  };
  scheduledTime?: Timestamp;
}

export type FightStatus = Fight['status'];

export interface CreateFightData {
  eventId: string;
  fightNumber?: number;
  redFighter?: string;
  greenFighter?: string;
  status: FightStatus;
  minBet: number;
  cock1: {
    name: string;
    breed: string;
    weight: number;
    owner: string;
  };
  cock2: {
    name: string;
    breed: string;
    weight: number;
    owner: string;
  };
  scheduledTime?: Date;
  bettingEnabled?: boolean;
}

// Bet interface with multiple matches support
export interface Bet {
  id: string;
  userId: string;
  fightId: string;
  color: 'red' | 'green';
  amount: number; // Current amount (may be reduced after partial matches)
  originalAmount: number; // Original amount for audit trail
  status: 'pending' | 'matched' | 'won' | 'lost' | 'rejected' | 'refunded';
  creationDate: Timestamp;
  // Multiple matches support
  matches: Array<{
    betId: string;
    amount: number;
    matchedAt: Timestamp;
  }>;
  // Legacy fields for backwards compatibility
  matchedBetId?: string;
  matchedAmount?: number;
  profit?: number;
  corrected?: boolean;
  // New fields
  parentBetId?: string; // For residual bets created from partial matches
  isResidual?: boolean; // Indicates if this bet was created from a partial match
}

// Counter bet interface for manual betting
export interface CounterBet {
  id: string;
  originalBetId: string;
  targetUserId?: string;
  amount: number;
  color: 'red' | 'green';
  expiresAt: Timestamp;
  status: 'available' | 'taken' | 'expired';
  createdBy: string;
}

// Deposit interface
export interface Deposit {
  id: string;
  userId: string;
  amount: number;
  bankReference: string;
  receiptUrl: string;
  accountDetails: {
    cardNumber: '4741 7406 0220 7885';
    beneficiary: 'XXXTREMO';
    clabe: '058320000000893020';
    bank: 'Banregio';
  };
  status: 'pending' | 'approved' | 'rejected';
  requestDate: Timestamp;
  processedDate?: Timestamp;
  processedBy?: string;
  comments?: string;
}

// Withdrawal interface
export interface Withdrawal {
  id: string;
  userId: string;
  requestedAmount: number;
  commission: number; // 1%
  netAmount: number;
  bankDetails: {
    bank: string;
    accountNumber: string;
    clabe?: string;
    holderName: string;
  };
  status: 'pending' | 'approved' | 'processed' | 'rejected';
  requestDate: Timestamp;
  processedDate?: Timestamp;
  processedBy?: string;
  deadline: Timestamp; // requestDate + 48h
  comments?: string;
}

// Transaction interface
export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'bet' | 'win' | 'refund';
  amount: number;
  reference?: string;
  date: Timestamp;
  status: 'pending' | 'completed' | 'failed';
}

// Commission interface
export interface Commission {
  id: string;
  type: 'bet' | 'withdrawal';
  amount: number;
  reference: string;
  date: Timestamp;
  sourceUserId?: string;
}

// Platform balance interface
export interface PlatformBalance {
  id: string; // format: YYYY-MM
  month: string;
  year: number;
  betCommissions: number; // 10% from bets
  withdrawalCommissions: number; // 1% from withdrawals
  totalRevenue: number;
  lastUpdated: Timestamp;
}

// Bet correction interface
export interface BetCorrection {
  id: string;
  fightId: string;
  originalWinner: 'red' | 'green';
  newWinner: 'red' | 'green';
  correctedBy: string;
  correctionDate: Timestamp;
  affectedBets: string[];
  reason: string;
  processed: boolean;
}

// Streaming channel interface
export interface StreamingChannel {
  id: string;
  name: string;
  url: string;
}

// Notification interface
export interface Notification {
  id: string;
  userId: string;
  type: 'bet_result' | 'correction' | 'deposit' | 'withdrawal' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: Timestamp;
  relatedId?: string; // ID of related bet, transaction, etc.
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  name: string;
}

export interface BetForm {
  fightId: string;
  color: 'red' | 'green';
  amount: number;
}

export interface DepositForm {
  amount: number;
  bankReference: string;
  receipt: File;
}

export interface WithdrawalForm {
  amount: number;
  bankDetails: {
    bank: string;
    accountNumber: string;
    clabe?: string;
    holderName: string;
  };
}
