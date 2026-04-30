export interface PlayerInfo {
  gameUid: string;
  gameName: string;
  gameLevel: string;
}

export interface TournamentRegistration {
  id: string;
  tournamentId: string;
  userId: string;
  userEmail: string;
  userName: string;
  teamName?: string;
  players: PlayerInfo[];
  entryFee: number;
  status: 'Registered' | 'Canceled' | 'Refunded';
  createdAt: any;
}

export interface Tournament {
  id: string;
  title: string;
  image?: string;
  entryFee: number;
  prizePool: number;
  perKill?: number;
  slotsTotal: number;
  slotsLeft: number;
  startTime: string;
  type: 'Solos' | 'Duos' | 'Squads';
  map?: string;
  version?: string;
  status?: 'Upcoming' | 'Ongoing' | 'Completed' | 'Live';
  caption?: string;
  registrationOpen?: boolean;
  description?: string;
  rules?: string;
  game?: string;
  winnerName?: string;
  winnerDetails?: string;
  winnerPhoto?: string;
  winnerPrize?: number;
  winnerUserId?: string;
  platform?: string;
  externalLink?: string;
}

export interface HeroBanner {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  link?: string;
  buttonText?: string;
  type: 'Live' | 'Ad' | 'Announcement';
  isActive: boolean;
  createdAt: any;
}

export interface GameEvent {
  id: string;
  title: string;
  date?: string;
  image?: string;
  description: string;
  link?: string;
  status: 'Upcoming' | 'Ongoing' | 'Completed' | 'Announcement' | 'Live';
  type?: 'announcement' | 'upcoming' | 'ongoing' | 'event';
  createdAt: any;
  prizePool?: number;
  entryFee?: number;
}

export interface Transaction {
  id: string;
  userId?: string;
  date: string;
  type: 'Deposit' | 'Withdrawal' | 'Tournament Entry' | 'Winning';
  amount: number;
  status: 'Completed' | 'Pending' | 'Failed' | 'Approved';
  method?: string;
  tournamentId?: string;
  destination?: string;
  createdAt?: any;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'Match' | 'Result' | 'Announcement' | 'System' | 'Wallet';
  date: string;
  read: boolean;
}

export interface UserProfile {
  name: string;
  uid: string;
  email?: string;
  password?: string; // Added for local auth
  balance: number;
  diamonds: number;
  avatar: string;
  totalEarnings: number;
  matchesPlayed: number;
  isAdmin?: boolean;
  level?: number;
  xp?: number;
  totalTopupAmount?: number;
  lowMatchCount?: number;
  highMatchCount?: number;
}

export interface VerifiedCode {
  id: string;
  code: string;
  amount: number;
  status: 'Active' | 'Used';
  usedBy?: string;
  createdAt: any;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  method: string;
  number: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: any;
}

export interface ShopCategory {
  id: string;
  title: string;
  caption?: string; 
  image?: string;
  description?: string;
  isActive: boolean;
  createdAt: any;
}

export interface ShopPackage {
  id: string;
  categoryId: string;
  label: string;
  price: number;
  amount: string;
  image?: string;
  isActive: boolean;
  createdAt: any;
}

export interface ShopOrder {
  id: string;
  userId: string;
  userEmail: string;
  categoryId: string;
  categoryTitle: string;
  packageId: string;
  packageLabel: string;
  price: number;
  playerInfo: string;
  image?: string;
  status: 'Pending' | 'Completed' | 'Rejected';
  adminNote?: string;
  createdAt: any;
  updatedAt?: any;
}

export type PaymentFunction = 'Send Money' | 'Cash Out' | 'Pay';

export interface PaymentMethod {
  id: string;
  name: string;
  number: string;
  isEnabled: boolean;
  type: PaymentFunction;
  updatedAt: any;
}
