import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Edit, Trash2, Save, X, Trophy, CreditCard, ChevronRight, Image as ImageIcon, 
  Users, Map as MapIcon, Clock, DollarSign, CheckCircle2, XCircle, Zap, Bell,
  Search, MessageSquare, Mail, Award, Flame, ShoppingBag, Diamond, Settings, ToggleLeft, ToggleRight
} from 'lucide-react';
import { 
  getTournaments, saveTournament, deleteTournament, uploadTournamentImage,
  getShopPackages, addShopPackage, deleteShopPackage as deleteShopPackageFirebase, updateShopPackage,
  getEvents, saveEvent, deleteEvent, uploadEventImage,
  getVerifiedCodes, addVerifiedCode, deleteVerifiedCode,
  getWithdrawalRequests, updateWithdrawalStatus, deleteWithdrawalRequest,
  getTournamentRegistrations, refundTournamentRegistrations, sendNotificationToParticipants,
  subscribeHeroBanners, saveHeroBanner, deleteHeroBanner, addNotification,
  getAllUsers, subscribeAllShopOrders, updateShopOrder, deleteShopOrder, subscribePaymentMethods, savePaymentMethod, deletePaymentMethod
} from '../lib/firebase';
import { formatDate, toInputDateTime, getErrorMessage } from '../lib/utils';
import { 
  Tournament, ShopPackage, VerifiedCode, WithdrawalRequest, Transaction, 
  GameEvent, TournamentRegistration, HeroBanner, UserProfile, ShopOrder, PaymentMethod
} from '../types';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<'tournaments' | 'packages' | 'codes' | 'withdrawals' | 'events' | 'hero' | 'users' | 'orders' | 'payments'>('tournaments');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [packages, setPackages] = useState<ShopPackage[]>([]);
  const [codes, setCodes] = useState<VerifiedCode[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [heroBanners, setHeroBanners] = useState<HeroBanner[]>([]);
  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [shopOrders, setShopOrders] = useState<ShopOrder[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<UserProfile | null>(null);
  const [directMsg, setDirectMsg] = useState('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [winnerFile, setWinnerFile] = useState<File | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<{id: string, status: 'Approved' | 'Rejected'} | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{id: string, type: 'tournament' | 'package' | 'code' | 'withdrawal' | 'event' | 'hero'} | null>(null);
  const [newCode, setNewCode] = useState({ code: '', amount: 0 });
  const [editingTournamentRegs, setEditingTournamentRegs] = useState<TournamentRegistration[]>([]);

  const [newEvent, setNewEvent] = useState({ 
    title: '', 
    date: '', 
    description: '', 
    link: '',
    status: 'Announcement' as 'Upcoming' | 'Ongoing' | 'Completed' | 'Announcement' | 'Live',
    prizePool: 0,
    entryFee: 0
  });

  const [eventErrors, setEventErrors] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<string>('');

  const validateEvent = () => {
    const errors: Record<string, string> = {};
    if (!newEvent.description.trim()) errors.description = 'Content is required';
    setEventErrors(errors);
    return Object.keys(errors).length === 0;
  };

  useEffect(() => {
    const loadRegs = async () => {
      if (editingItem && editingItem.id && activeTab === 'tournaments') {
        const regs = await getTournamentRegistrations(editingItem.id);
        setEditingTournamentRegs(regs);
      } else {
        setEditingTournamentRegs([]);
      }
    };
    loadRegs();
  }, [editingItem, activeTab]);

  // Registration View State
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [isLoadingRegistrations, setIsLoadingRegistrations] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState('');
  const [isSendingNotif, setIsSendingNotif] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  useEffect(() => {
    let unsubscribeHero: (() => void) | null = null;
    let unsubscribeOrders: (() => void) | null = null;
    let unsubscribePayments: (() => void) | null = null;

    if (activeTab === 'hero') {
      unsubscribeHero = subscribeHeroBanners(setHeroBanners);
    } else if (activeTab === 'orders') {
      unsubscribeOrders = subscribeAllShopOrders(setShopOrders);
    } else if (activeTab === 'payments') {
      unsubscribePayments = subscribePaymentMethods(setPaymentMethods);
    }

    return () => {
      if (unsubscribeHero) unsubscribeHero();
      if (unsubscribeOrders) unsubscribeOrders();
      if (unsubscribePayments) unsubscribePayments();
    };
  }, [activeTab]);

  const fetchData = async (forceType?: string) => {
    const tabToFetch = forceType || activeTab;
    console.log(`AdminDashboard: Fetching data for tab [${tabToFetch}]`);
    setIsLoading(true);
    try {
      if (tabToFetch === 'tournaments') {
        const data = await getTournaments();
        setTournaments(data);
      } else if (tabToFetch === 'packages') {
        const data = await getShopPackages();
        setPackages(data);
      } else if (tabToFetch === 'codes') {
        const data = await getVerifiedCodes();
        setCodes(data);
      } else if (tabToFetch === 'withdrawals') {
        const data = await getWithdrawalRequests();
        setWithdrawals(data);
      } else if (tabToFetch === 'events') {
        const data = await getEvents();
        setEvents(data);
      } else if (tabToFetch === 'users') {
        const data = await getAllUsers();
        setPlayers(data);
      } else if (tabToFetch === 'orders') {
        // Subscribed via useEffect, but can do initial fetch here if needed
        // Removing localStorage leftover
      }
      console.log(`AdminDashboard: Fetch completed for [${tabToFetch}]`);
    } catch (error) {
      console.error(`AdminDashboard Fetch error [${tabToFetch}]:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.code || newCode.amount <= 0) return;
    try {
      await addVerifiedCode(newCode.code, newCode.amount);
      setNewCode({ code: '', amount: 0 });
      fetchData();
    } catch (error: any) {
      alert(`Error adding code: ${getErrorMessage(error)}`);
    }
  };

  const handleDeleteCode = async (id: string) => {
    // Optimistic update
    setCodes(prev => prev.filter(c => c.id !== id));
    try {
      await deleteVerifiedCode(id);
      setItemToDelete(null);
    } catch (error: any) {
      setCodes(codes); // Rollback
      alert(`Error deleting code: ${error.message}`);
    }
  };

  const handleUpdateWithdrawal = async (withdrawal: WithdrawalRequest, status: 'Approved' | 'Rejected') => {
    setIsUpdating(withdrawal.id);
    try {
      console.log(`Executing withdrawal status update: ${withdrawal.id} -> ${status}`);
      await updateWithdrawalStatus(withdrawal.id, status, withdrawal.userId, withdrawal.amount);
      alert(`Request ${status} successfully!`);
      setConfirmStatus(null);
      fetchData();
    } catch (error: any) {
      console.error("Withdrawal update error in component:", error);
      alert(`Update Failed: ${getErrorMessage(error)}`);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDeleteWithdrawal = async (id: string) => {
    // Optimistic update
    setWithdrawals(prev => prev.filter(w => w.id !== id));
    try {
      await deleteWithdrawalRequest(id);
      setItemToDelete(null);
    } catch (error: any) {
      setWithdrawals(withdrawals); // Rollback
      alert(`Error deleting withdrawal: ${error.message}`);
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Saving Direct Post (Event):", newEvent);
    if (!validateEvent()) {
      console.warn("Event validation failed:", eventErrors);
      return;
    }
    
    setIsUploading(true);
    setSaveStatus('Preparing...');
    
    try {
      let imageUrl = editingItem?.image || '';
      
      if (selectedFile) {
        console.log("Uploading event image...");
        setSaveStatus('Uploading image...');
        try {
          imageUrl = await uploadEventImage(selectedFile);
        } catch (uploadError) {
          console.error("Image upload failed, using fallback:", uploadError);
          // Fallback to placeholder if upload fails but we must save
          if (!imageUrl) imageUrl = 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?q=80&w=2070&auto=format&fit=crop';
        }
      } else if (!imageUrl) {
        // Default placeholder if no image provided at all
        imageUrl = 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?q=80&w=2070&auto=format&fit=crop';
      }

      setSaveStatus('Saving to Database...');
      
      const eventData = {
        title: newEvent.title || editingItem?.title || 'Announcement',
        description: newEvent.description,
        status: 'Announcement' as const,
        date: '',
        link: newEvent.link || '',
        image: imageUrl,
        prizePool: 0,
        entryFee: 0,
        type: 'announcement' as const
      };

      console.log("Executing saveEvent with data:", eventData);
      const savedId = await saveEvent(eventData, editingItem?.id);
      console.log("Event saved successfully with ID:", savedId);

      setEditingItem(null);
      setNewEvent({ title: '', date: '', description: '', link: '', status: 'Announcement', prizePool: 0, entryFee: 0 });
      setEventErrors({});
      setSelectedFile(null);
      
      alert("Post published successfully!");
      fetchData();
    } catch (error: any) {
      console.error("Critical error saving post:", error);
      alert(`Save Failed: ${getErrorMessage(error)}`);
    } finally {
      setIsUploading(false);
      setSaveStatus('');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    try {
      await deleteEvent(id);
      setItemToDelete(null);
    } catch (error: any) {
      setEvents(events);
      alert(`Error deleting post: ${getErrorMessage(error)}`);
    }
  };

  const handleSaveTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Saving Tournament:", editingItem);
    setIsUploading(true);
    try {
      let finalData = { ...editingItem };
      
      // If we don't have an ID yet, we need one for the storage path
      if (!finalData.id) {
        finalData.id = `T-${Date.now()}`;
      }

      // Default status
      if (!finalData.status) {
        finalData.status = 'Upcoming';
      }

      // Image Upload with fallback
      if (selectedFile) {
        console.log("Uploading tournament image...");
        try {
          const imageUrl = await uploadTournamentImage(finalData.id, selectedFile);
          finalData.image = imageUrl;
        } catch (imgError) {
          console.error("Tournament image upload failed:", imgError);
          // Don't block the post if image upload fails, use existing or fallback
          if (!finalData.image) finalData.image = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop';
        }
      } else if (!finalData.image) {
        // Default placeholder if none provided
        finalData.image = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop';
      }

      if (winnerFile) {
        console.log("Uploading winner photo...");
        try {
          const winnerImageUrl = await uploadTournamentImage(`${finalData.id}-winner`, winnerFile);
          finalData.winnerPhoto = winnerImageUrl;
        } catch (winImgErr) {
          console.error("Winner photo upload failed:", winImgErr);
        }
      }

      console.log("Sending tournament data to Firestore:", finalData);
      await saveTournament(finalData);
      console.log("Tournament saved successfully!");
      
      // Send notification if completed and winner added
      if (finalData.status === 'Completed' && finalData.winnerName) {
        try {
          await sendNotificationToParticipants(finalData.id, `Match Over! 🏆 Winner: ${finalData.winnerName}. Prize: ৳${finalData.winnerPrize}. Congratulations to the champions!`);
          
          if (finalData.winnerUserId) {
            await addNotification(finalData.winnerUserId, {
              title: '🏆 You Won!',
              message: `Congratulations! Your team ${finalData.winnerName} won the match. Prize: ৳${finalData.winnerPrize}. Our admin will contact you personally to send the prize money.`,
              type: 'Result'
            });
          }
        } catch (e) {
          console.warn("Failed to notify participants", e);
        }
      }

      setEditingItem(null);
      setSelectedFile(null);
      setWinnerFile(null);
      
      alert("Tournament saved successfully!");
      fetchData();
    } catch (error: any) {
      console.error("Critical error saving tournament:", error);
      alert(`Error saving tournament: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteTournament = async (id: string) => {
    // Optimistic update
    setTournaments(prev => prev.filter(t => t.id !== id));
    try {
      await deleteTournament(id);
      setItemToDelete(null);
    } catch (error: any) {
      setTournaments(tournaments); // Rollback
      alert(`Error deleting tournament: ${error.message}`);
    }
  };

  const handleViewRegistrations = async (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setIsLoadingRegistrations(true);
    try {
      const data = await getTournamentRegistrations(tournament.id);
      setRegistrations(data);
    } catch (error: any) {
      alert("Error fetching registrations: " + error.message);
    } finally {
      setIsLoadingRegistrations(false);
    }
  };

  const handleNotifyParticipants = async () => {
    if (!selectedTournament || !notificationMsg.trim()) return;
    setIsSendingNotif(true);
    try {
      await sendNotificationToParticipants(selectedTournament.id, notificationMsg);
      alert("Notification sent to all participants!");
      setNotificationMsg('');
    } catch (error: any) {
      alert("Error sending notification: " + error.message);
    } finally {
      setIsSendingNotif(false);
    }
  };

  const handleRefundTournament = async () => {
    if (!selectedTournament) return;
    if (!window.confirm("Are you sure you want to cancel this match and refund all teams?")) return;
    
    setIsRefunding(true);
    try {
      const result = await refundTournamentRegistrations(selectedTournament.id);
      if (result.success) {
        alert(result.message);
        setSelectedTournament(null);
        fetchData();
      } else {
        alert("Refund Failed: " + result.message);
      }
    } catch (error: any) {
      alert("Refund Error: " + error.message);
    } finally {
      setIsRefunding(false);
    }
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      let finalData = { ...editingItem };
      
      if (selectedFile) {
        finalData.image = await uploadEventImage(selectedFile);
      }

      if (!finalData.categoryId) finalData.categoryId = 'diamonds';
      if (finalData.isActive === undefined) finalData.isActive = true;

      if (finalData.id) {
        await updateShopPackage(finalData.id, finalData);
      } else {
        await addShopPackage(finalData);
      }
      
      setEditingItem(null);
      setSelectedFile(null);
      await fetchData();
      alert("Shop package saved!");
    } catch (error: any) {
      alert(`Error saving package: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePackage = async (id: string) => {
    try {
      await deleteShopPackageFirebase(id);
      setPackages(prev => prev.filter(p => p.id !== id));
      setItemToDelete(null);
    } catch (error: any) {
      alert(`Error deleting package: ${error.message}`);
    }
  };

  const handleSaveHeroBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      let finalData = { ...editingItem };
      if (!finalData.id) finalData.id = `H-${Date.now()}`;
      if (finalData.isActive === undefined) finalData.isActive = true;
      if (!finalData.type) finalData.type = 'Live';

      if (selectedFile) {
        finalData.image = await uploadEventImage(selectedFile);
      }

      await saveHeroBanner(finalData);
      setEditingItem(null);
      setSelectedFile(null);
      alert("Hero banner saved!");
    } catch (error: any) {
      alert(`Error saving hero banner: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteHeroBanner = async (id: string) => {
    try {
      await deleteHeroBanner(id);
      setItemToDelete(null);
    } catch (error: any) {
      alert(`Error deleting hero banner: ${error.message}`);
    }
  };

  const handleUpdateShopOrder = async (order: ShopOrder, status: 'Completed' | 'Rejected') => {
    const note = window.prompt(`Admin Note for ${status} (Optional):`);
    setIsUpdating(order.id);
    try {
      const updates: any = { status };
      if (note) {
        updates.adminNote = note;
      }
      
      await updateShopOrder(order.id, updates);
      alert(`Order ${status} successfully!`);
      // No need to fetch, it's synced via subscribe
    } catch (error: any) {
      alert(`Error updating order: ${error.message}`);
    } finally {
      setIsUpdating(null);
    }
  };

  const [paymentForm, setPaymentForm] = useState<Partial<PaymentMethod> | null>(null);

  const handleSavePaymentMethodLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm) return;
    setIsUploading(true);
    try {
      await savePaymentMethod(paymentForm);
      setPaymentForm(null);
      alert("Payment method saved!");
    } catch (error: any) {
      alert(`Error saving payment method: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePaymentMethod = async (id: string) => {
    if (!window.confirm("Delete this payment method?")) return;
    try {
      await deletePaymentMethod(id);
      alert("Payment method deleted!");
    } catch (error: any) {
      alert(`Error deleting payment method: ${error.message}`);
    }
  };

  const handleDeleteShopOrder = async (orderId: string) => {
    if (!window.confirm("Delete this order record?")) return;
    setIsUpdating(orderId);
    try {
      await deleteShopOrder(orderId);
      alert("Order record removed!");
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <div className="flex-1 space-y-8 p-4 lg:p-12 bg-[#0a0a0a] min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-6 border-b border-white/5 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-neon-yellow rounded-full animate-pulse shadow-[0_0_10px_#facc15]" />
            <h1 className="text-4xl font-display font-black tracking-tighter italic uppercase">Admin <span className="text-neon-yellow text-glow-yellow">Panel</span></h1>
          </div>
          <p className="text-white/40 font-bold font-mono tracking-widest uppercase text-[10px] ml-5">Control Station v2.0 • Real-time Monitoring</p>
        </div>
        
        <div className="flex flex-wrap bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
          {[
            { id: 'tournaments', label: 'Matches', icon: <Trophy size={14} /> },
            { id: 'codes', label: 'Trx IDs', icon: <CheckCircle2 size={14} /> },
            { id: 'withdrawals', label: 'Payouts', icon: <DollarSign size={14} />, badge: withdrawals.filter(w => w.status === 'Pending').length },
            { id: 'packages', label: 'Shop Offers', icon: <Diamond size={14} /> },
            { id: 'users', label: 'Players', icon: <Users size={14} /> },
            { id: 'events', label: 'Alert Notice', icon: <Bell size={14} /> },
            { id: 'orders', label: 'Shop Orders', icon: <ShoppingBag size={14} />, badge: shopOrders.filter(o => o.status === 'Pending').length },
            { id: 'payments', label: 'Payments', icon: <Settings size={14} /> },
            { id: 'hero', label: 'Banners', icon: <ImageIcon size={14} /> }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === tab.id ? 'bg-neon-yellow text-black shadow-[0_0_20px_rgba(250,204,21,0.3)]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge && tab.badge > 0 && (
                <span className="ml-1 w-4 h-4 bg-red-500 text-white text-[8px] rounded-full flex items-center justify-center animate-bounce">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Stats Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Live Matches', value: tournaments.filter(t => t.status !== 'Completed').length, color: 'text-neon-yellow', icon: <Flame size={14} /> },
          { label: 'Pending Payouts', value: withdrawals.filter(w => w.status === 'Pending').length, color: 'text-red-500', icon: <DollarSign size={14} />, alert: true },
          { label: 'Shop Orders', value: shopOrders.filter(o => o.status === 'Pending').length, color: 'text-orange-400', icon: <ShoppingBag size={14} />, alert: shopOrders.filter(o => o.status === 'Pending').length > 0 },
          { label: 'Broadcast Posts', value: events.length, color: 'text-neon-purple', icon: <Bell size={14} /> },
          { label: 'System Codes', value: codes.filter(c => c.status === 'Active').length, color: 'text-green-400', icon: <Zap size={14} /> }
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label} 
            className={`glass-card p-6 bg-[#121212] border-white/5 relative overflow-hidden group ${stat.alert && stat.value > 0 ? 'border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : ''}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{stat.label}</span>
              <div className={`p-2 rounded-lg bg-white/5 ${stat.color} group-hover:scale-110 transition-transform`}>
                {stat.icon}
              </div>
            </div>
            <p className={`text-3xl font-display font-black italic ${stat.color}`}>{stat.value}</p>
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
              {React.cloneElement(stat.icon as React.ReactElement, { size: 80 })}
            </div>
          </motion.div>
        ))}
      </div>

      {activeTab !== 'codes' && activeTab !== 'withdrawals' && activeTab !== 'events' && activeTab !== 'hero' && (
        <div className="flex justify-end items-center gap-4">
          <button 
             onClick={() => fetchData()}
             className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-white/60"
             title="Refresh Data"
          >
            <Clock size={18} className={isLoading ? 'animate-spin text-neon-yellow' : ''} />
          </button>
          <button 
            onClick={() => setEditingItem({})}
            className="flex items-center gap-3 px-8 py-4 bg-neon-purple text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_30px_rgba(168,85,247,0.3)] border border-neon-purple/50"
          >
            <Plus size={20} />
            Add {activeTab === 'hero' ? 'Banner' : activeTab === 'tournaments' ? 'Tournament' : 'Package'}
          </button>
        </div>
      )}

      <div className="grid gap-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-neon-yellow/10 border-t-neon-yellow rounded-full animate-spin" />
          </div>
        ) : activeTab === 'tournaments' ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {tournaments.map(t => (
              <div key={t.id} className="glass-card p-6 bg-[#121212] border-white/5 relative group overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-display font-black text-xl italic tracking-tight">{t.title}</h3>
                    <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">{t.type} • {t.map || 'Bermuda'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingItem(t)} className="p-2 bg-white/5 rounded-lg hover:bg-neon-purple hover:text-white transition-all">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => setItemToDelete({id: t.id, type: 'tournament'})} className="p-2 bg-white/5 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-white/3 rounded-xl border border-white/5">
                    <p className="text-white/40 uppercase font-black text-[8px] tracking-widest mb-1">Entry Fee</p>
                    <p className="font-black text-neon-yellow">৳{t.entryFee}</p>
                  </div>
                  <div className="p-3 bg-white/3 rounded-xl border border-white/5">
                    <p className="text-white/40 uppercase font-black text-[8px] tracking-widest mb-1">Prize Pool</p>
                    <p className="font-black text-neon-yellow">৳{t.prizePool}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                    <span className="flex items-center gap-1"><Clock size={12} /> {t.startTime}</span>
                    <span className="flex items-center gap-1"><Users size={12} /> {t.slotsLeft}/{t.slotsTotal}</span>
                  </div>
                  <button 
                    onClick={() => handleViewRegistrations(t)}
                    className="p-1 px-3 bg-neon-yellow/10 text-neon-yellow rounded-full text-[8px] font-black uppercase tracking-widest border border-neon-yellow/20 hover:bg-neon-yellow hover:text-black transition-all"
                  >
                    View Registrations
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'packages' ? (
          <div className="grid md:grid-cols-3 xl:grid-cols-4 gap-6">
            {packages.map(p => (
              <div key={p.id} className={`glass-card p-4 bg-[#121212] border-white/5 relative group flex flex-col ${!p.isActive ? 'opacity-50 grayscale' : ''}`}>
                <div className="aspect-square relative rounded-2xl overflow-hidden mb-4 bg-white/5">
                  {p.image ? (
                    <img src={p.image} alt={p.label} className="w-full h-full object-contain p-4" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-10">
                      <Diamond size={60} />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button onClick={() => setEditingItem(p)} className="p-2 bg-black/60 backdrop-blur-md rounded-lg text-white/60 hover:text-neon-yellow transition-all border border-white/5">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => setItemToDelete({id: p.id, type: 'package'})} className="p-2 bg-black/60 backdrop-blur-md rounded-lg text-white/60 hover:text-red-500 transition-all border border-white/5">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {!p.isActive && (
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-red-500 text-white text-[7px] font-black uppercase tracking-widest rounded-md">
                      HIDDEN
                    </div>
                  )}
                </div>
                
                <div className="space-y-1 mt-auto">
                   <h3 className="font-display font-black text-lg italic tracking-tighter uppercase truncate">{p.label}</h3>
                   <div className="flex items-center justify-between">
                     <p className="text-[10px] font-black text-neon-yellow shadow-neon-yellow italic">{p.amount}</p>
                     <p className="text-[10px] font-black text-white/40">৳ {p.price}</p>
                   </div>
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'codes' ? (
          <div className="space-y-8">
            <div className="glass-card p-8 bg-[#121212] border-white/5">
              <h3 className="font-display font-black text-xl italic tracking-tight mb-6">ADD VERIFIED <span className="text-neon-yellow uppercase">TRX ID</span></h3>
              <form onSubmit={handleAddCode} className="grid md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Transaction ID</label>
                  <input 
                    required
                    type="text" 
                    value={newCode.code}
                    onChange={e => setNewCode({...newCode, code: e.target.value})}
                    placeholder="e.g. TRX123456"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow font-bold uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Amount (৳)</label>
                  <input 
                    required
                    type="number" 
                    value={newCode.amount || ''}
                    onChange={e => setNewCode({...newCode, amount: Number(e.target.value)})}
                    placeholder="e.g. 500"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow font-bold"
                  />
                </div>
                <button type="submit" className="bg-neon-yellow text-black py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all h-[44px]">
                  Add Code
                </button>
              </form>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {codes.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-white/2 rounded-2xl border border-dashed border-white/10">
                  <p className="text-white/20 font-black uppercase tracking-widest text-xs">No verified codes active</p>
                </div>
              ) : codes.map(c => (
                <div key={c.id} className="glass-card p-6 bg-[#121212] border-white/5 flex items-center justify-between border-l-4 border-l-neon-yellow">
                  <div>
                    <h4 className="font-display font-black text-lg tracking-widest">{c.code}</h4>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Amount: <span className="text-white">৳{c.amount}</span> • {c.status}</p>
                    {c.usedBy && <p className="text-[8px] font-black uppercase tracking-widest text-neon-purple mt-1">Used by: {c.usedBy}</p>}
                  </div>
                  <button onClick={() => setItemToDelete({id: c.id, type: 'code'})} className="p-2 bg-white/5 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'withdrawals' ? (
          <div className="space-y-4">
            {withdrawals.length === 0 ? (
              <div className="text-center py-20 bg-white/3 rounded-3xl border border-dashed border-white/10">
                <p className="text-white/40 font-bold uppercase tracking-widest text-sm italic">No withdrawal requests found</p>
              </div>
            ) : (
              withdrawals.map(w => (
                <div key={w.id} className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-white/5 bg-[#121212]">
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-2xl ${w.status === 'Approved' ? 'bg-green-500/10 text-green-500' : w.status === 'Rejected' ? 'bg-red-500/10 text-red-500' : 'bg-neon-yellow/10 text-neon-yellow animate-pulse'}`}>
                      <DollarSign size={24} />
                    </div>
                    <div>
                      <h4 className="font-display font-black text-xl italic tracking-tight">{w.userName}</h4>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Amount: <span className="text-neon-yellow">৳{w.amount}</span> • Method: <span className="text-white">{w.method}</span></p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest p-1 bg-white/5 rounded text-white/40">Number: {w.number}</span>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${w.status === 'Approved' ? 'bg-green-500 text-black' : w.status === 'Rejected' ? 'bg-red-500 text-white' : 'bg-neon-yellow text-black'}`}>{w.status}</span>
                      </div>
                    </div>
                  </div>
                  
                  {w.status === 'Pending' ? (
                    <div className="flex flex-col gap-2">
                      {confirmStatus?.id === w.id ? (
                        <div className="flex flex-col gap-3 p-4 bg-white/5 rounded-2xl border border-white/10 animate-in fade-in slide-in-from-top-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-center text-neon-yellow">
                            Confirm {confirmStatus.status}?
                          </p>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleUpdateWithdrawal(w, confirmStatus.status)}
                              className="flex-1 py-3 bg-neon-yellow text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95"
                            >
                              Yes, Continue
                            </button>
                            <button 
                              onClick={() => setConfirmStatus(null)}
                              className="flex-1 py-3 bg-white/10 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/20"
                            >
                              No, Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setConfirmStatus({ id: w.id, status: 'Approved' })}
                            disabled={isUpdating === w.id}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-neon-yellow text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                          >
                            {isUpdating === w.id ? (
                              <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                            ) : (
                              <CheckCircle2 size={16} />
                            )}
                            {isUpdating === w.id ? 'Processing...' : 'Approve'}
                          </button>
                          <button 
                            onClick={() => setConfirmStatus({ id: w.id, status: 'Rejected' })}
                            disabled={isUpdating === w.id}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white/5 text-red-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all border border-white/5 disabled:opacity-50"
                          >
                            {isUpdating === w.id ? 'Wait...' : (
                              <><XCircle size={16} /> Reject</>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button 
                      onClick={() => setItemToDelete({id: w.id, type: 'withdrawal'})}
                      className="p-3 bg-white/5 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        ) : activeTab === 'events' ? (
          <div className="space-y-8">
            <div className="glass-card p-8 bg-[#121212] border-white/5">
              <h3 className="font-display font-black text-xl italic uppercase flex items-center gap-3 mb-8">
                <Bell className="text-neon-yellow" size={24} />
                {editingItem ? 'Edit Direct Post' : 'Create Direct Post'}
              </h3>

              <form onSubmit={handleSaveEvent} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Title / Headline</label>
                    <input 
                      type="text"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-neon-yellow outline-none transition-all"
                      placeholder="e.g. Major Update!, New Prize Pool, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Action Link (Optional)</label>
                    <input 
                      type="url"
                      value={newEvent.link}
                      onChange={(e) => setNewEvent({ ...newEvent, link: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-neon-yellow outline-none transition-all"
                      placeholder="https://facebook.com/..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Post Description / Caption</label>
                  <textarea 
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    className={`w-full bg-white/5 border ${eventErrors.description ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-sm focus:border-neon-yellow outline-none transition-all min-h-[120px] resize-none`}
                    placeholder="Describe the update or announcement..."
                  />
                  {eventErrors.description && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">{eventErrors.description}</p>}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Optional Image</label>
                    {selectedFile && (
                      <span className="text-[10px] text-neon-yellow font-black animate-pulse uppercase">Selected: {selectedFile.name}</span>
                    )}
                  </div>
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl p-8 hover:border-neon-yellow/50 hover:bg-white/5 transition-all cursor-pointer group">
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                    <ImageIcon className="text-white/20 group-hover:text-neon-yellow transition-colors mb-2" size={32} />
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest group-hover:text-white transition-colors">
                      {selectedFile ? 'CHANGE IMAGE' : 'UPLOAD POSTER IMAGE'}
                    </span>
                  </label>
                </div>

                <button 
                  disabled={isUploading}
                  className="btn-primary w-full py-4 tracking-widest flex items-center justify-center gap-2 group transition-all shadow-[0_0_20px_rgba(250,204,21,0.2)]"
                >
                  {isUploading ? (
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      <span className="text-[10px] font-black uppercase tracking-widest uppercase">Publishing...</span>
                    </div>
                  ) : (
                    <>
                      <Zap size={16} className="group-hover:animate-pulse" />
                      <span>{editingItem ? 'UPDATE ANNOUNCEMENT' : 'PUBLISH ANNOUNCEMENT'}</span>
                    </>
                  )}
                </button>
                {editingItem && (
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingItem(null);
                      setNewEvent({ title: '', date: '', description: '', link: '', status: 'Announcement', prizePool: 0, entryFee: 0 });
                      setEventErrors({});
                      setSelectedFile(null);
                    }}
                    className="w-full mt-4 py-3 bg-white/5 text-white/40 rounded-xl font-black text-[10px] uppercase tracking-widest hover:text-white transition-all underline decoration-white/10"
                  >
                    Cancel Edit
                  </button>
                )}
              </form>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {events.map((event) => (
                <div key={event.id} className="glass-card bg-[#121212] overflow-hidden border-white/5 group">
                  {event.image && (
                    <div className="aspect-video relative">
                      <img src={event.image} alt={event.title} className="w-full h-full object-cover opacity-60" />
                    </div>
                  )}
                  <div className="p-6">
                    <p className="text-xs text-white/70 mb-6 leading-relaxed bg-white/3 p-4 rounded-xl border border-white/5 italic">"{event.description}"</p>
                    <div className="flex gap-2">
                      <button 
                         onClick={() => {
                           setEditingItem(event);
                           setNewEvent({ 
                             ...newEvent, 
                             description: event.description,
                             title: event.title || '',
                             link: event.link || ''
                           });
                         }}
                         className="flex-1 py-3 bg-white/5 hover:bg-neon-yellow hover:text-black rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border border-white/5"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => setItemToDelete({ id: event.id, type: 'event' })}
                        className="p-3 bg-white/5 hover:bg-red-500 hover:text-white rounded-xl border border-white/5 transition-all text-red-500"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'users' ? (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <h3 className="font-display font-black text-xl italic tracking-tight uppercase">User <span className="text-neon-yellow">Management</span></h3>
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                <input 
                  type="text"
                  placeholder="SEARCH NAME, EMAIL, OR UID..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-[10px] font-black tracking-widest outline-none focus:border-neon-yellow transition-all"
                />
              </div>
            </div>

            <div className="grid gap-4">
              {players.filter(p => 
                p.name.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
                p.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                p.uid.toLowerCase().includes(userSearchTerm.toLowerCase())
              ).map(p => (
                <div key={p.uid} className="glass-card p-6 bg-[#121212] border-white/10 flex items-center justify-between gap-6 hover:bg-white/2 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/10 shrink-0">
                      <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-display font-black text-lg italic uppercase">{p.name}</h4>
                        {p.isAdmin && <span className="px-1.5 py-0.5 bg-neon-purple/20 text-neon-purple rounded text-[8px] font-black uppercase">Admin</span>}
                      </div>
                      <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{p.email || 'No Email'}</p>
                      <p className="text-[8px] font-mono text-white/20 mt-1">{p.uid}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="hidden md:flex gap-6">
                      <div className="text-center">
                        <p className="text-[8px] font-black text-white/20 uppercase mb-1">Level</p>
                        <p className="font-display font-black text-neon-yellow italic">{p.level || 0}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[8px] font-black text-white/20 uppercase mb-1">Balance</p>
                        <p className="font-display font-black text-green-400 italic">৳{p.balance || 0}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedPlayer(p)}
                      className="p-3 bg-white/5 hover:bg-neon-purple hover:text-white rounded-xl transition-all text-white/40 flex items-center gap-2"
                    >
                      <MessageSquare size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">DM</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'hero' ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {heroBanners.map(hb => (
              <div key={hb.id} className="glass-card bg-[#121212] overflow-hidden border-white/5 group relative">
                <div className="aspect-[21/9] relative">
                  <img src={hb.image} alt={hb.title} className="w-full h-full object-cover opacity-60" />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-black/60 text-white`}>
                      {hb.type}
                    </span>
                    {!hb.isActive && (
                      <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-red-500 text-white">
                        INACTIVE
                      </span>
                    )}
                  </div>
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button onClick={() => setEditingItem(hb)} className="p-2 bg-black/60 rounded-lg hover:bg-neon-purple hover:text-white transition-all backdrop-blur-sm">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => setItemToDelete({id: hb.id, type: 'hero' as any})} className="p-2 bg-black/60 rounded-lg hover:bg-red-500 hover:text-white transition-all backdrop-blur-sm">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <h4 className="font-display font-black text-lg italic uppercase">{hb.title}</h4>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest line-clamp-1">{hb.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'orders' ? (
          <div className="space-y-4">
            {shopOrders.length === 0 ? (
              <div className="glass-card p-20 text-center text-white/20">
                <ShoppingBag size={48} className="mx-auto mb-4 opacity-10" />
                <p className="font-black uppercase tracking-widest text-xs">No orders found</p>
              </div>
            ) : (
              shopOrders.map((o) => (
                <div key={o.id} className="glass-card p-6 bg-[#121212] border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-neon-yellow overflow-hidden">
                        {o.image ? (
                          <img src={o.image} alt="Order" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Diamond size={32} />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-display font-black text-lg italic tracking-tight">{o.packageLabel || 'DIAMONDS'}</h4>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                            o.status === 'Pending' ? 'bg-orange-500/20 text-orange-400' :
                            o.status === 'Completed' ? 'bg-green-500/20 text-green-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {o.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-white/40 font-mono tracking-widest mb-1">UID: <span className="text-white">{o.playerInfo || (o as any).uid}</span> • ৳{o.price}</p>
                        <p className="text-[8px] text-white/20 font-black uppercase tracking-tighter">Order: {o.id} • {o.userEmail}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <button 
                        onClick={async () => {
                          const newInfo = window.prompt("Edit Player Info (UID/ID):", o.playerInfo);
                          const newImage = window.prompt("Edit Image URL (Optional):", o.image || "");
                          if (newInfo !== null) {
                            try {
                              setIsUpdating(o.id);
                              await updateShopOrder(o.id, { playerInfo: newInfo, image: newImage || undefined });
                              alert("Order updated successfully!");
                            } catch (error) {
                              alert("Failed to update order: " + getErrorMessage(error));
                            } finally {
                              setIsUpdating(null);
                            }
                          }
                        }}
                        className="p-3 bg-white/5 text-white/20 hover:text-neon-yellow hover:bg-neon-yellow/10 rounded-xl transition-all"
                      >
                        <Edit size={16} />
                      </button>
                      {o.status === 'Pending' && (
                        <>
                          <button 
                            onClick={() => handleUpdateShopOrder(o, 'Completed')}
                            disabled={isUpdating === o.id}
                            className="px-6 py-3 bg-green-500 text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50"
                          >
                            {isUpdating === o.id ? 'Wait...' : 'Confirm'}
                          </button>
                          <button 
                            onClick={() => handleUpdateShopOrder(o, 'Rejected')}
                            disabled={isUpdating === o.id}
                            className="px-6 py-3 bg-red-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50"
                          >
                            {isUpdating === o.id ? 'Wait...' : 'Reject'}
                          </button>
                        </>
                      )}
                      
                      <button 
                        onClick={() => handleDeleteShopOrder(o.id)}
                        disabled={isUpdating === o.id}
                        className="p-3 bg-white/5 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all disabled:opacity-50"
                      >
                        {isUpdating === o.id ? '...' : <Trash2 size={16} />}
                      </button>
                    </div>
                </div>
              ))
            )}
          </div>
        ) : activeTab === 'payments' ? (
          <div className="space-y-8">
            <div className="glass-card p-8 bg-[#121212] border-white/5">
              <h3 className="font-display font-black text-xl italic tracking-tight mb-6 uppercase">Manage <span className="text-neon-yellow">Payment Methods</span></h3>
              <form onSubmit={handleSavePaymentMethodLocal} className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Method Name</label>
                  <input 
                    required
                    type="text" 
                    value={paymentForm?.name || ''}
                    onChange={e => setPaymentForm({...paymentForm, name: e.target.value})}
                    placeholder="e.g. bKash"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow font-bold uppercase transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Account Number</label>
                  <input 
                    required
                    type="text" 
                    value={paymentForm?.number || ''}
                    onChange={e => setPaymentForm({...paymentForm, number: e.target.value})}
                    placeholder="e.g. 017xxxxxxxx"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow font-bold transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Transaction Type</label>
                  <select 
                    required
                    value={paymentForm?.type || 'Send Money'}
                    onChange={e => setPaymentForm({...paymentForm, type: e.target.value as any})}
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow font-bold uppercase cursor-pointer"
                  >
                    <option value="Send Money">Send Money</option>
                    <option value="Cash Out">Cash Out</option>
                    <option value="Pay">Pay</option>
                  </select>
                </div>
                <button type="submit" disabled={isUploading} className="bg-neon-yellow text-black py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(250,204,21,0.2)]">
                  {isUploading ? 'SAVING...' : paymentForm?.id ? 'UPDATE METHOD' : 'ADD METHOD'}
                </button>
              </form>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paymentMethods.length === 0 ? (
                <div className="col-span-full py-20 text-center bg-white/2 rounded-3xl border border-dashed border-white/10">
                  <p className="text-white/20 font-black uppercase tracking-widest text-xs">No payment methods configured</p>
                </div>
              ) : paymentMethods.map(m => (
                <div key={m.id} className="glass-card p-6 bg-[#121212] border-white/5 relative group border-l-4 border-l-neon-purple transition-all hover:bg-white/5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-white/5 rounded-xl text-white/60">
                      <CreditCard size={24} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setPaymentForm(m)} className="p-2 bg-white/5 rounded-lg hover:bg-neon-purple hover:text-white transition-all">
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeletePaymentMethod(m.id)}
                        className="p-2 bg-white/5 rounded-lg hover:bg-red-500 hover:text-white transition-all text-red-500/50 hover:text-white"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-display font-black text-2xl italic tracking-tight">{m.name}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-4">{m.number}</p>
                  
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                    <span className="px-2 py-1 bg-neon-purple/20 text-neon-purple rounded text-[9px] font-black uppercase tracking-[0.2em]">{m.type}</span>
                    <button 
                      onClick={() => savePaymentMethod({ ...m, isEnabled: !m.isEnabled })}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${m.isEnabled ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}
                    >
                      {m.isEnabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      {m.isEnabled ? 'ACTIVE' : 'OFFLINE'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-white/20">
            <Zap size={48} className="mx-auto mb-4 opacity-10" />
            <p className="font-black uppercase tracking-widest text-xs italic">Select a tab to view content</p>
          </div>
        )}
      </div>
      
      {/* DM Modal */}
      <AnimatePresence>
        {selectedPlayer && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPlayer(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#121212] border border-white/10 rounded-3xl overflow-hidden shadow-2xl p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-neon-purple/20 text-neon-purple rounded-xl">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-xl italic uppercase tracking-tight">Direct <span className="text-neon-purple">Message</span></h3>
                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">TO: {selectedPlayer.name}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedPlayer(null)} className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-all">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <textarea 
                  value={directMsg}
                  onChange={(e) => setDirectMsg(e.target.value)}
                  placeholder="Type your private message to the user..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-xs font-bold outline-none focus:border-neon-purple h-40 resize-none transition-all"
                />
                <button 
                  onClick={async () => {
                    if (!directMsg.trim()) return;
                    setIsSendingMsg(true);
                    try {
                      await addNotification(selectedPlayer.uid, {
                        title: 'Admin Message',
                        message: directMsg,
                        type: 'Announcement'
                      });
                      alert("Message sent successfully!");
                      setDirectMsg('');
                      setSelectedPlayer(null);
                    } catch (e: any) {
                      alert("Failed to send message: " + e.message);
                    } finally {
                      setIsSendingMsg(false);
                    }
                  }}
                  disabled={isSendingMsg || !directMsg.trim()}
                  className="w-full py-4 bg-neon-purple text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_30px_rgba(168,85,247,0.3)] disabled:opacity-50"
                >
                  {isSendingMsg ? 'SENDING...' : 'SEND MESSAGE'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Editor Modal */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setEditingItem(null); setSelectedFile(null); }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#121212] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/3">
                <h2 className="text-2xl font-display font-black tracking-tighter italic">
                  {editingItem.id ? 'EDIT' : 'CREATE'} <span className="text-neon-yellow">{
                    activeTab === 'tournaments' ? 'TOURNAMENT' : 
                    activeTab === 'hero' ? 'BANNER' : 
                    'PACKAGE'
                  }</span>
                </h2>
                <button onClick={() => { setEditingItem(null); setSelectedFile(null); }} className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-all">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={
                activeTab === 'hero' ? handleSaveHeroBanner : 
                activeTab === 'tournaments' ? handleSaveTournament : 
                handleSavePackage
              } className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {activeTab === 'hero' ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="col-span-2 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Banner Title</label>
                      <input 
                        required
                        type="text" 
                        value={editingItem.title || ''} 
                        onChange={e => setEditingItem({...editingItem, title: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow transition-all font-bold"
                        placeholder="e.g. LIVE: PRO RUSH MATCH"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Subtitle / Caption</label>
                      <input 
                        type="text" 
                        value={editingItem.subtitle || ''} 
                        onChange={e => setEditingItem({...editingItem, subtitle: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow transition-all font-bold"
                        placeholder="e.g. Watch the best players fight for ৳10,000"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Banner Type</label>
                      <select 
                        value={editingItem.type || 'Live'} 
                        onChange={e => setEditingItem({...editingItem, type: e.target.value as any})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow transition-all font-bold text-white"
                      >
                        <option value="Live" className="bg-[#121212]">LIVE MATCH</option>
                        <option value="Ad" className="bg-[#121212]">AD / SPONSOR</option>
                        <option value="Announcement" className="bg-[#121212]">ANNOUNCEMENT</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Status</label>
                      <select 
                        value={editingItem.isActive !== false ? 'Active' : 'Inactive'} 
                        onChange={e => setEditingItem({...editingItem, isActive: e.target.value === 'Active'})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow transition-all font-bold text-white"
                      >
                        <option value="Active" className="bg-[#121212]">ACTIVE (Visible)</option>
                        <option value="Inactive" className="bg-[#121212]">INACTIVE (Hidden)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Button Text</label>
                      <input 
                        type="text" 
                        value={editingItem.buttonText || 'WATCH LIVE'} 
                        onChange={e => setEditingItem({...editingItem, buttonText: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow transition-all font-bold"
                        placeholder="e.g. WATCH LIVE"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Action URL / Stream Link</label>
                      <input 
                        type="text" 
                        value={editingItem.link || ''} 
                        onChange={e => setEditingItem({...editingItem, link: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow transition-all font-bold"
                        placeholder="e.g. https://youtube.com/live/..."
                      />
                    </div>
                    <div className="space-y-4 col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Banner Image</label>
                      <div className="flex flex-col md:flex-row gap-4">
                        {editingItem.image && (
                          <div className="w-40 h-24 rounded-xl overflow-hidden border border-white/10 shrink-0">
                            <img src={editingItem.image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        )}
                        <div className="flex-1">
                          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:bg-white/5 transition-all">
                            <div className="flex flex-col items-center justify-center pt-2 pb-2">
                              <ImageIcon className="w-8 h-8 text-white/20 mb-1" />
                              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest text-center">
                                {selectedFile ? selectedFile.name : (editingItem.image ? 'Change Image' : 'Upload Banner Image')}
                              </p>
                            </div>
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : activeTab === 'tournaments' ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="col-span-2 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Tournament Title</label>
                      <input 
                        required
                        type="text" 
                        value={editingItem.title || ''} 
                        onChange={e => setEditingItem({...editingItem, title: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow transition-all font-bold"
                        placeholder="e.g. Pro Solo Rush"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Entry Fee (৳)</label>
                      <input 
                        required
                        type="number" 
                        value={editingItem.entryFee || ''} 
                        onChange={e => setEditingItem({...editingItem, entryFee: Number(e.target.value)})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow transition-all font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Prize Pool (৳)</label>
                      <input 
                        required
                        type="number" 
                        value={editingItem.prizePool || ''} 
                        onChange={e => setEditingItem({...editingItem, prizePool: Number(e.target.value)})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow transition-all font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Per Kill (৳)</label>
                      <input 
                        type="number" 
                        value={editingItem.perKill || 0} 
                        onChange={e => setEditingItem({...editingItem, perKill: Number(e.target.value)})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow transition-all font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Total Slots</label>
                      <input 
                        required
                        type="number" 
                        value={editingItem.slotsTotal || 48} 
                        onChange={e => {
                          const total = Number(e.target.value);
                          setEditingItem({...editingItem, slotsTotal: total, slotsLeft: total});
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow transition-all font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Registration Status</label>
                      <select 
                        value={editingItem.registrationOpen !== false ? 'Open' : 'Closed'} 
                        onChange={e => setEditingItem({...editingItem, registrationOpen: e.target.value === 'Open'})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow transition-all font-bold text-white"
                      >
                        <option value="Open" className="bg-[#121212]">REGISTRATION OPEN</option>
                        <option value="Closed" className="bg-[#121212]">REGISTRATION CLOSED</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Tournament Type</label>
                      <select 
                        value={editingItem.type || 'Solos'} 
                        onChange={e => {
                          const type = e.target.value as any;
                          const defaultSlots = type === 'Solos' ? 48 : type === 'Duos' ? 24 : 12;
                          setEditingItem({...editingItem, type, slotsTotal: defaultSlots, slotsLeft: defaultSlots});
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow transition-all font-bold text-white"
                      >
                        <option value="Solos" className="bg-[#121212]">SOLO MISSION (48 Slots)</option>
                        <option value="Duos" className="bg-[#121212]">DUO SQUAD (24 Slots)</option>
                        <option value="Squads" className="bg-[#121212]">FULL SQUAD (12 Slots)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Map Name</label>
                      <select 
                        value={editingItem.map || 'Bermuda'} 
                        onChange={e => setEditingItem({...editingItem, map: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow transition-all font-bold text-white"
                      >
                        <option value="Bermuda" className="bg-[#121212]">BERMUDA</option>
                        <option value="Purgatory" className="bg-[#121212]">PURGATORY</option>
                        <option value="Kalahari" className="bg-[#121212]">KALAHARI</option>
                        <option value="Alpine" className="bg-[#121212]">ALPINE</option>
                        <option value="NeXTerra" className="bg-[#121212]">NEXTERRA</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Status</label>
                      <select 
                        value={editingItem.status || 'Upcoming'} 
                        onChange={e => setEditingItem({...editingItem, status: e.target.value as any})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow transition-all font-bold text-white"
                      >
                        <option value="Upcoming" className="bg-[#121212]">UPCOMING</option>
                        <option value="Live" className="bg-[#121212]">LIVE / ONGOING</option>
                        <option value="Completed" className="bg-[#121212]">COMPLETED</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Start Time</label>
                      <input 
                        required
                        type="text" 
                        value={editingItem.startTime || ''} 
                        onChange={e => setEditingItem({...editingItem, startTime: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow transition-all font-bold"
                        placeholder="e.g. Apr 25, 10:00 PM"
                      />
                    </div>
                    <div className="space-y-4 col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Tournament Image</label>
                      <div className="flex flex-col md:flex-row gap-4">
                        {editingItem.image && (
                          <div className="w-24 h-24 rounded-xl overflow-hidden border border-white/10 shrink-0">
                            <img src={editingItem.image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        )}
                        <div className="flex-1">
                          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:bg-white/5 transition-all">
                            <div className="flex flex-col items-center justify-center pt-2 pb-2">
                              <ImageIcon className="w-8 h-8 text-white/20 mb-1" />
                              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                                {selectedFile ? selectedFile.name : 'Upload Tournament Image'}
                              </p>
                            </div>
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {editingItem.status === 'Completed' && (
                      <div className="col-span-2 border-t border-white/5 pt-6 mt-2 space-y-6">
                        <div className="flex items-center gap-3">
                          <Trophy className="text-neon-yellow" size={20} />
                          <h3 className="font-display font-black text-lg italic uppercase tracking-tighter">Winner Details</h3>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Winner Name / Team Name</label>
                            <input 
                              type="text" 
                              value={editingItem.winnerName || ''} 
                              onChange={e => setEditingItem({...editingItem, winnerName: e.target.value})}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow transition-all font-bold"
                              placeholder="e.g. TEAM X-FORCE"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Prize Amount Won (৳)</label>
                            <input 
                              type="number" 
                              value={editingItem.winnerPrize || ''} 
                              onChange={e => setEditingItem({...editingItem, winnerPrize: Number(e.target.value)})}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow transition-all font-bold text-neon-yellow"
                              placeholder="e.g. 5000"
                            />
                          </div>
                          
                          <div className="col-span-2 space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Select Winner (Participant)</label>
                            <select 
                              value={editingItem.winnerUserId || ''}
                              onChange={e => {
                                const selected = editingTournamentRegs.find(r => r.userId === e.target.value);
                                setEditingItem({
                                  ...editingItem, 
                                  winnerUserId: e.target.value,
                                  winnerName: selected ? (selected.teamName || selected.userName) : editingItem.winnerName
                                });
                              }}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow transition-all font-bold text-white"
                            >
                              <option value="" className="bg-[#121212]">Select a participant...</option>
                              {editingTournamentRegs.map(reg => (
                                <option key={reg.id} value={reg.userId} className="bg-[#121212]">
                                  {reg.teamName ? `${reg.teamName} (${reg.userName})` : reg.userName}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-2 space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Winner Details / Quote</label>
                            <textarea 
                              value={editingItem.winnerDetails || ''} 
                              onChange={e => setEditingItem({...editingItem, winnerDetails: e.target.value})}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow transition-all font-bold h-24 resize-none"
                              placeholder="e.g. Incredible performance by Team X-Force in the final zone!"
                            />
                          </div>
                          
                          <div className="col-span-2 space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Winner / Team Photo</label>
                            <div className="flex flex-col md:flex-row gap-4">
                              {editingItem.winnerPhoto && (
                                <div className="w-24 h-24 rounded-xl overflow-hidden border border-white/10 shrink-0">
                                  <img src={editingItem.winnerPhoto} alt="Winner" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                </div>
                              )}
                              <div className="flex-1">
                                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:bg-white/5 transition-all">
                                  <div className="flex flex-col items-center justify-center pt-2 pb-2">
                                    <ImageIcon className="w-8 h-8 text-white/20 mb-1" />
                                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest text-center">
                                      {winnerFile ? winnerFile.name : 'Upload Winner Photo'}
                                    </p>
                                  </div>
                                  <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={(e) => setWinnerFile(e.target.files ? e.target.files[0] : null)}
                                  />
                                </label>
                              </div>
                            </div>
                          </div>

                          <div className="col-span-2 flex items-center gap-2 p-4 bg-neon-purple/10 border border-neon-purple/20 rounded-xl">
                            <Bell className="text-neon-purple shrink-0" size={18} />
                            <p className="text-[10px] font-bold text-white/60 uppercase tracking-tight">
                              Saving winner details will automatically notify the participants about the match results.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2 col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">External Info Link (Optional)</label>
                      <div className="space-y-1">
                        <p className="text-[8px] text-neon-yellow font-bold uppercase italic">"Register and click the link for match information."</p>
                        <input 
                          type="text" 
                          value={editingItem.externalLink || ''} 
                          onChange={e => setEditingItem({...editingItem, externalLink: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow transition-all font-bold"
                          placeholder="e.g. https://chat.whatsapp.com/..."
                        />
                      </div>
                    </div>
                    <div className="space-y-2 col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Short Caption (Mini Description)</label>
                      <input 
                        type="text" 
                        value={editingItem.caption || ''} 
                        onChange={e => setEditingItem({...editingItem, caption: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow transition-all font-bold"
                        placeholder="e.g. Join the ultimate battle today!"
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Full Description</label>
                      <textarea 
                        value={editingItem.description || ''} 
                        onChange={e => setEditingItem({...editingItem, description: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow transition-all font-bold h-32 resize-none"
                        placeholder="Describe the tournament details..."
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Rules & Regulations</label>
                      <textarea 
                        value={editingItem.rules || ''} 
                        onChange={e => setEditingItem({...editingItem, rules: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow transition-all font-bold h-32 resize-none"
                        placeholder="Enter tournament rules..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Game</label>
                      <input 
                        type="text" 
                        value={editingItem.game || 'Free Fire'} 
                        onChange={e => setEditingItem({...editingItem, game: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow transition-all font-bold"
                        placeholder="e.g. Free Fire"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Platform / Device</label>
                      <input 
                        type="text" 
                        value={editingItem.platform || 'Mobile'} 
                        onChange={e => setEditingItem({...editingItem, platform: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow transition-all font-bold"
                        placeholder="e.g. Mobile, Emulators Not Allowed"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Mode</label>
                      <select 
                        value={editingItem.type || 'Solos'}
                        onChange={e => setEditingItem({...editingItem, type: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow transition-all font-bold uppercase"
                      >
                        <option value="Solos">Solos</option>
                        <option value="Duos">Duos</option>
                        <option value="Squads">Squads</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Status</label>
                      <select 
                        value={editingItem.status || 'Upcoming'}
                        onChange={e => setEditingItem({...editingItem, status: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow transition-all font-bold uppercase"
                      >
                        <option value="Upcoming">Upcoming</option>
                        <option value="Ongoing">Ongoing (Live)</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="col-span-2 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Package Label / Name</label>
                      <input 
                        required
                        type="text" 
                        value={editingItem.label || ''} 
                        onChange={e => setEditingItem({...editingItem, label: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow transition-all font-bold"
                        placeholder="e.g. BASIC PACK"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Diamonds / Amount String</label>
                      <input 
                        required
                        type="text" 
                        value={editingItem.amount || ''} 
                        onChange={e => setEditingItem({...editingItem, amount: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow transition-all font-bold underline decoration-neon-yellow decoration-2 underline-offset-4"
                        placeholder="e.g. 115 DIAMONDS"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Price (৳)</label>
                      <input 
                        required
                        type="number" 
                        value={editingItem.price || ''} 
                        onChange={e => setEditingItem({...editingItem, price: Number(e.target.value)})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow transition-all font-bold"
                        placeholder="e.g. 85"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Badge (e.g. HOT, BONUS)</label>
                      <input 
                        type="text" 
                        value={editingItem.badge || ''} 
                        onChange={e => setEditingItem({...editingItem, badge: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow transition-all font-bold"
                        placeholder="e.g. HOT"
                      />
                    </div>
                    <div className="col-span-2 space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Package Image (Optional)</label>
                      <div className="flex flex-col md:flex-row gap-4">
                        {editingItem.image && (
                          <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/10 shrink-0">
                            <img src={editingItem.image} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:bg-white/5 transition-all">
                          <div className="flex flex-col items-center justify-center pt-2 pb-2">
                            <ImageIcon className="w-8 h-8 text-white/20 mb-1" />
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                              {selectedFile ? selectedFile.name : 'Upload Package Image'}
                            </p>
                          </div>
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                          />
                        </label>
                      </div>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Visibility Status</label>
                      <select 
                        value={editingItem.isActive !== false ? 'Active' : 'Inactive'} 
                        onChange={e => setEditingItem({...editingItem, isActive: e.target.value === 'Active'})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-neon-yellow transition-all font-bold text-white"
                      >
                        <option value="Active" className="bg-[#121212]">ACTIVE (Visible in Shop)</option>
                        <option value="Inactive" className="bg-[#121212]">INACTIVE (Hidden)</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="pt-6 flex gap-4">
                  <button 
                    type="submit"
                    disabled={isUploading}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-neon-yellow text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(250,204,21,0.3)] disabled:opacity-50"
                  >
                    {isUploading ? (
                      <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    ) : (
                      <Save size={18} />
                    )}
                    {isUploading ? 'UPLOADING...' : 'Save Changes'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setEditingItem(null); setSelectedFile(null); }}
                    className="px-8 py-4 bg-white/5 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Registrations List Modal */}
      <AnimatePresence>
        {selectedTournament && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTournament(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-[#121212] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/3">
                <div>
                  <h2 className="text-2xl font-display font-black tracking-tighter italic uppercase">
                    REGISTRATIONS: <span className="text-neon-yellow">{selectedTournament.title}</span>
                  </h2>
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mt-1">
                    {registrations.length} Teams Registered • {selectedTournament.type}
                  </p>
                </div>
                <button onClick={() => setSelectedTournament(null)} className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-all">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {/* Admin Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-white/3 border border-white/5 rounded-2xl space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-white/40">Mass Notification</h3>
                    <textarea 
                      value={notificationMsg}
                      onChange={(e) => setNotificationMsg(e.target.value)}
                      placeholder="Send a message to all participants..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[11px] font-bold outline-none focus:border-neon-yellow h-24 resize-none"
                    />
                    <button 
                      onClick={handleNotifyParticipants}
                      disabled={isSendingNotif || !notificationMsg.trim()}
                      className="w-full py-3 bg-neon-purple text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-neon-purple/80 disabled:opacity-50"
                    >
                      {isSendingNotif ? 'Sending...' : 'Notify All Participants'}
                    </button>
                  </div>

                  <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-2xl space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-red-500/60">Danger Zone</h3>
                    <p className="text-[9px] font-bold text-white/40 uppercase leading-relaxed">
                      Cancel this match and refund entry fees to all registered users. This should only be used if the match cannot proceed.
                    </p>
                    <button 
                      onClick={handleRefundTournament}
                      disabled={isRefunding || registrations.length === 0}
                      className="w-full py-3 bg-red-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 disabled:opacity-50"
                    >
                      {isRefunding ? 'Refunding...' : 'Cancel Match & Refund All'}
                    </button>
                  </div>
                </div>

                {/* Participants Table */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-white/40">Participants List</h3>
                  {isLoadingRegistrations ? (
                    <div className="py-12 flex justify-center">
                      <div className="w-8 h-8 border-2 border-neon-yellow/10 border-t-neon-yellow rounded-full animate-spin" />
                    </div>
                  ) : registrations.length === 0 ? (
                    <div className="py-12 text-center bg-white/2 rounded-2xl border border-dashed border-white/10">
                      <p className="text-white/20 font-black uppercase tracking-widest text-[10px]">No registrations yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/5">
                            <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-white/40">Team/User</th>
                            <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-white/40">Player Details (Name | UID | Lv)</th>
                            <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-white/40">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {registrations.map((reg) => (
                            <tr key={reg.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                              <td className="py-6 px-4">
                                <p className="text-xs font-black uppercase text-neon-yellow mb-1">{reg.teamName || 'SOLO PLAYER'}</p>
                                <p className="text-[9px] font-bold text-white/40 uppercase">{reg.userName}</p>
                                <p className="text-[8px] font-mono text-white/20 uppercase mt-1">{reg.userEmail}</p>
                              </td>
                              <td className="py-6 px-4 space-y-2">
                                {reg.players.map((p, idx) => (
                                  <div key={idx} className="flex items-center gap-2 text-[10px] font-bold">
                                    <span className="text-neon-purple text-[8px] font-black w-4">P{idx + 1}</span>
                                    <span className="text-white uppercase">{p.gameName}</span>
                                    <span className="text-white/30">|</span>
                                    <span className="text-white/60">{p.gameUid}</span>
                                    <span className="text-white/30">|</span>
                                    <span className="text-neon-yellow">LV.{p.gameLevel}</span>
                                  </div>
                                ))}
                              </td>
                              <td className="py-6 px-4">
                                <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded text-[9px] font-black uppercase tracking-widest">
                                  {reg.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setItemToDelete(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-[#121212] border border-red-500/20 rounded-3xl p-8 shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={40} />
              </div>
              <h3 className="font-display font-black text-2xl italic uppercase mb-2">Are you sure?</h3>
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-8 leading-relaxed">
                This action is permanent and cannot be undone. All associated data will be lost.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    if (itemToDelete.type === 'tournament') handleDeleteTournament(itemToDelete.id);
                    else if (itemToDelete.type === 'package') handleDeletePackage(itemToDelete.id);
                    else if (itemToDelete.type === 'code') handleDeleteCode(itemToDelete.id);
                    else if (itemToDelete.type === 'withdrawal') handleDeleteWithdrawal(itemToDelete.id);
                    else if (itemToDelete.type === 'event') handleDeleteEvent(itemToDelete.id);
                    else if (itemToDelete.type === 'hero' as any) handleDeleteHeroBanner(itemToDelete.id);
                    setItemToDelete(null);
                  }}
                  className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                >
                  Delete Now
                </button>
                <button 
                  onClick={() => setItemToDelete(null)}
                  className="flex-1 py-4 bg-white/5 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
