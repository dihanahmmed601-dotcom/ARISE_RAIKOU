import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, X, Wallet, User, History, LogOut, 
  Trophy, Flame, TrendingUp, CreditCard, 
  Diamond, Bell, Search, ChevronRight,
  Target, LayoutGrid, Users, BarChart3,
  HelpCircle, Newspaper, Plus, Zap, ShieldCheck, Headphones,
  Settings as SettingsIcon, Filter, Check, Copy, Clock, ArrowRight, Trash2, CheckCircle2,
  ExternalLink, Calendar, ShoppingBag, ArrowLeft
} from 'lucide-react';

// Firebase & Auth
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { 
  socialSignIn, logout, googleProvider, 
  getTournaments, getTopupPackages, getEvents,
  redeemVerifiedCode, createWithdrawalRequest, getUserTransactions,
  getUserNotifications, markNotificationAsRead, registerForTournament, getTournamentRegistrations,
  db, onSnapshot, collection, query, orderBy, handleFirestoreError, OperationType,
  subscribeHeroBanners, getUserRegistrations
} from './lib/firebase';
import AdminDashboard from './components/AdminDashboard';

// Types
import { 
  Tournament, UserProfile, Transaction, Notification, TopupPackage, 
  GameEvent, TournamentRegistration, PlayerInfo, HeroBanner
} from './types';
import { formatDate, getErrorMessage } from './lib/utils';

// Mock Data
const MOCK_USER_INITIAL: UserProfile = {
  name: "RAIKOU GAMER",
  uid: "1234567890",
  balance: 0,
  diamonds: 0,
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Raikou&backgroundColor=6a00ff&mood=serious",
  totalEarnings: 0,
  matchesPlayed: 0
};

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 'TX101', date: '2024-04-24 14:30', type: 'Deposit', amount: 500, status: 'Completed', method: 'bKash' },
  { id: 'TX102', date: '2024-04-23 09:15', type: 'Tournament Entry', amount: -20, status: 'Completed', tournamentId: '1' },
  { id: 'TX103', date: '2024-04-22 22:00', type: 'Winning', amount: 150, status: 'Completed', tournamentId: '2' },
  { id: 'TX104', date: '2024-04-21 11:45', type: 'Withdrawal', amount: -200, status: 'Pending', method: 'Nagad', destination: '01XXXXXXXXX' },
];

const SkeletonCard = () => (
  <div className="glass-card relative overflow-hidden bg-[#0a0a0a]/80 border-white/5 rounded-2xl animate-pulse">
    <div className="absolute inset-0 z-0 bg-white/5 animate-pulse" />
    <div className="relative z-10 p-6 flex flex-col h-full">
      <div className="h-6 w-3/4 bg-white/10 rounded animate-pulse mb-2" />
      <div className="h-3 w-1/2 bg-white/5 rounded animate-pulse mb-8" />
      
      <div className="grid grid-cols-2 gap-4 mb-6 mt-auto">
        <div className="h-16 bg-white/5 rounded-xl animate-pulse" />
        <div className="h-16 bg-white/5 rounded-xl animate-pulse" />
      </div>
      
      <div className="h-2 w-full bg-white/5 rounded-full animate-pulse mb-6" />
      <div className="h-12 w-full bg-white/5 rounded-xl animate-pulse" />
    </div>
  </div>
);

const PREDEFINED_AVATARS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Raikou",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Shadow",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Viper",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Ace",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Neon",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Blitz",
];

const TOURNAMENTS: Tournament[] = [
  { id: '1', title: 'SQUAD BATTLE', entryFee: 20, prizePool: 1000, slotsTotal: 48, slotsLeft: 12, startTime: '02 : 15 : 30', type: 'Squads' },
  { id: '2', title: 'DUO FIGHT', entryFee: 15, prizePool: 600, slotsTotal: 32, slotsLeft: 12, startTime: '01 : 45 : 10', type: 'Duos' },
  { id: '3', title: 'SOLO WAR', entryFee: 10, prizePool: 300, slotsTotal: 50, slotsLeft: 35, startTime: '03 : 20 : 00', type: 'Solos' },
];

const UPCOMING: Tournament[] = [
  { id: '4', title: 'SQUAD CHALLENGE', entryFee: 20, prizePool: 1000, slotsTotal: 48, slotsLeft: 48, startTime: '25 MAY | 08:00 PM', type: 'Squads' },
  { id: '5', title: 'DUO SHOWDOWN', entryFee: 15, prizePool: 600, slotsTotal: 32, slotsLeft: 32, startTime: '26 MAY | 09:00 PM', type: 'Duos' },
  { id: '6', title: 'SOLO LEAGUE', entryFee: 10, prizePool: 300, slotsTotal: 50, slotsLeft: 50, startTime: '27 MAY | 10:00 PM', type: 'Solos' },
];

// Reusable Components
const LoadingScreen = () => (
  <div className="flex-1 flex items-center justify-center">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-neon-purple/20 border-t-neon-purple rounded-full animate-spin"></div>
      <Zap className="absolute inset-0 m-auto text-neon-yellow animate-pulse" size={24} />
    </div>
  </div>
);

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3 }}
    className="p-4 lg:p-8"
  >
    {children}
  </motion.div>
);

const DesktopNav = ({ user }: { user: UserProfile | null }) => {
  const location = useLocation();
  const navItems = [
    { icon: <LayoutGrid />, label: 'HOME', path: '/' },
    { icon: <User />, label: 'PROFILE', path: '/profile' },
    { icon: <Trophy />, label: 'ANNOUNCEMENTS', path: '/announcements' },
    { icon: <History />, label: 'MY MATCHES', path: '/matches' },
    { icon: <BarChart3 />, label: 'LEADERBOARD', path: '/leaderboard' },
    { icon: <Wallet />, label: 'WITHDRAW', path: '/withdraw' },
    { icon: <CreditCard />, label: 'TRANSACTIONS', path: '/transactions' },
    { icon: <HelpCircle />, label: 'SUPPORT', path: '/support' },
  ];

  if (user?.isAdmin) {
    navItems.splice(0, 0, { icon: <ShieldCheck className="text-neon-yellow" />, label: 'ADMIN PANEL', path: '/admin' });
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-[#0a0a0a] border-r border-white/5 py-8">
      <div className="px-6 mb-12">
        <div className="relative group cursor-pointer">
          <div className="absolute -inset-1 bg-gradient-to-r from-neon-yellow to-neon-purple rounded-full blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-black rounded-xl p-4 flex items-center justify-center border border-white/10">
            <Zap className="text-neon-yellow fill-current" size={32} />
            <div className="ml-3">
              <h1 className="font-display font-black text-xs leading-none">ARISE</h1>
              <h1 className="font-display font-black text-lg tracking-tighter text-neon-yellow">RAIKOU</h1>
            </div>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.label}
              to={item.path} 
              className={`flex items-center gap-4 px-6 py-4 transition-all relative group overflow-hidden ${isActive ? 'text-neon-yellow drop-shadow-[0_0_8px_#facc15]' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
            >
              <div className={`transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 ${isActive ? 'scale-110' : ''}`}>
                {item.icon}
              </div>
              <span className="font-display font-bold text-[10px] tracking-widest">{item.label}</span>
              {isActive && (
                <>
                  <motion.div 
                    layoutId="activeNav"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-neon-yellow shadow-[0_0_15px_#facc15] z-10" 
                  />
                  <div className="absolute inset-0 bg-neon-yellow/5 z-0" />
                </>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-6 mt-8">
        <div className="glass-card bg-gradient-to-br from-neon-purple/20 to-transparent border-neon-purple/30 p-4 rounded-2xl relative overflow-hidden group">
          <div className="relative z-10">
            <h3 className="font-display font-black text-sm uppercase mb-2 italic">Play & Win</h3>
            <p className="text-[10px] text-white/70 mb-4 font-bold">Compete for real cash prizes daily.</p>
            <button className="w-full py-2 bg-neon-purple text-white rounded-lg font-bold text-[10px] tracking-widest hover:bg-neon-purple/80 transition-colors uppercase">
              Join Now
            </button>
          </div>
          <Flame size={60} className="absolute -right-4 -bottom-4 text-neon-purple/20 group-hover:scale-110 transition-transform" />
        </div>
      </div>
    </aside>
  );
};

const RightSidebar = ({ user, isOpen, onClose }: { user: UserProfile, isOpen?: boolean, onClose?: () => void }) => {
  const { logout, updateProfile } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user.name);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveName = async () => {
    if (!newName.trim() || newName === user.name) {
      setIsEditingName(false);
      return;
    }
    setIsSaving(true);
    try {
      await updateProfile({ name: newName });
      setIsEditingName(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <aside className={`fixed lg:sticky lg:top-0 right-0 h-screen w-80 bg-[#0a0a0a] border-l border-white/5 z-50 transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
      <div className="p-6 h-full flex flex-col">
        <div className="flex items-center justify-between lg:hidden mb-6">
          <h2 className="font-display font-bold">PROFILE</h2>
          <button onClick={onClose} className="p-2 hover:text-neon-yellow"><X /></button>
        </div>

        {/* Profile Info */}
        <div className="flex flex-col items-center mb-8 pt-4">
          <div className="relative mb-4 group">
            <div className="absolute -inset-1 bg-neon-yellow rounded-full blur opacity-0 group-hover:opacity-30 transition duration-500"></div>
            <img src={user.avatar} alt="Avatar" className="w-24 h-24 rounded-full border-2 border-white/10 p-1 relative" />
            <button 
              onClick={() => {
                setShowSettings(!showSettings);
                if (!showSettings) {
                  // Scroll settings into view if needed
                }
              }}
              className="absolute bottom-0 right-0 w-6 h-6 bg-[#121212] border border-white/10 rounded-full flex items-center justify-center text-[10px] cursor-pointer hover:bg-white/20"
            >
              ✎
            </button>
          </div>

          {isEditingName ? (
            <div className="flex items-center gap-2 mb-1">
              <input 
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-white/5 border border-neon-yellow/50 rounded-lg px-2 py-1 font-display font-black text-sm outline-none w-32"
                autoFocus
              />
              <button onClick={handleSaveName} disabled={isSaving} className="text-neon-yellow"><Check size={14} /></button>
              <button onClick={() => setIsEditingName(false)} className="text-white/30"><X size={14} /></button>
            </div>
          ) : (
            <h2 
              className="font-display font-black text-lg tracking-tight flex items-center gap-2 text-center cursor-pointer hover:text-neon-yellow transition-colors"
              onClick={() => setIsEditingName(true)}
            >
              {user.name} <Zap size={14} className="text-neon-yellow" />
            </h2>
          )}
          <p className="text-white/40 text-[10px] font-bold font-mono tracking-widest uppercase">UID: {user.uid}</p>
          
          <div className="flex flex-col gap-2 mt-4 items-center">
            <div className="flex gap-2">
              <div className="px-6 py-1.5 bg-white/5 rounded-full border border-white/10 flex items-center gap-2">
                <Zap size={12} className="text-neon-purple shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-neon-purple">LEVEL {user.level || 0}</span>
              </div>
            </div>
            
            {/* Level Progress Bar */}
            <div className="w-full max-w-[180px] mt-2">
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${((user.xp || 0) % 200) / 200 * 100}%` }}
                  className="h-full bg-neon-purple shadow-[0_0_15px_rgba(168,85,247,0.8)]"
                />
              </div>
              <p className="text-[7px] text-white/20 mt-2 font-bold uppercase tracking-tight text-center">
                Get Weekly Reward every 10 levels
              </p>
            </div>
          </div>
        </div>

        {/* Balance */}
        <Link to="/top-up" onClick={onClose} className="glass-card bg-[#121212] border-white/5 mb-8 neon-border-purple block transition-all hover:bg-white/5">
          <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-3">Balance</p>
          <div className="flex items-center justify-between mb-4">
            <p className="text-3xl font-display font-black">৳ <span className="text-neon-yellow neon-text-yellow">{user.balance}</span>.00</p>
            <Wallet className="text-white/20" size={32} />
          </div>
          <div className="w-full btn-secondary py-3 text-xs tracking-widest flex items-center justify-center gap-2 uppercase">
            <Plus size={16} /> Add Balance
          </div>
        </Link>

        {/* Quick Menu */}
        <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar">
          <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-2 px-1">Quick Menu</p>
          {[
            ...(user.isAdmin ? [{ icon: <ShieldCheck size={18} />, label: 'ADMIN PANEL', color: 'text-neon-yellow', path: '/admin' }] : []),
            { icon: <User size={18} />, label: 'PROFILE', color: 'text-neon-purple', path: '/profile' },
            { icon: <Wallet size={18} />, label: 'BALANCE', color: 'text-blue-400', path: '/top-up' },
            { icon: <History size={18} />, label: 'MY MATCHES', color: 'text-neon-purple', path: '/matches' },
            { icon: <BarChart3 size={18} />, label: 'LEADERBOARD', color: 'text-blue-400', path: '/leaderboard' },
          ].map(item => (
            <Link key={item.label} to={item.path} onClick={onClose} className="flex items-center justify-between p-4 bg-white/3 border border-white/5 rounded-xl hover:bg-white/10 transition-all group">
              <div className="flex items-center gap-4">
                <span className={item.color}>{item.icon}</span>
                <span className="text-xs font-bold tracking-widest">{item.label}</span>
              </div>
              <ChevronRight size={16} className="text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </Link>
          ))}

          <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mt-6 mb-2 px-1">Other Options</p>
          
          {/* Settings Section - Integrates the features here */}
          <div className="glass-card bg-white/3 border-white/5 mb-3 p-0 overflow-hidden">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-all group"
            >
              <div className="flex items-center gap-4">
                <span className="text-white/40"><SettingsIcon size={18} /></span>
                <span className="text-xs font-bold tracking-widest">SETTINGS</span>
              </div>
              <motion.div
                animate={{ rotate: showSettings ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight size={16} className="text-white/10 group-hover:text-white" />
              </motion.div>
            </button>

            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden border-t border-white/5 bg-black/20"
                >
                  <div className="p-4 space-y-6">
                    {/* Avatar Picker integration */}
                    <div className="space-y-3">
                      <p className="text-[8px] font-black uppercase tracking-widest text-white/20">Change Avatar</p>
                      <div className="grid grid-cols-4 gap-2">
                        {PREDEFINED_AVATARS.map((url) => (
                          <div 
                            key={url}
                            onClick={() => updateProfile({ avatar: url })}
                            className={`aspect-square rounded-lg overflow-hidden cursor-pointer border transition-all ${user.avatar === url ? 'border-neon-yellow p-0.5' : 'border-white/5 opacity-40 hover:opacity-100'}`}
                          >
                            <img src={url} alt="Av" className="w-full h-full rounded-md" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Language Selection */}
                    <div className="flex items-center justify-between">
                      <p className="text-[8px] font-black uppercase tracking-widest text-white/20">Language</p>
                      <select className="bg-[#0a0a0a] border border-white/10 rounded px-2 py-1 text-[10px] font-bold outline-none cursor-pointer">
                        <option>English</option>
                        <option>Bengali</option>
                      </select>
                    </div>

                    {/* Notifications */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold">Email Notifications</p>
                          <p className="text-[8px] text-white/20 font-black uppercase tracking-widest">Alerts via email</p>
                        </div>
                        <button 
                          onClick={() => setEmailNotif(!emailNotif)}
                          className={`w-8 h-4 rounded-full transition-all relative ${emailNotif ? 'bg-neon-yellow' : 'bg-white/10'}`}
                        >
                          <motion.div animate={{ x: emailNotif ? 18 : 2 }} className={`absolute top-0.5 w-3 h-3 rounded-full ${emailNotif ? 'bg-black' : 'bg-white/30'}`} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold">Push Notifications</p>
                          <p className="text-[8px] text-white/20 font-black uppercase tracking-widest">In-app banners</p>
                        </div>
                        <button 
                          onClick={() => setPushNotif(!pushNotif)}
                          className={`w-8 h-4 rounded-full transition-all relative ${pushNotif ? 'bg-neon-purple' : 'bg-white/10'}`}
                        >
                          <motion.div animate={{ x: pushNotif ? 18 : 2 }} className={`absolute top-0.5 w-3 h-3 rounded-full bg-white`} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {[
            { icon: <CreditCard size={18} />, label: 'TRANSACTIONS', path: '/transactions' },
            { icon: <History size={18} />, label: 'MY MATCHES', path: '/matches' },
            { icon: <LogOut size={18} />, label: 'LOGOUT', danger: true, action: async () => {
              await logout();
              window.location.href = '/';
            } },
          ].map(item => (
            <div 
              key={item.label} 
              onClick={async () => {
                if (item.action) await item.action();
                else if (item.path) window.location.href = item.path; 
                onClose?.();
              }}
              className="flex items-center justify-between p-4 bg-white/3 border border-white/5 rounded-xl hover:bg-white/10 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <span className={item.danger ? 'text-red-500' : 'text-white/40'}>{item.icon}</span>
                <span className={`text-xs font-bold tracking-widest ${item.danger ? 'text-red-500' : ''}`}>{item.label}</span>
              </div>
              <ChevronRight size={16} className="text-white/10 group-hover:text-white transition-all" />
            </div>
          ))}
        </div>

        {/* Ad Widget */}
        <div className="mt-8">
          <div className="relative rounded-2xl overflow-hidden aspect-[4/3] group cursor-pointer">
            <img src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format" alt="Ad" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-neon-purple via-neon-purple/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h4 className="font-display font-black text-sm uppercase leading-none mb-1">Top up now</h4>
              <p className="text-[10px] font-bold opacity-70 mb-3 italic">Get bonus diamonds</p>
              <button className="px-4 py-1.5 bg-neon-yellow text-black font-black text-[10px] rounded uppercase tracking-tighter shadow-xl">
                Top Up
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

const TournamentCard = ({ tournament, upcoming = false }: { tournament: Tournament, upcoming?: boolean, key?: string }) => {
  const isEvent = (tournament as any).sourceType === 'event';

  return (
    <Link to={`/tournament/${tournament.id}`} className="block h-full">
      <motion.div 
        whileHover={{ y: -8, scale: 1.02 }}
        className="glass-card relative overflow-hidden group bg-[#121212] border-white/5 hover:border-neon-yellow transition-all duration-500 h-full flex flex-col rounded-2xl shadow-2xl"
      >
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          <img 
            src={tournament.status === 'Completed' && tournament.winnerPhoto ? tournament.winnerPhoto : (tournament.image || (tournament.type === 'Squads' ? "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800" : "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=800"))} 
            alt={tournament.title} 
            className="w-full h-full object-cover transform scale-100 group-hover:scale-110 transition-transform duration-700 pointer-events-none" 
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent opacity-90" />
          
          {tournament.status === 'Completed' && tournament.winnerName && (
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black to-transparent z-20">
              <div className="flex items-center gap-2">
                <Trophy size={14} className="text-neon-yellow" strokeWidth={3} />
                <span className="text-[10px] font-black uppercase text-white tracking-widest italic truncate">
                  Champion: {tournament.winnerName}
                </span>
              </div>
            </div>
          )}
          
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 items-end">
            {upcoming ? (
              <span className="text-[10px] font-black px-4 py-1.5 bg-blue-500 text-white rounded-full uppercase tracking-widest border border-white/20 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                UPCOMING
              </span>
            ) : tournament.status === 'Completed' ? (
              <span className="text-[10px] font-black px-4 py-1.5 bg-white/10 text-white/50 rounded-full uppercase tracking-widest border border-white/10">
                COMPLETED
              </span>
            ) : tournament.status === 'Live' || tournament.status === 'Ongoing' ? (
              <span className="text-[10px] font-black px-4 py-1.5 bg-neon-purple text-white rounded-full uppercase tracking-widest border border-white/20 shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                ONGOING
              </span>
            ) : (
              <span className="hidden" />
            )}
            {!upcoming && tournament.status !== 'Completed' && !isEvent && tournament.slotsLeft === 0 && (
              <span className="text-[10px] font-black px-4 py-1.5 bg-neon-yellow text-black rounded-full uppercase tracking-widest shadow-[0_0_15px_rgba(250,204,21,0.5)]">
                FULL
              </span>
            )}
          </div>

          <div className="absolute bottom-4 left-4">
             <span className="text-[9px] font-black bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-white uppercase tracking-widest border border-white/10 shadow-lg">
               {tournament.type} • {(tournament as any).map || 'Classic'}
             </span>
          </div>
        </div>

        <div className="p-6 flex flex-col flex-grow space-y-6">
          <div className="space-y-1">
            <h3 className="font-display font-black text-2xl italic uppercase tracking-tight group-hover:text-neon-yellow transition-colors duration-300 leading-tight">
              {tournament.title}
            </h3>
            {tournament.caption && <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest line-clamp-1 italic">{tournament.caption}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 p-4 rounded-2xl bg-white/3 border border-white/5 group-hover:bg-white/5 transition-colors">
               <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Prize Pool</p>
               <p className="font-display font-black text-2xl italic text-neon-yellow drop-shadow-[0_0_8px_rgba(250,204,21,0.3)]">৳{tournament.prizePool}</p>
            </div>
            <div className="space-y-1 p-4 rounded-2xl bg-white/3 border border-white/5 text-right group-hover:bg-white/5 transition-colors">
               <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Entry Fee</p>
               <p className="font-display font-black text-2xl italic text-neon-purple drop-shadow-[0_0_8px_rgba(168,85,247,0.3)]">৳{tournament.entryFee}</p>
            </div>
          </div>

            {!isEvent && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                  <span className="text-white/40">Registered</span>
                  <span className="text-neon-yellow font-display">
                    {Math.max(0, (tournament.slotsTotal || 0) - (tournament.slotsLeft || 0))} / {tournament.slotsTotal || 48}
                  </span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ 
                      width: `${Math.min(100, Math.max(0, (((tournament.slotsTotal || 0) - (tournament.slotsLeft || 0)) / (tournament.slotsTotal || 48)) * 100))}%`,
                      backgroundColor: ((tournament.slotsTotal || 0) - (tournament.slotsLeft || 0)) / (tournament.slotsTotal || 48) > 0.8 
                        ? "#10b981" // Green
                        : ((tournament.slotsTotal || 0) - (tournament.slotsLeft || 0)) / (tournament.slotsTotal || 48) > 0.4
                        ? "#fbbf24" // Yellow
                        : "#facd15" // Neon Yellow
                    }}
                    className="h-full shadow-[0_0_10px_rgba(250,204,21,0.3)] transition-colors duration-500"
                  />
                </div>
              </div>
            )}

          <div className="mt-auto pt-2">
            <button 
              disabled={upcoming || tournament.slotsLeft === 0 || tournament.registrationOpen === false || tournament.status === 'Completed'}
              className={`w-full py-5 rounded-2xl font-display font-black text-sm uppercase tracking-[0.3em] transition-all duration-300 relative overflow-hidden group/btn ${
              upcoming || tournament.status === 'Completed' || (tournament.registrationOpen === false && !upcoming) || (!upcoming && tournament.slotsLeft === 0)
                ? 'bg-white/10 text-white/70 border border-white/10 cursor-not-allowed hover:bg-white/20' 
                : 'bg-neon-yellow text-black shadow-[0_0_30px_rgba(250,204,21,0.2)] hover:shadow-[0_0_50px_rgba(250,204,21,0.4)] hover:scale-[1.02] active:scale-95'
            }`}>
              <div className="relative z-10 flex items-center justify-center gap-2">
                {upcoming 
                  ? 'Coming Soon' 
                  : tournament.status === 'Completed'
                    ? 'Completed'
                    : tournament.registrationOpen === false 
                      ? 'Registration Closed' 
                      : tournament.slotsLeft === 0 
                        ? 'Fully Booked' 
                        : (isEvent ? 'View Event' : 'Participate Now')}
                {!upcoming && tournament.registrationOpen !== false && tournament.slotsLeft > 0 && tournament.status !== 'Completed' && <Zap size={14} className="group-hover/btn:animate-bounce" />}
              </div>
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
            </button>
          </div>
        </div>
      </motion.div>
    </Link>
  );
};

// Pages
const TournamentDetails = ({ tournaments }: { tournaments: Tournament[] }) => {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const tournament = tournaments.find(t => t.id === id);

  const [isRegistering, setIsRegistering] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isRegisteredForMatch, setIsRegisteredForMatch] = useState(false);

  useEffect(() => {
    const checkReg = async () => {
      if (profile && id) {
        try {
          const regs = await getTournamentRegistrations(id);
          const myReg = regs.find(r => r.userId === profile.uid);
          if (myReg) {
            setIsRegisteredForMatch(true);
            setTeamName(myReg.teamName || '');
            if (myReg.players && myReg.players.length > 0) {
              setPlayers(myReg.players);
            }
          } else {
            setIsRegisteredForMatch(false);
          }
        } catch (e) {
          console.error("Error checking registration:", e);
        }
      }
    };
    checkReg();
  }, [profile, id]);

  useEffect(() => {
    if (tournament && !isRegisteredForMatch) {
      const count = tournament.type === 'Solos' ? 1 : (tournament.type === 'Duos' ? 2 : 4);
      setPlayers(Array(count).fill(0).map(() => ({ gameUid: '', gameName: '', gameLevel: '' })));
    }
  }, [tournament, isRegisteredForMatch]);

  if (!tournament) {
    return (
      <PageWrapper>
        <div className="text-center py-20">
          <h2 className="font-display font-black text-2xl uppercase mb-4">Tournament Not Found</h2>
          <button onClick={() => navigate('/')} className="btn-primary px-8 py-3">Back to Home</button>
        </div>
      </PageWrapper>
    );
  }

  const isFull = tournament.slotsLeft === 0;

  const handlePlayerChange = (index: number, field: keyof PlayerInfo, value: string) => {
    const updated = [...players];
    updated[index] = { ...updated[index], [field]: value };
    setPlayers(updated);
  };

  const validateForm = () => {
    if ((tournament.type === 'Duos' || tournament.type === 'Squads') && !teamName.trim()) {
      setStatus({ type: 'error', message: 'Please enter a team name' });
      return false;
    }
    for (const p of players) {
      if (!p.gameUid.trim() || !p.gameName.trim() || !p.gameLevel.trim()) {
        setStatus({ type: 'error', message: 'Please fill all player fields' });
        return false;
      }
    }
    return true;
  };

  const handleRegister = async () => {
    if (!profile) {
      setStatus({ type: 'error', message: 'Please login to register' });
      return;
    }
    if (!validateForm()) return;

    setIsSubmitting(true);
    setStatus(null);

    try {
      const result = await registerForTournament({
        tournamentId: tournament.id,
        userId: profile.uid,
        userEmail: profile.email || '',
        userName: profile.name,
        teamName: tournament.type === 'Solos' ? undefined : teamName,
        players,
        entryFee: tournament.entryFee
      });

      if (result.success) {
        setStatus({ type: 'success', message: result.message });
        setTimeout(() => setIsRegistering(false), 2000);
      } else {
        setStatus({ type: 'error', message: result.message });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'An unexpected error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-8 pb-32">
        {/* Banner Section */}
        <section className="relative rounded-3xl overflow-hidden aspect-[21/9] group">
          <img 
            src={tournament.image || (tournament.type === 'Squads' ? "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format" : "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format")} 
            alt="Banner" 
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent z-10" />
          <div className="absolute inset-0 border border-white/5 rounded-3xl z-20" />
          
          <div className="relative z-20 h-full flex flex-col justify-end p-8 lg:p-12">
            <h1 className="font-display font-black text-4xl lg:text-6xl italic leading-none inline-block skew-x-[-10deg] mb-2 uppercase">
              {tournament.title}
            </h1>
            {tournament.caption && <p className="text-neon-yellow font-display font-black text-sm lg:text-lg italic uppercase tracking-wider drop-shadow-lg">{tournament.caption}</p>}
          </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {tournament.status === 'Completed' && tournament.winnerName && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card bg-gradient-to-br from-neon-yellow/10 to-transparent border-neon-yellow/20 overflow-hidden"
              >
                <div className="md:flex">
                  {tournament.winnerPhoto && (
                    <div className="md:w-1/3 aspect-video md:aspect-square relative flex-shrink-0">
                      <img 
                        src={tournament.winnerPhoto} 
                        alt={tournament.winnerName} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#121212] hidden md:block" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#121212] to-transparent md:hidden" />
                    </div>
                  )}
                  <div className="p-8 flex flex-col justify-center gap-4 flex-grow">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-neon-yellow/20 rounded-2xl shadow-[0_0_15px_rgba(250,204,21,0.2)]">
                        <Trophy className="text-neon-yellow" size={24} strokeWidth={3} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-neon-yellow uppercase tracking-[0.3em]">Champion Squad</p>
                        <h2 className="font-display font-black text-3xl lg:text-4xl italic uppercase tracking-tighter leading-none">
                          {tournament.winnerName}
                        </h2>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/3 border border-white/5 space-y-2">
                       <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Prize Won</span>
                          <span className="font-display font-black text-xl text-green-400 italic">৳{tournament.winnerPrize || tournament.prizePool}</span>
                       </div>
                       {tournament.winnerDetails && (
                         <p className="text-xs font-bold text-white/60 uppercase tracking-tight italic border-t border-white/5 pt-2 leading-relaxed">
                           "{tournament.winnerDetails}"
                         </p>
                       )}
                    </div>

                    <div className="flex items-center gap-2 px-4 py-2 bg-black/40 rounded-xl border border-white/5">
                       <CheckCircle2 className="text-green-500" size={14} />
                       <span className="text-[9px] font-black text-white/40 uppercase tracking-widest leading-none">
                         Verified Proof Match Record
                       </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {isRegistering ? (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  key="reg-form"
                  className="glass-card bg-[#121212] border-neon-yellow/20 p-8 space-y-8"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-black text-lg tracking-widest uppercase italic flex items-center gap-3 text-neon-yellow">
                      <Plus size={20} />
                      Your Team Details
                    </h3>
                    <button onClick={() => setIsRegistering(false)} className="text-white/40 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>

                  {status && (
                    <div className={`p-4 rounded-xl ${status.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/20' : 'bg-red-500/20 text-red-400 border border-red-500/20'} text-[10px] font-black uppercase tracking-widest`}>
                      {status.message}
                    </div>
                  )}

                  <div className="space-y-6">
                    {tournament.type !== 'Solos' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Team Name</label>
                        <input 
                          type="text" 
                          value={teamName}
                          onChange={(e) => setTeamName(e.target.value)}
                          readOnly={isRegisteredForMatch}
                          placeholder="ENTER TEAM NAME"
                          className={`w-full border border-white/10 rounded-xl px-4 py-4 text-sm focus:border-neon-yellow outline-none transition-all font-bold uppercase ${isRegisteredForMatch ? 'bg-white/5 opacity-70 cursor-not-allowed' : 'bg-white/5 hover:bg-white/10'}`}
                        />
                      </div>
                    )}

                    {players.map((p, i) => (
                      <div key={i} className="p-6 rounded-2xl bg-white/3 border border-white/5 space-y-4">
                        <p className="text-[9px] font-black text-neon-purple uppercase tracking-widest">PLAYER {i + 1} {tournament.type === 'Solos' ? '(YOU)' : ''}</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">Game Name</label>
                            <input 
                              type="text"
                              value={p.gameName}
                              onChange={(e) => handlePlayerChange(i, 'gameName', e.target.value)}
                              readOnly={isRegisteredForMatch}
                              className={`w-full border border-white/10 rounded-lg px-3 py-2 text-[11px] font-bold outline-none focus:border-neon-yellow ${isRegisteredForMatch ? 'bg-white/5 opacity-70 cursor-not-allowed' : 'bg-black/40 hover:bg-white/5 transition-all'}`}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">Game UID</label>
                            <input 
                              type="text"
                              value={p.gameUid}
                              onChange={(e) => handlePlayerChange(i, 'gameUid', e.target.value)}
                              readOnly={isRegisteredForMatch}
                              className={`w-full border border-white/10 rounded-lg px-3 py-2 text-[11px] font-bold outline-none focus:border-neon-yellow ${isRegisteredForMatch ? 'bg-white/5 opacity-70 cursor-not-allowed' : 'bg-black/40 hover:bg-white/5 transition-all'}`}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">Game Level</label>
                            <input 
                              type="text"
                              value={p.gameLevel}
                              onChange={(e) => handlePlayerChange(i, 'gameLevel', e.target.value)}
                              readOnly={isRegisteredForMatch}
                              className={`w-full border border-white/10 rounded-lg px-3 py-2 text-[11px] font-bold outline-none focus:border-neon-yellow ${isRegisteredForMatch ? 'bg-white/5 opacity-70 cursor-not-allowed' : 'bg-black/40 hover:bg-white/5 transition-all'}`}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Total Fee</p>
                        <p className="font-display font-black text-2xl text-neon-yellow">৳{tournament.entryFee}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Your Balance</p>
                        <p className={`font-display font-black text-lg ${(profile?.balance || 0) < tournament.entryFee ? 'text-red-500' : 'text-white'}`}>৳{profile?.balance || 0}</p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={handleRegister}
                      disabled={isRegisteredForMatch || isSubmitting || (profile?.balance || 0) < tournament.entryFee}
                      className={`btn-primary w-full py-5 text-sm flex items-center justify-center gap-3 ${isRegisteredForMatch || isSubmitting || (profile?.balance || 0) < tournament.entryFee ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                          PROCESSING...
                        </>
                      ) : isRegisteredForMatch ? (
                        'ALREADY REGISTERED'
                      ) : (
                        <>
                          CONFIRM REGISTRATION
                          <Zap size={18} />
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  key="info-content"
                  className="space-y-8"
                >
                  {/* "Access Granted" card for registered users with links */}
                  {isRegisteredForMatch && tournament.externalLink && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="glass-card bg-neon-yellow/10 border-neon-yellow/20 p-8 space-y-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-4 bg-neon-yellow text-black rounded-2xl">
                          <Zap size={24} />
                        </div>
                        <div>
                          <h3 className="font-display font-black text-xl italic uppercase tracking-tight">Access <span className="text-neon-yellow">Granted</span></h3>
                          <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">You are registered for this match!</p>
                        </div>
                      </div>
                      
                      <div className="bg-black/40 p-6 rounded-2xl border border-white/5 space-y-4">
                        <p className="text-xs font-bold text-white/40 uppercase tracking-widest text-center italic">
                          "Register and click the link for match information."
                        </p>
                        <a 
                          href={tournament.externalLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-3 w-full py-4 bg-neon-yellow text-black rounded-xl font-black text-xs uppercase tracking-widest hover:shadow-[0_0_30px_rgba(250,204,21,0.4)] transition-all"
                        >
                          Open Match Info Link
                          <ArrowRight size={16} />
                        </a>
                      </div>
                    </motion.div>
                  )}

                  {/* Quick Info Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="glass-card bg-[#121212] border-white/5 p-4 text-center">
                      <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1 text-center">Prize Pool</p>
                      <p className="font-display font-black text-xl text-neon-yellow">৳{tournament.prizePool}</p>
                    </div>
                    <div className="glass-card bg-[#121212] border-white/5 p-4 text-center">
                      <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1 text-center">Entry Fee</p>
                      <p className="font-display font-black text-xl">৳{tournament.entryFee}</p>
                    </div>
                    <div className="glass-card bg-[#121212] border-white/5 p-4 text-center">
                      <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1 text-center">Type</p>
                      <p className="font-display font-black text-xl">{tournament.type}</p>
                    </div>
                    <div className="glass-card bg-[#121212] border-white/5 p-4 text-center">
                      <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1 text-center">Map</p>
                      <p className="font-display font-black text-xl">{tournament.map || 'Bermuda'}</p>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="glass-card bg-[#121212] border-white/5 p-8">
                    <h3 className="font-display font-black text-lg tracking-widest uppercase italic mb-6 flex items-center gap-3">
                      <Newspaper className="text-neon-yellow" size={20} />
                      Tournament Details
                    </h3>
                    <div className="prose prose-invert max-w-none text-white/70 text-sm font-bold leading-relaxed whitespace-pre-wrap">
                      {tournament.description || "No detailed description provided for this tournament."}
                    </div>
                  </div>

                  {/* Rules */}
                  <div className="glass-card bg-[#121212] border-white/5 p-8">
                    <h3 className="font-display font-black text-lg tracking-widest uppercase italic mb-6 flex items-center gap-3">
                      <ShieldCheck className="text-neon-purple" size={20} />
                      Rules & Regulations
                    </h3>
                    <div className="prose prose-invert max-w-none text-white/70 text-sm font-bold leading-relaxed whitespace-pre-wrap">
                      {tournament.rules || "Standard rules apply. High-level competitive gameplay only. Emulators not allowed unless specified."}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            {/* Action Card */}
            <div className="glass-card bg-[#121212] border-neon-yellow/10 p-6 sticky top-8">
              <div className="mb-6">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Registration Status</p>
                <div className="flex justify-between items-end mb-2">
                  <p className="font-display font-black text-2xl">{tournament.slotsTotal - tournament.slotsLeft} <span className="text-white/20 text-sm">/ {tournament.slotsTotal}</span></p>
                  <p className="text-neon-yellow text-xs font-black uppercase">{isFull ? 'FULL' : `${tournament.slotsLeft} LEFT`}</p>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((tournament.slotsTotal - tournament.slotsLeft) / tournament.slotsTotal) * 100}%` }}
                    className="h-full bg-neon-yellow shadow-[0_0_10px_#facc15]" 
                  />
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40 font-bold uppercase tracking-widest">Starts At</span>
                  <span className="text-white font-black">{tournament.startTime}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40 font-bold uppercase tracking-widest">Game</span>
                  <span className="text-white font-black">{tournament.game || 'Free Fire'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40 font-bold uppercase tracking-widest">Platform</span>
                  <span className="text-white font-black">{tournament.platform || 'Mobile'}</span>
                </div>
                {tournament.perKill && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40 font-bold uppercase tracking-widest">Per Kill</span>
                    <span className="text-neon-purple font-black">৳{tournament.perKill}</span>
                  </div>
                )}
              </div>

              {tournament.status === 'Completed' ? (
                <button disabled className="w-full py-4 bg-white/5 text-white/20 rounded-2xl font-black text-xs uppercase tracking-widest border border-white/5 italic transform skew-x-[-10deg]">
                  COMPLETED
                </button>
              ) : isRegisteredForMatch ? (
                <button 
                  onClick={() => setIsRegistering(true)}
                  className="w-full py-4 bg-green-500/10 text-green-500 rounded-2xl font-black text-xs uppercase tracking-widest border border-green-500/20 italic transform skew-x-[-10deg] hover:bg-green-500/20 transition-all"
                >
                  REGISTERED
                </button>
              ) : isFull ? (
                <button disabled className="w-full py-4 bg-white/5 text-white/30 rounded-2xl font-black text-xs uppercase tracking-widest border border-white/5 italic transform skew-x-[-10deg]">
                  SLOTS FULL
                </button>
              ) : (
                <button 
                  onClick={() => setIsRegistering(true)}
                  disabled={isRegistering}
                  className={`btn-primary w-full py-4 text-xs font-black uppercase tracking-widest ${isRegistering ? 'opacity-50' : ''}`}
                >
                  {isRegistering ? 'REGISTRATION OPEN' : 'JOIN NOW'}
                </button>
              )}
              
              <p className="text-[8px] text-white/30 font-bold uppercase text-center mt-4 tracking-widest">
                * Available Balance: ৳{profile?.balance || 0}
              </p>
            </div>
            
            {/* Support Widget */}
            <div className="glass-card bg-neon-purple/5 border-neon-purple/20 p-6">
              <h4 className="text-[10px] font-black text-neon-purple uppercase tracking-widest mb-3">Need Help?</h4>
              <p className="text-[10px] font-bold text-white/60 mb-4 uppercase leading-relaxed">Join our discord or contact support for queries regarding this tournament.</p>
              <button className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

const AnnouncementsPage = ({ events, isLoading }: { events: GameEvent[], isLoading: boolean }) => {
  const filteredAnnouncements = events.filter(e => e.type === 'announcement' || e.type === 'upcoming' || e.status === 'Announcement');
  
  useEffect(() => {
    console.log('AnnouncementsPage Debug:', {
      totalEvents: events.length,
      filteredCount: filteredAnnouncements.length
    });
  }, [events, filteredAnnouncements]);

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-12 pb-32">
        <div className="text-center relative">
          <h1 className="font-display font-black text-4xl italic uppercase tracking-tight mb-2">Platform <span className="text-neon-yellow">Announcements</span></h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">News & Updates</p>
          
          <button 
            onClick={() => window.location.reload()}
            className="absolute top-0 right-0 p-2 text-white/20 hover:text-neon-yellow transition-colors"
            title="Refresh Data"
          >
            <TrendingUp size={20} className="rotate-90" />
          </button>
        </div>

        <div className="grid gap-8">
          {isLoading ? (
            <div className="flex flex-col gap-8">
              {[1, 2].map(i => (
                <div key={i} className="glass-card bg-[#121212] border-white/5 h-64 animate-pulse relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/5" />
                </div>
              ))}
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="glass-card bg-[#121212] border-white/5 p-20 text-center">
              <p className="text-white/20 font-black uppercase tracking-widest italic">No announcements or updates currently scheduled</p>
            </div>
          ) : (
            filteredAnnouncements.map((event) => {
              const isClickable = !!event.link;
              const CardContent = (
                <div className="grid md:grid-cols-5 gap-0">
                  <div className="md:col-span-2 aspect-video md:aspect-auto relative overflow-hidden bg-white/5">
                    <img 
                      src={event.image || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800"} 
                      alt={event.title} 
                      className={`w-full h-full object-cover transition-all duration-700 ${event.image ? 'opacity-50 group-hover:opacity-100 group-hover:scale-110' : 'opacity-20'}`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#121212] via-transparent to-transparent" />
                  </div>
                  <div className="md:col-span-3 p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                        (event.type === 'upcoming' || event.status === 'Upcoming') ? 'bg-blue-500' : 
                        (event.type === 'ongoing' || event.status === 'Ongoing') ? 'bg-red-500' : 
                        (event.type === 'announcement' || event.status === 'Announcement') ? 'bg-neon-purple' : 'bg-white/20'
                      }`}>
                        {event.type === 'upcoming' ? 'UPCOMING' : 
                         event.type === 'ongoing' ? 'ONGOING' : 
                         event.type === 'announcement' ? 'ANNOUNCEMENT' : 
                         event.status.toUpperCase()}
                      </span>
                      {event.date && (
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{formatDate(event.date)}</span>
                      )}
                    </div>
                    <h3 className="font-display font-black text-2xl italic uppercase mb-2 group-hover:text-neon-yellow transition-colors">
                      {event.title === 'Announcement' || !event.title ? 'Latest Update' : event.title}
                    </h3>
                    <p className="text-sm text-white/70 font-bold leading-relaxed mb-6">{event.description}</p>
                    
                    {event.link && (
                      <div className="inline-flex items-center gap-2 text-neon-yellow font-display font-black text-xs uppercase tracking-widest group-hover:gap-4 transition-all">
                        View Details <ArrowRight size={16} />
                      </div>
                    )}
                  </div>
                </div>
              );

              return (
                <motion.div 
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className={`glass-card bg-[#121212] border-white/5 overflow-hidden group hover:border-neon-yellow/30 transition-all duration-500 ${isClickable ? 'cursor-pointer hover:shadow-[0_0_50px_rgba(250,204,21,0.1)]' : ''}`}
                >
                  {isClickable ? (
                    <a href={event.link} target="_blank" rel="noopener noreferrer">
                      {CardContent}
                    </a>
                  ) : (
                    CardContent
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </PageWrapper>
  );
};

const Home = ({ onOpenSidebar, notifications, onToggleNotifications, tournaments, events, heroBanners, isLoading }: { 
  onOpenSidebar: () => void, 
  notifications: Notification[],
  onToggleNotifications: () => void,
  tournaments: Tournament[],
  events: GameEvent[],
  heroBanners: HeroBanner[],
  isLoading: boolean
}) => {
  const unreadCount = notifications.filter(n => !n.read).length;
  const [filterType, setFilterType] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('Default');

  const upcomingTournaments = tournaments.filter(t => t.status === 'Upcoming');
  const ongoingTournaments = tournaments.filter(t => t.status === 'Live' || t.status === 'Ongoing' || (!t.status && !upcomingTournaments.includes(t)));
  
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const activeBanners = heroBanners.filter(b => b.isActive);

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentHeroIndex(prev => (prev + 1) % activeBanners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeBanners.length]);
  const completedTournaments = tournaments.filter(t => t.status === 'Completed');

  // Ongoing Section (Home): show posts where type === "ongoing" (+ entries from tournaments)
  const combinedOngoing = [
    ...ongoingTournaments.map(t => ({ ...t, sourceType: 'tournament' as const })),
    ...events.filter(e => e.type === 'ongoing' || e.status === 'Ongoing' || e.status === 'Live').map(e => ({
      id: e.id,
      title: e.title,
      image: e.image,
      entryFee: e.entryFee || 0,
      prizePool: e.prizePool || 0,
      slotsTotal: 100,
      slotsLeft: 100,
      startTime: e.date || 'TBA',
      type: 'Solos' as const,
      status: e.status as any,
      description: e.description,
      sourceType: 'event' as const
    } as any))
  ];

  // Upcoming Section (Home): show posts where type === "upcoming" (+ entries from tournaments)
  const combinedUpcoming = [
    ...upcomingTournaments.map(t => ({ ...t, sourceType: 'tournament' as const })),
    ...events.filter(e => e.type === 'upcoming' || e.status === 'Upcoming').map(e => ({
      id: e.id,
      title: e.title,
      image: e.image,
      entryFee: e.entryFee || 0,
      prizePool: e.prizePool || 0,
      slotsTotal: 100,
      slotsLeft: 100,
      startTime: e.date || 'TBA',
      type: 'Solos' as const,
      status: e.status as any,
      description: e.description,
      sourceType: 'event' as const
    } as any))
  ];

  const combinedCompleted = [
    ...completedTournaments.map(t => ({ ...t, sourceType: 'tournament' as const })),
    ...events.filter(e => e.status === 'Completed').map(e => ({
      id: e.id,
      title: e.title,
      image: e.image,
      entryFee: e.entryFee || 0,
      prizePool: e.prizePool || 0,
      slotsTotal: 100,
      slotsLeft: 100,
      startTime: e.date || 'TBA',
      type: 'Solos' as const,
      status: e.status as any,
      description: e.description,
      sourceType: 'event' as const
    } as any))
  ];

  const processTournaments = (list: any[]) => {
    let result = [...list];
    if (filterType !== 'All') {
      result = result.filter(t => t.type === filterType);
    }
    
    if (sortBy === 'Prize') {
      result.sort((a, b) => b.prizePool - a.prizePool);
    } else if (sortBy === 'Entry') {
      result.sort((a, b) => a.entryFee - b.entryFee);
    } else {
      // Default latest first
      result.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
        const timeB = b.updatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
    }
    return result;
  };

  const filteredTournaments = processTournaments(combinedOngoing);
  const filteredUpcoming = processTournaments(combinedUpcoming);
  const filteredCompleted = processTournaments(combinedCompleted);

  const announcements = events.filter(e => e.type === 'announcement' || e.type === 'upcoming' || e.status === 'Announcement');

  return (
    <PageWrapper>
      {/* Announcements Ticker */}
      {announcements.length > 0 && (
        <div className="mb-8 overflow-hidden bg-white/5 border-y border-white/5 py-3 relative">
          <div className="flex whitespace-nowrap animate-marquee">
            {[...announcements, ...announcements].map((anno, idx) => (
              <div key={`${anno.id}-${idx}`} className="flex items-center gap-4 px-8">
                <span className={`flex-shrink-0 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${
                  (anno.type === 'upcoming' || anno.status === 'Upcoming') ? 'bg-blue-500' : 'bg-neon-purple'
                }`}>
                  { (anno.type === 'upcoming' || anno.status === 'Upcoming') ? 'UPCOMING' : 'ANNOUNCEMENT' }
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/80">{anno.title}</span>
                <span className="text-white/20">•</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header Mobile */}
      <div className="flex items-center justify-between mb-8 lg:hidden">
        <button onClick={onOpenSidebar}>
          <Menu className="text-white" />
        </button>
        <div className="flex items-center gap-2">
          <Zap className="text-neon-yellow fill-current" size={24} />
          <span className="font-display font-black text-lg text-neon-yellow">RAIKOU</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-neon-yellow transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search Tournament..." 
              className="bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs font-bold tracking-widest focus:outline-none focus:border-neon-yellow/50 focus:bg-white/10 transition-all w-48 focus:w-64"
            />
          </div>
          <button onClick={onToggleNotifications} className="relative p-2 hover:bg-white/5 rounded-lg transition-colors">
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[8px] font-black flex items-center justify-center border-2 border-[#0a0a0a] animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>
          <button className="px-3 py-1.5 bg-indigo-600 rounded-lg text-[10px] font-black">DISCORD</button>
        </div>
      </div>

      {/* Hero */}
      {activeBanners.length > 0 ? (
        <section className="relative rounded-3xl overflow-hidden mb-12 aspect-[21/9] group border border-white/5">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeBanners[currentHeroIndex].id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute inset-0"
            >
              <img 
                src={activeBanners[currentHeroIndex].image} 
                alt={activeBanners[currentHeroIndex].title} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent z-10" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent z-10" />
              
              <div className="relative z-20 h-full flex flex-col justify-center p-8 lg:p-12">
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mb-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                      activeBanners[currentHeroIndex].type === 'Live' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 
                      activeBanners[currentHeroIndex].type === 'Ad' ? 'bg-neon-yellow text-black' : 
                      'bg-neon-purple'
                    }`}>
                      {activeBanners[currentHeroIndex].type}
                    </span>
                  </div>
                  <h1 className="font-display font-black text-3xl md:text-5xl lg:text-6xl italic leading-tight inline-block skew-x-[-10deg] uppercase">
                    {activeBanners[currentHeroIndex].title}
                  </h1>
                </motion.div>
                <p className="text-[10px] md:text-xs lg:text-sm font-bold text-white/70 max-w-md mb-8 uppercase tracking-[0.2em] leading-relaxed line-clamp-2">
                  {activeBanners[currentHeroIndex].subtitle}
                </p>
                {activeBanners[currentHeroIndex].link && (
                  <div>
                    <motion.a 
                      href={activeBanners[currentHeroIndex].link}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.1, rotate: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className="btn-primary px-8 md:px-12 py-3 md:py-4 text-xs md:text-sm inline-block"
                    >
                      {activeBanners[currentHeroIndex].buttonText || 'WATCH NOW'}
                    </motion.a>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Dots Indicator */}
          {activeBanners.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-2">
              {activeBanners.map((_, i) => (
                <button 
                  key={i}
                  onClick={() => setCurrentHeroIndex(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === currentHeroIndex ? 'w-8 bg-neon-yellow shadow-[0_0_10px_#facc15]' : 'w-1.5 bg-white/20 hover:bg-white/40'}`}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="relative rounded-3xl overflow-hidden mb-12 aspect-[21/9] group">
          <motion.img 
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 10, repeat: Infinity, repeatType: "reverse" }}
            src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format" 
            alt="Banner" 
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent z-10" />
          <div className="absolute inset-0 border border-white/5 rounded-3xl z-20 group-hover:border-neon-yellow/10 transition-colors duration-500" />
          
          <div className="relative z-20 h-full flex flex-col justify-center p-8 lg:p-12">
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="mb-4"
            >
              <h1 className="font-display font-black text-5xl lg:text-7xl italic leading-none inline-block skew-x-[-10deg]">
                ARISE<br />
                <span className="text-neon-yellow drop-shadow-[0_0_15px_#facc15] neon-text-yellow">TOURNAMENT</span>
              </h1>
              <p className="font-display font-black text-lg lg:text-2xl mt-2 italic skew-x-[-10deg] text-neon-purple drop-shadow-[0_0_10px_#6a00ff]">LIVE NOW!</p>
            </motion.div>
            <p className="text-xs lg:text-sm font-bold text-white/70 max-w-md mb-8 uppercase tracking-[0.2em] leading-relaxed">
              COMPETE • SURVIVE • WIN
            </p>
          </div>
        </section>
      )}

      {/* Filters & Sorting */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 items-center">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full md:w-auto">
          <Filter size={16} className="text-neon-yellow shrink-0" />
          <div className="flex gap-2">
            {['All', 'Solos', 'Duos', 'Squads'].map(type => (
              <button 
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all shrink-0 ${filterType === type ? 'bg-neon-yellow text-black shadow-[0_0_10px_rgba(250,204,21,0.4)]' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 md:ml-auto w-full md:w-auto">
          <BarChart3 size={16} className="text-neon-purple shrink-0" />
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full md:w-auto bg-[#121212] border border-white/10 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer focus:border-neon-purple transition-colors"
          >
            <option value="Default">Default View</option>
            <option value="Prize">Highest Prize Pool</option>
            <option value="Entry">Entry Fee: Low to High</option>
          </select>
        </div>
      </div>

      {/* Features Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {[
          { icon: <Target className="text-neon-purple" />, label: "FAST & FAIR", sub: "Matches" },
          { icon: <Trophy className="text-neon-purple" />, label: "REAL CASH", sub: "Prizes" },
          { icon: <ShieldCheck className="text-neon-purple" />, label: "PROTECTION", sub: "Anti-Cheat" },
          { icon: <Headphones className="text-neon-purple" />, label: "24/7", sub: "Support" },
        ].map(item => (
          <div key={item.label} className="glass-card bg-[#121212] border-white/5 flex flex-col items-center justify-center text-center p-4">
            <div className="bg-white/5 p-3 rounded-2xl mb-3">{item.icon}</div>
            <h4 className="font-display font-black text-[10px] tracking-widest">{item.label}</h4>
            <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Section: Ongoing */}
      {filteredTournaments.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <Zap className="text-neon-yellow" size={16} />
              <h2 className="font-display font-black text-sm tracking-widest uppercase italic">Ongoing Tournaments</h2>
            </div>
            <Link to="/announcements" className="text-[10px] font-black text-white/30 hover:text-white uppercase tracking-tighter">View All</Link>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {isLoading ? (
              Array(3).fill(0).map((_, i) => <SkeletonCard key={i} />)
            ) : (
              filteredTournaments.map(t => <TournamentCard key={t.id} tournament={t} />)
            )}
          </div>
        </section>
      )}

      {/* Section: Upcoming */}
      {filteredUpcoming.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <Zap className="text-neon-yellow" size={16} />
              <h2 className="font-display font-black text-sm tracking-widest uppercase italic">Upcoming Tournaments</h2>
            </div>
            <Link to="/announcements" className="text-[10px] font-black text-white/30 hover:text-white uppercase tracking-tighter">View All</Link>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {isLoading ? (
              Array(3).fill(0).map((_, i) => <SkeletonCard key={i} />)
            ) : (
              filteredUpcoming.map(t => <TournamentCard key={t.id} tournament={t} upcoming />)
            )}
          </div>
        </section>
      )}

      {/* Section: Completed */}
      {filteredCompleted.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <Check className="text-neon-yellow" size={16} />
              <h2 className="font-display font-black text-sm tracking-widest uppercase italic">Completed Tournaments</h2>
            </div>
            <Link to="/announcements" className="text-[10px] font-black text-white/30 hover:text-white uppercase tracking-tighter">View All</Link>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {isLoading ? (
              Array(3).fill(0).map((_, i) => <SkeletonCard key={i} />)
            ) : (
              filteredCompleted.map(t => <TournamentCard key={t.id} tournament={t} />)
            )}
          </div>
        </section>
      )}

      {/* Why Choose Section */}
      <section className="py-12 border-t border-white/5">
        <div className="flex items-center justify-center gap-4 mb-12">
          <Zap className="text-neon-yellow" />
          <h2 className="font-display font-black text-lg tracking-widest uppercase italic">Why Choose Arise Raikou?</h2>
          <Zap className="text-neon-yellow" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: <Plus className="rotate-45" />, title: "INSTANT PAYOUTS", desc: "Win and get paid instantly" },
            { icon: <ShieldCheck />, title: "100% SAFE", desc: "Fair Play & Secure" },
            { icon: <Diamond />, title: "EASY TOP UP", desc: "Quick Diamond Top Up" },
            { icon: <Headphones />, title: "24/7 SUPPORT", desc: "We are here for you" },
          ].map(box => (
            <div key={box.title} className="text-center group">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-neon-purple/80 to-neon-purple flex items-center justify-center mb-4 shadow-xl group-hover:scale-110 transition-transform">
                {box.icon}
              </div>
              <h4 className="font-display font-black text-[10px] tracking-widest mb-1">{box.title}</h4>
              <p className="text-[8px] font-bold text-white/40 uppercase">{box.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="py-12 text-center border-t border-white/5">
         <p className="text-[8px] text-white/30 font-black tracking-widest">© 2024 ARISE RAIKOU. ALL RIGHTS RESERVED.</p>
      </footer>
    </PageWrapper>
  );
};

// Placeholder Pages
const TopUp = () => {
  const { profile } = useAuth();
  const [amount, setAmount] = useState<string>('');
  const [trxId, setTrxId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const methods = [
    { id: 'bikash', name: 'bKash', color: 'bg-[#e2136e]', number: '01908182961' },
    { id: 'nogod', name: 'Nagad', color: 'bg-[#f7941d]', number: '01908182961' },
    { id: 'rocket', name: 'Rocket', color: 'bg-[#8c3494]', number: '01908182961' },
  ];

  const handleVerify = async () => {
    const numAmount = Number(amount);
    if (!trxId || !numAmount || numAmount <= 0) {
      setStatus({ type: 'error', message: 'Please enter TrxID and Amount correctly' });
      return;
    }

    setIsVerifying(true);
    setStatus(null);
    try {
      const redeemResult = await redeemVerifiedCode(trxId.trim(), numAmount, profile?.uid || '');
      
      if (redeemResult.success) {
        setStatus({ type: 'success', message: redeemResult.message });
        setTrxId('');
        setAmount('');
      } else {
        setStatus({ 
          type: 'error', 
          message: redeemResult.message || 'Invalid Transaction ID or Amount. Auto-Rejected.' 
        });
      }
    } catch (err) {
      console.error('Verification error:', err);
      setStatus({ type: 'error', message: getErrorMessage(err) || 'Verification failed. Try again.' });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto space-y-8 pb-32">
        <div className="text-center">
          <h1 className="font-display font-black text-3xl tracking-tight uppercase italic mb-2">INSTANT <span className="text-neon-yellow">TOP-UP</span></h1>
          <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.3em]">Automatic Verification System</p>
        </div>

        {/* Transaction Entry */}
        <div className="glass-card bg-[#121212] border-white/5 p-8 space-y-6">
          <div className="space-y-4">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20">ENTER TRANSACTION ID (TRXID)</p>
            <div className="bg-black/40 border border-white/5 rounded-2xl p-4">
              <input 
                type="text" 
                value={trxId}
                onChange={(e) => setTrxId(e.target.value)}
                placeholder="TRXID-HERE"
                className="w-full bg-transparent text-center font-display font-black text-3xl tracking-widest outline-none placeholder:text-white/5 text-neon-yellow"
              />
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20">ENTER AMOUNT (৳)</p>
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 font-display font-black text-xl outline-none focus:border-neon-yellow transition-all text-white text-center"
            />
          </div>

          {status && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl text-center text-[10px] font-black uppercase tracking-widest ${status.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}
            >
              {status.message}
            </motion.div>
          )}

          <button 
            onClick={handleVerify}
            disabled={isVerifying || !trxId || !amount}
            className="btn-primary w-full py-5 text-xs tracking-widest group"
          >
            {isVerifying ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                VERIFYING...
              </div>
            ) : (
              'VERIFY TRANSACTION'
            )}
          </button>
        </div>

        {/* Instructions */}
        <div className="glass-card bg-[#121212] border-white/5 p-8">
          <h3 className="font-display font-black text-sm tracking-widest uppercase italic mb-6 border-b border-white/5 pb-4">How to Top-up</h3>
          <div className="space-y-6">
            {methods.map((m, i) => (
              <div key={m.id} className="flex items-center justify-between p-4 bg-white/3 rounded-xl border border-white/5">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-lg ${m.color} flex items-center justify-center text-[10px] font-black`}>
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-bold text-xs uppercase tracking-tight">{m.name} Personal</p>
                    <p className="font-mono text-sm text-white/40 tracking-widest">{m.number}</p>
                  </div>
                </div>
                <button 
                  onClick={() => navigator.clipboard.writeText(m.number)}
                  className="p-2 bg-white/5 rounded-lg hover:bg-neon-yellow hover:text-black transition-all"
                >
                  <Copy size={14} />
                </button>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-white/30 font-bold uppercase mt-6 text-center leading-relaxed">
            Send Money to any of the numbers above. <br/> 
            Once successful, copy the <span className="text-neon-yellow">Transaction ID</span> and verify above. <br/>
            Verification is <span className="text-neon-purple">Instant & Automated</span>.
          </p>
        </div>
      </div>
    </PageWrapper>
  );
};
const Withdraw = () => {
  const { profile } = useAuth();
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<string>('');
  const [number, setNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const methods = [
    { id: 'bikash', name: 'bKash', color: 'bg-[#e2136e]' },
    { id: 'nogod', name: 'Nagad', color: 'bg-[#f7941d]' },
    { id: 'rocket', name: 'Rocket', color: 'bg-[#8c3494]' },
  ];

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    
    if (!profile) return;
    if (numAmount < 100) {
      setStatus({ type: 'error', message: 'Minimum withdrawal amount is ৳100' });
      return;
    }
    if (profile.balance < numAmount) {
      setStatus({ type: 'error', message: 'Insufficient balance' });
      return;
    }
    if (!method || !number) {
      setStatus({ type: 'error', message: 'Please select method and enter number' });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);
    try {
      await createWithdrawalRequest({
        userId: profile.uid,
        userName: profile.name,
        amount: numAmount,
        method,
        number
      });
      setStatus({ type: 'success', message: 'Withdrawal request submitted successfully! Balance deducted.' });
      setAmount('');
      setNumber('');
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'Failed to submit request' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageWrapper>
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex p-4 bg-neon-purple/20 rounded-2xl mb-4">
            <Wallet className="text-neon-purple" size={32} />
          </div>
          <h1 className="font-display font-black text-3xl italic tracking-tight uppercase">Withdraw <span className="text-neon-yellow">Funds</span></h1>
          <p className="text-xs text-white/40 font-bold tracking-widest mt-2">Convert your winnings to real cash</p>
        </div>

        <div className="glass-card bg-[#121212] border-white/5 p-8 relative overflow-hidden mb-8">
          <div className="absolute top-0 right-0 p-4">
            <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Available</p>
            <p className="font-display font-black text-xl text-neon-yellow">৳{profile?.balance}</p>
          </div>

          <form onSubmit={handleWithdraw} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Withdrawal Amount (৳)</label>
              <input 
                required
                type="number" 
                min="100"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Enter amount (Min ৳100)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 outline-none focus:border-neon-yellow font-bold text-lg"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Select Method</label>
              <div className="grid grid-cols-3 gap-3">
                {methods.map(m => (
                  <button 
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.name)}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${method === m.name ? 'border-neon-yellow bg-neon-yellow/10' : 'border-white/5 bg-white/3'}`}
                  >
                    <div className={`w-8 h-8 rounded-lg ${m.color}`} />
                    <span className="text-[10px] font-black uppercase tracking-tighter">{m.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40">{method || 'Method'} Number</label>
              <input 
                required
                type="text" 
                value={number}
                onChange={e => setNumber(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 outline-none focus:border-neon-yellow font-bold"
              />
            </div>

            {status && (
              <div className={`p-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-center ${status.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                {status.message}
              </div>
            )}

            <button 
              type="submit"
              disabled={isSubmitting || !amount || !method || !number}
              className="w-full py-4 bg-neon-purple text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(106,0,255,0.3)] disabled:opacity-50"
            >
              {isSubmitting ? 'Processing...' : 'Request Withdrawal'}
            </button>
          </form>
        </div>

        <div className="p-6 bg-white/3 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-neon-yellow" size={20} />
            <h3 className="text-xs font-black uppercase tracking-widest">Withdrawal Terms</h3>
          </div>
          <ul className="space-y-3">
            {[
              "Withdrawals are processed within 24 hours.",
              "Minimum withdrawal amount is ৳100.",
              "Balance is deducted immediately upon request.",
              "If rejected, the amount will be refunded to your balance.",
              "Make sure your mobile number is correct."
            ].map((text, i) => (
              <li key={i} className="flex gap-3 items-start">
                <div className="w-1 h-1 bg-neon-purple rounded-full mt-1.5 shrink-0" />
                <p className="text-[10px] font-bold text-white/40 leading-relaxed uppercase">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PageWrapper>
  );
};

const MyMatches = () => {
  const { profile } = useAuth();
  const [registrations, setRegistrations] = useState<(TournamentRegistration & { tournament?: Tournament })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMyMatches = async () => {
      if (profile) {
        try {
          const data = await getUserRegistrations(profile.uid);
          setRegistrations(data);
        } catch (error) {
          console.error(error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchMyMatches();
  }, [profile]);

  if (isLoading) return <LoadingScreen />;

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="font-display font-black text-3xl italic tracking-tight uppercase">My <span className="text-neon-yellow">Matches</span></h1>
            <p className="text-xs text-white/40 font-bold tracking-widest mt-2">TRACK YOUR TOURNAMENT REGISTRATIONS</p>
          </div>
          <div className="flex gap-4">
            <div className="glass-card bg-white/5 border-white/10 px-6 py-4 rounded-2xl text-center">
              <p className="text-[8px] font-black text-white/40 uppercase mb-1">Registered</p>
              <p className="font-display font-black text-xl text-neon-yellow">{registrations.filter(r => r.status === 'Registered').length}</p>
            </div>
            <div className="glass-card bg-white/5 border-white/10 px-6 py-4 rounded-2xl text-center">
              <p className="text-[8px] font-black text-white/40 uppercase mb-1">Total</p>
              <p className="font-display font-black text-xl text-white">{registrations.length}</p>
            </div>
          </div>
        </div>

        {registrations.length === 0 ? (
          <div className="glass-card border-dashed border-white/10 p-20 text-center">
            <History className="text-white/10 mx-auto mb-6" size={48} />
            <h3 className="font-display font-black text-xl uppercase italic mb-2">No Registrations Yet</h3>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-8">You haven't joined any tournaments yet</p>
            <Link to="/" className="inline-flex py-4 px-8 bg-neon-purple text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all">
              Browse Tournaments
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {registrations.map((reg) => (
              <motion.div 
                key={reg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card bg-[#121212] border-white/10 p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-white/20 transition-all group"
              >
                <div className="flex items-center gap-6 w-full">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/5 shrink-0 border border-white/10">
                    {reg.tournament?.image ? (
                      <img src={reg.tournament.image} alt={reg.tournament.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20">
                        <Trophy size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                        reg.status === 'Registered' ? 'bg-green-500/20 text-green-500' : 
                        reg.status === 'Refunded' ? 'bg-red-500/20 text-red-500' :
                        'bg-white/10 text-white/40'
                      }`}>
                        {reg.status}
                      </span>
                      {reg.tournament?.category && (
                        <span className="px-2 py-0.5 bg-neon-purple/20 text-neon-purple rounded text-[8px] font-black uppercase">
                          {reg.tournament.category}
                        </span>
                      )}
                    </div>
                    <h4 className="font-display font-black text-lg italic uppercase tracking-tight group-hover:text-neon-yellow transition-colors truncate max-w-[200px] md:max-w-md">
                      {reg.tournament?.title || 'Unknown Tournament'}
                    </h4>
                    <div className="flex items-center gap-4 mt-2">
                       <div className="flex items-center gap-1.5 text-white/40">
                         <Calendar size={12} />
                         <span className="text-[10px] font-bold uppercase tracking-tight">{reg.tournament?.date ? (typeof reg.tournament.date === 'string' ? reg.tournament.date : new Date((reg.tournament.date as any).seconds * 1000).toLocaleDateString()) : 'TBD'}</span>
                       </div>
                       <div className="flex items-center gap-1.5 text-white/40">
                         <Clock size={12} />
                         <span className="text-[10px] font-bold uppercase tracking-tight">{reg.tournament?.time || 'TBD'}</span>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto shrink-0">
                  {reg.status === 'Registered' && reg.tournament?.externalLink && (
                    <a 
                      href={reg.tournament.externalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 md:flex-none py-3 px-6 bg-neon-yellow text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:shadow-[0_0_20px_rgba(250,204,21,0.3)] transition-all flex items-center justify-center gap-2"
                    >
                      Match Info <ExternalLink size={14} />
                    </a>
                  )}
                  <Link 
                    to={`/tournament/${reg.tournamentId}`}
                    className="flex-1 md:flex-none py-3 px-6 bg-white/5 hover:bg-white/10 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all text-center border border-white/5"
                  >
                    View Detail
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

const Placeholder = ({ title }: { title: string }) => (
  <PageWrapper>
    <h1 className="font-display font-bold text-2xl mb-8 tracking-tight italic uppercase">{title}</h1>
    <div className="glass-card flex items-center justify-center min-h-[300px]">
      <div className="text-center text-white/20">
        <Zap size={64} className="mx-auto mb-4 opacity-10" />
        <p className="font-display font-black tracking-widest text-[10px]">CONTENT COMING SOON</p>
      </div>
    </div>
  </PageWrapper>
);

const NotificationPanel = ({ isOpen, onClose, notifications, onMarkAsRead }: { 
  isOpen: boolean, 
  onClose: () => void, 
  notifications: Notification[],
  onMarkAsRead: (id: string) => void
}) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
        />
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed top-0 right-0 h-screen w-full max-w-sm bg-[#0a0a0a] border-l border-white/5 z-[70] shadow-2xl p-6 overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Bell className="text-neon-yellow" size={24} />
              <h2 className="font-display font-black text-xl tracking-tight uppercase italic">Notifications</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-white/20">
                <Bell size={48} className="mx-auto mb-4 opacity-10" />
                <p className="font-bold uppercase tracking-widest text-xs">No new updates</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  onClick={() => onMarkAsRead(n.id)}
                  className={`glass-card p-4 items-start gap-4 flex cursor-pointer transition-all ${!n.read ? 'border-neon-purple/50 bg-neon-purple/5' : 'border-white/5'}`}
                >
                  <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${!n.read ? 'bg-neon-yellow shadow-[0_0_8px_#facc15]' : 'bg-transparent'}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                        n.type === 'Match' ? 'bg-blue-500/20 text-blue-400' :
                        n.type === 'Result' ? 'bg-green-500/20 text-green-400' :
                        n.type === 'Wallet' ? 'bg-neon-yellow/20 text-neon-yellow' :
                        n.type === 'System' ? 'bg-orange-500/20 text-orange-400' : 'bg-neon-purple/20 text-neon-purple'
                      }`}>
                        {n.type}
                      </span>
                      <span className="text-[8px] font-bold text-white/40 uppercase">{n.date}</span>
                    </div>
                    <h4 className="font-bold text-sm mb-1">{n.title}</h4>
                    <p className="text-xs text-white/60 leading-relaxed">{n.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

const Transactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    // Safety timeout: if loading takes > 5s, stop spinner
    const timer = setTimeout(() => {
      if (mounted) setIsLoading(false);
    }, 5000);
    
    const load = async () => {
      // 1. Check user availability quickly
      if (!user) {
        // Wait a bit to see if user session loads from Firebase
        await new Promise(r => setTimeout(r, 800));
        if (!user && mounted) {
          setIsLoading(false);
          return;
        }
      }

      if (!user) return;

      try {
        const data = await getUserTransactions(user.uid);
        if (mounted) {
          setTransactions(data);
        }
      } catch (err) {
        console.error("Transactions load error:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();
    return () => { 
      mounted = false; 
      clearTimeout(timer);
    };
  }, [user]);

  if (isLoading) return <Placeholder title="Loading Transactions..." />;

  return (
    <PageWrapper>
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-neon-purple/20 rounded-xl">
          <CreditCard className="text-neon-purple" size={24} />
        </div>
        <div>
          <h1 className="font-display font-black text-2xl tracking-tight italic uppercase">Transactions</h1>
          <p className="text-xs text-white/40 font-bold tracking-widest uppercase">Your wallet history</p>
        </div>
      </div>

      <div className="glass-card p-0 overflow-hidden">
        <div className="divide-y divide-white/5">
          {transactions.length === 0 ? (
            <div className="p-12 text-center text-white/20 font-black uppercase tracking-widest text-xs">
              No transactions found
            </div>
          ) : transactions.map((tx) => (
            <div key={tx.id} className="p-5 flex items-center justify-between hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tx.amount > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  {tx.amount > 0 ? <Plus size={18} /> : <Zap size={18} className="rotate-180" />}
                </div>
                <div>
                  <p className="font-bold text-sm">{tx.type}</p>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-tighter">
                    {tx.date} {tx.method ? `• ${tx.method}` : ''}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-display font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-white'}`}>
                  {tx.amount > 0 ? '+' : ''}৳{tx.amount}
                </p>
                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                  tx.status === 'Approved' || tx.status === 'Completed' ? 'bg-green-500/20 text-green-400' : 
                  tx.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-500'
                }`}>
                  {tx.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
};

const Profile = ({ user, onUpdateAvatar, onUpdateProfile }: { 
  user: UserProfile, 
  onUpdateAvatar: (url: string) => void,
  onUpdateProfile: (data: Partial<UserProfile>) => Promise<void>
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(user.name);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!newName.trim() || newName === user.name) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await onUpdateProfile({ name: newName });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto">
        <div className="relative mb-24">
          <div className="h-48 rounded-3xl bg-gradient-to-r from-neon-purple/50 to-neon-yellow/10 border border-white/5" />
          
          <div className="absolute -bottom-16 left-8 flex items-end gap-6 flex-wrap">
            <div className="relative group">
              <div className="absolute -inset-1 bg-neon-yellow rounded-3xl blur opacity-30 group-hover:opacity-100 transition duration-500"></div>
              <img 
                src={user.avatar} 
                alt="Profile" 
                className="w-32 h-32 rounded-3xl p-1 bg-[#0a0a0a] border-2 border-white/10 relative z-10"
              />
              <button 
                onClick={() => setShowPicker(!showPicker)}
                className="absolute -bottom-2 -right-2 bg-neon-yellow p-2 rounded-lg border border-white/20 z-20 hover:scale-110 active:scale-95 transition-all text-black"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="pb-4 min-w-[300px]">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input 
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="bg-white/5 border border-neon-yellow/50 rounded-lg px-4 py-2 font-display font-black text-xl tracking-tight italic outline-none focus:bg-white/10 transition-all w-full md:w-64"
                    autoFocus
                  />
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="p-2 bg-neon-yellow text-black rounded-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Check size={20} />
                  </button>
                  <button 
                    onClick={() => {
                      setIsEditing(false);
                      setNewName(user.name);
                    }}
                    className="p-2 bg-white/5 text-white/40 rounded-lg hover:bg-white/10 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-4 group">
                  <h1 className="text-3xl font-display font-black tracking-tight flex items-center gap-2">
                    {user.name} <Zap size={20} className="text-neon-yellow" />
                  </h1>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="p-2 text-white/20 hover:text-neon-yellow opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Plus size={16} className="rotate-45" /> {/* Edit Icon placeholder */}
                  </button>
                </div>
              )}
              <p className="text-white/40 font-bold font-mono tracking-widest uppercase text-xs mt-1">Player UID: {user.uid}</p>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showPicker && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-12"
            >
              <div className="glass-card border-neon-yellow/30">
                <h3 className="font-display font-bold text-xs uppercase tracking-widest text-neon-yellow mb-4">Choose Your Avatar</h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                  {PREDEFINED_AVATARS.map((url) => (
                    <div 
                      key={url}
                      onClick={() => {
                        onUpdateAvatar(url);
                        setShowPicker(false);
                      }}
                      className={`relative aspect-square rounded-2xl overflow-hidden cursor-pointer border-2 transition-all ${user.avatar === url ? 'border-neon-yellow shadow-[0_0_10px_#facc15]' : 'border-white/5 hover:border-white/20'}`}
                    >
                      <img src={url} alt="Avatar option" className="w-full h-full" />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <motion.div 
            whileHover={{ y: -5 }}
            className="glass-card bg-[#121212] flex flex-col items-center justify-center p-8 border-neon-yellow/20"
          >
            <p className="text-[10px] text-white/40 font-black tracking-widest uppercase mb-2">Total Earnings</p>
            <p className="text-3xl font-display font-black text-neon-yellow italic drop-shadow-[0_0_10px_#facc15]">৳{user.totalEarnings}</p>
          </motion.div>
          <motion.div 
            whileHover={{ y: -5 }}
            className="glass-card bg-[#121212] flex flex-col items-center justify-center p-8 border-neon-purple/20"
          >
            <p className="text-[10px] text-white/40 font-black tracking-widest uppercase mb-2">Matches</p>
            <p className="text-3xl font-display font-black text-neon-purple italic drop-shadow-[0_0_10px_#6a00ff]">{user.matchesPlayed}</p>
          </motion.div>
          <motion.div 
            whileHover={{ y: -5 }}
            className="glass-card bg-[#121212] flex flex-col items-center justify-center p-8 border-white/10"
          >
            <p className="text-[10px] text-white/40 font-black tracking-widest uppercase mb-2">Level</p>
            <p className="text-3xl font-display font-black text-white italic">68</p>
          </motion.div>
        </div>

        <section className="glass-card p-0 overflow-hidden bg-[#121212] border-white/5 shadow-2xl">
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/2">
            <h3 className="font-display font-bold text-sm tracking-[0.2em] italic uppercase">Recent Activity</h3>
            <Link to="/matches" className="text-[10px] font-black text-neon-yellow uppercase hover:underline transition-all">View History</Link>
          </div>
          <div className="divide-y divide-white/5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-6 flex items-center justify-between hover:bg-white/3 transition-all duration-300 group cursor-pointer">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-xl bg-neon-purple/20 flex items-center justify-center text-neon-purple group-hover:scale-110 group-hover:bg-neon-purple transition-all duration-500 group-hover:text-white">
                    <Trophy size={24} />
                  </div>
                  <div>
                    <p className="font-display font-black text-sm uppercase italic tracking-tight group-hover:text-neon-purple transition-colors">Squad Challenge #{i}</p>
                    <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mt-1">24 Oct 2023 • RANK #1</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display font-black text-green-400 text-lg">+৳50</p>
                  <p className="text-[8px] font-black text-white/20 uppercase">Claimed</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PageWrapper>
  );
};

const Login = () => {
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSignIn = async (provider: any) => {
    try {
      setIsLoggingIn(true);
      setError(null);
      await socialSignIn(provider);
    } catch (err: any) {
      let message = 'Login failed. Please try again.';
      if (err.message && err.message.startsWith('{')) {
        try {
          const detailedError = JSON.parse(err.message);
          message = detailedError.error || message;
        } catch (parseErr) {
          message = err.message;
        }
      } else {
        message = err.message || message;
      }
      setError(message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-purple/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-yellow/10 rounded-full blur-[100px] animate-pulse transition-delay-1000" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card max-w-sm w-full bg-[#121212]/80 border-white/5 relative z-10"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-black rounded-2xl border border-neon-yellow mb-6 shadow-[0_0_20px_rgba(250,204,21,0.2)]">
            <Zap className="text-neon-yellow fill-current" size={40} />
          </div>
          <h1 className="font-display font-black text-2xl italic tracking-tighter mb-2">ARISE <span className="text-neon-yellow">RAIKOU</span></h1>
          <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.3em]">The Ultimate Esports Platform</p>
        </div>

        <div className="space-y-4">
          <button 
            onClick={() => handleSignIn(googleProvider)}
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-4 bg-white text-black py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {isLoggingIn ? 'Logging in...' : 'Continue with Google'}
          </button>
        </div>

        {error && (
          <p className="mt-6 text-[10px] text-red-400 font-bold uppercase tracking-widest text-center">{error}</p>
        )}

        <div className="mt-10 pt-6 border-t border-white/5 text-center">
          <p className="text-[8px] text-white/20 font-black uppercase tracking-[0.2em] leading-relaxed">
            By continuing, you agree to our<br />
            <span className="text-white/40">Terms of Service</span> and <span className="text-white/40">Privacy Policy</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

function AppInner() {
  const { user: authUser, profile, loading, updateProfile } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isNotificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [heroBanners, setHeroBanners] = useState<HeroBanner[]>([]);
  const [isLoadingTournaments, setIsLoadingTournaments] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const location = useLocation();

  useEffect(() => {
    if (authUser && profile) {
      setIsLoadingTournaments(true);
      setIsLoadingEvents(true);
      
      // Real-time listener for tournaments
      const tournamentsUnsub = onSnapshot(collection(db, 'tournaments'), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament));
        setTournaments(data || []);
        setIsLoadingTournaments(false);
      }, (error) => {
        console.error("Tournaments listener error:", error);
        setIsLoadingTournaments(false);
        handleFirestoreError(error, OperationType.LIST, 'tournaments');
      });

      // Real-time listener for events (announcements/full events)
      const eventsUnsub = onSnapshot(collection(db, 'events'), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GameEvent));
        // Sort locally by createdAt desc
        const sorted = data.sort((a, b) => {
          const tA = a.createdAt?.toMillis?.() || 0;
          const tB = b.createdAt?.toMillis?.() || 0;
          return tB - tA;
        });
        setEvents(sorted || []);
        setIsLoadingEvents(false);
      }, (error) => {
        console.error("Events listener error:", error);
        setIsLoadingEvents(false);
        handleFirestoreError(error, OperationType.LIST, 'events');
      });

      handleLoadNotifications();

      // Real-time listener for hero banners
      const heroUnsub = subscribeHeroBanners(setHeroBanners);

      return () => {
        tournamentsUnsub();
        eventsUnsub();
        heroUnsub();
      };
    }
  }, [authUser, profile]);

  const loadInitialData = async () => {
    // Kept only as a reference or manual trigger if needed, but onSnapshot handles it now
    return Promise.resolve();
  };

  const handleLoadNotifications = async () => {
    if (!profile) return;
    const data = await getUserNotifications(profile.uid);
    setNotifications(data);
  };

  const markAsRead = async (id: string) => {
    if (!profile) return;
    try {
      await markNotificationAsRead(profile.uid, id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleUpdateAvatar = async (url: string) => {
    await updateProfile({ avatar: url });
  };

  const openNotifications = async () => {
    setNotificationsOpen(true);
    if (!profile) return;
    
    // Load latest first
    const data = await getUserNotifications(profile.uid);
    setNotifications(data);
    
    // Mark all as read locally and on server
    const unread = data.filter(n => !n.read);
    if (unread.length > 0) {
      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      
      // Background server update
      Promise.all(unread.map(n => markNotificationAsRead(profile.uid, n.id)))
        .catch(err => console.error("Error bulk marking notifications as read:", err));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-neon-yellow/10 border-t-neon-yellow rounded-full animate-spin" />
      </div>
    );
  }

  if (!authUser || !profile) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex selection:bg-neon-yellow selection:text-black font-sans">
      {/* Navigation - Left on Large Screens */}
      <DesktopNav user={profile} />

      {/* Content - Center Area */}
      <main className="flex-1 overflow-x-hidden min-h-screen flex flex-col no-scrollbar">
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={
              <Home 
                onOpenSidebar={() => setSidebarOpen(true)} 
                notifications={notifications}
                onToggleNotifications={openNotifications}
                tournaments={tournaments}
                events={events}
                heroBanners={heroBanners}
                isLoading={isLoadingTournaments || isLoadingEvents}
              />
            } />
            <Route path="/profile" element={
              <Profile 
                user={profile} 
                onUpdateAvatar={handleUpdateAvatar} 
                onUpdateProfile={updateProfile}
              />
            } />
            <Route path="/admin" element={
              profile?.isAdmin ? <AdminDashboard /> : <Navigate to="/" replace />
            } />
            <Route path="/tournament/:id" element={<TournamentDetails tournaments={tournaments} />} />
            <Route path="/tournaments" element={<AnnouncementsPage events={events} isLoading={isLoadingEvents} />} />
            <Route path="/announcements" element={<AnnouncementsPage events={events} isLoading={isLoadingEvents} />} />
            <Route path="/news" element={<AnnouncementsPage events={events} isLoading={isLoadingEvents} />} />
            <Route path="/matches" element={<MyMatches />} />
            <Route path="/leaderboard" element={<Placeholder title="Leaderboard" />} />
            <Route path="/top-up" element={<TopUp />} />
            <Route path="/withdraw" element={<Withdraw />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/support" element={<Placeholder title="Support" />} />
            <Route path="*" element={
              <Home 
                onOpenSidebar={() => setSidebarOpen(true)} 
                notifications={notifications}
                onToggleNotifications={openNotifications}
                tournaments={tournaments}
                events={events}
                heroBanners={heroBanners}
                isLoading={isLoadingTournaments}
              />
            } />
          </Routes>
        </AnimatePresence>
      </main>

      {/* Notification Panel */}
      <NotificationPanel 
        isOpen={isNotificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        onMarkAsRead={markAsRead}
      />

      {/* Profile Sidebar - Right on Large Screens */}
      <RightSidebar user={profile} isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Mobile Sidebar Toggle - Only profile trigger for now (removed as requested) */}

      {/* Bottom Nav Mobile */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm glass border-white/10 rounded-2xl px-6 py-2 flex items-center justify-around z-40 shadow-[0_0_30px_rgba(0,0,0,0.5)] h-16">
        {[
          { icon: <LayoutGrid size={20} />, label: 'Home', path: '/' },
          { icon: <Trophy size={20} />, label: 'Announcements', path: '/announcements' },
          { icon: <User size={20} />, label: 'Profile', path: '/profile' },
        ].map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.label}
              to={item.path} 
              className={`p-2 transition-all flex flex-col items-center gap-1 ${isActive ? 'text-neon-yellow scale-110 drop-shadow-[0_0_8px_#facc15]' : 'text-white/30'}`}
            >
              {item.icon}
              <span className="text-[7px] font-black uppercase tracking-tighter">{item.label}</span>
              {isActive && (
                <motion.div 
                  layoutId="activeTab"
                  className="w-1 h-1 bg-neon-yellow rounded-full absolute -bottom-1"
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppInner />
      </Router>
    </AuthProvider>
  );
}
