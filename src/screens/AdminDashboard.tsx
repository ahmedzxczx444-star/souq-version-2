import React, { useState, useEffect } from "react";
import { User, AdminStats, ActivityLog, Car, Dealer } from "../types";
import { api } from "../services/api";
import { 
  LayoutDashboard, 
  Car as CarIcon, 
  Users, 
  Store, 
  History, 
  LogOut, 
  Trash2, 
  EyeOff, 
  ShieldAlert, 
  Ban, 
  Edit, 
  CheckCircle,
  XCircle,
  Search,
  ChevronRight,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
  t: any;
}

type AdminSection = 'dashboard' | 'cars' | 'dealers' | 'users' | 'activity' | 'requests';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout, t }) => {
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [cars, setCars] = useState<Car[]>([]);
  const [dealers, setDealers] = useState<any[]>([]);
  const [pendingDealers, setPendingDealers] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchData();
  }, [activeSection]);

  const fetchData = async () => {
    setLoading(true);
    try {
      switch (activeSection) {
        case 'dashboard':
          const statsData = await api.admin.getStats();
          setStats(statsData);
          break;
        case 'cars':
          const carsData = await api.admin.getCars();
          setCars(carsData);
          break;
        case 'dealers':
          const dealersData = await api.admin.getDealers('active');
          setDealers(dealersData);
          break;
        case 'requests':
          const pendingData = await api.admin.getDealers('pending');
          setPendingDealers(pendingData);
          break;
        case 'users':
          const usersData = await api.admin.getUsers();
          setUsers(usersData);
          break;
        case 'activity':
          const activityData = await api.admin.getActivity();
          setActivity(activityData);
          break;
      }
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCar = async (id: number) => {
    if (confirm("Are you sure you want to delete this car?")) {
      await api.admin.deleteCar(id);
      fetchData();
    }
  };

  const handleHideCar = async (id: number) => {
    await api.admin.hideCar(id);
    fetchData();
  };

  const handleApproveDealer = async (id: number) => {
    if (confirm("Approve this dealer?")) {
      await api.admin.approveDealer(id);
      fetchData();
    }
  };

  const handleRejectDealer = async (id: number) => {
    if (confirm("Reject and disable this dealer account?")) {
      await api.admin.rejectDealer(id);
      fetchData();
    }
  };

  const handleSuspendDealer = async (id: number) => {
    if (confirm("Are you sure you want to suspend this dealer?")) {
      await api.admin.suspendDealer(id);
      fetchData();
    }
  };

  const handleDeleteDealer = async (id: number) => {
    if (confirm("Are you sure you want to delete this dealer and all their cars?")) {
      await api.admin.deleteDealer(id);
      fetchData();
    }
  };

  const handleBanUser = async (id: number) => {
    if (confirm("Are you sure you want to ban this user?")) {
      await api.admin.banUser(id);
      fetchData();
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (confirm("Are you sure you want to delete this user?")) {
      await api.admin.deleteUser(id);
      fetchData();
    }
  };

  if (user.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-3xl shadow-xl border border-red-100">
          <ShieldAlert size={64} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-500 mb-6">You do not have permission to access the admin panel.</p>
          <button onClick={onLogout} className="bg-gray-900 text-white px-8 py-3 rounded-2xl font-bold">Logout</button>
        </div>
      </div>
    );
  }

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'cars', label: 'Cars', icon: CarIcon },
    { id: 'dealers', label: 'Dealers', icon: Store },
    { id: 'requests', label: 'Dealer Requests', icon: ShieldAlert },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'activity', label: 'Activity Log', icon: History },
  ];

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-gray-100 flex flex-col">
        <div className="p-8">
          <h1 className="text-2xl font-black tracking-tight text-emerald-600">Admin Panel</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Super Admin Access</p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as AdminSection)}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl font-bold transition-all ${
                activeSection === item.id 
                  ? "bg-emerald-50 text-emerald-600 shadow-sm" 
                  : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
              {activeSection === item.id && <ChevronRight size={16} className="ml-auto" />}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-gray-50">
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center font-black text-gray-600">
              {user.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{user.name}</p>
              <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl font-bold text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-12">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-4xl font-black text-gray-900 capitalize">{activeSection}</h2>
            <p className="text-gray-400 font-medium mt-1">Manage your platform's data and activity.</p>
          </div>
          
          <div className="relative w-80">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-6 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-emerald-500" size={32} />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeSection === 'dashboard' && stats && (
                <div className="grid grid-cols-3 gap-8">
                  <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
                    <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-6">
                      <CarIcon size={24} />
                    </div>
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-1">Total Cars</p>
                    <h3 className="text-4xl font-black text-gray-900">{stats.totalCars}</h3>
                  </div>
                  <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-6">
                      <Store size={24} />
                    </div>
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-1">Total Dealers</p>
                    <h3 className="text-4xl font-black text-gray-900">{stats.totalDealers}</h3>
                  </div>
                  <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
                    <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center mb-6">
                      <Users size={24} />
                    </div>
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-1">Total Users</p>
                    <h3 className="text-4xl font-black text-gray-900">{stats.totalUsers}</h3>
                  </div>
                </div>
              )}

              {activeSection === 'cars' && (
                <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-50">
                        <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Car</th>
                        <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Dealer</th>
                        <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Price</th>
                        <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                        <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {cars.filter(c => `${c.make} ${c.model}`.toLowerCase().includes(searchQuery.toLowerCase())).map(car => (
                        <tr key={car.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <img src={car.images[0]} className="w-12 h-12 rounded-xl object-cover" referrerPolicy="no-referrer" />
                              <div>
                                <p className="font-bold text-gray-900">{car.make} {car.model}</p>
                                <p className="text-xs text-gray-400 font-medium">{car.year} • {car.mileage.toLocaleString()} km</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <p className="font-bold text-gray-600">{car.dealer_name}</p>
                          </td>
                          <td className="px-8 py-6">
                            <p className="font-black text-emerald-600">{car.price.toLocaleString()} EGP</p>
                          </td>
                          <td className="px-8 py-6">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              car.status === 'available' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {car.status}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => handleHideCar(car.id)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all" title="Hide">
                                <EyeOff size={18} />
                              </button>
                              <button onClick={() => handleDeleteCar(car.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeSection === 'dealers' && (
                <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-50">
                        <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Dealer</th>
                        <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Contact</th>
                        <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Cars</th>
                        <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {dealers.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase())).map(dealer => (
                        <tr key={dealer.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <img src={dealer.logo} className="w-12 h-12 rounded-xl object-cover" referrerPolicy="no-referrer" />
                              <div>
                                <p className="font-bold text-gray-900">{dealer.name}</p>
                                <p className="text-xs text-gray-400 font-medium">{dealer.location}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <p className="font-bold text-gray-600 text-sm">{dealer.email}</p>
                            <p className="text-xs text-gray-400 font-medium">{dealer.phone}</p>
                          </td>
                          <td className="px-8 py-6">
                            <span className="bg-gray-100 px-3 py-1 rounded-full text-xs font-bold text-gray-600">
                              {dealer.car_count} cars
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => handleSuspendDealer(dealer.id)} className="p-2 text-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all" title="Suspend">
                                <Ban size={18} />
                              </button>
                              <button onClick={() => handleDeleteDealer(dealer.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeSection === 'requests' && (
                <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-50">
                        <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Dealer</th>
                        <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Contact</th>
                        <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Branches</th>
                        <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Address</th>
                        <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {pendingDealers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-8 py-12 text-center text-gray-400 font-bold">No pending requests</td>
                        </tr>
                      ) : (
                        pendingDealers.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase())).map(dealer => (
                          <tr key={dealer.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                <img src={dealer.logo} className="w-12 h-12 rounded-xl object-cover" referrerPolicy="no-referrer" />
                                <div>
                                  <p className="font-bold text-gray-900">{dealer.name}</p>
                                  <p className="text-xs text-gray-400 font-medium">{dealer.location}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <p className="font-bold text-gray-600 text-sm">{dealer.email}</p>
                              <p className="text-xs text-gray-400 font-medium">{dealer.phone}</p>
                            </td>
                            <td className="px-8 py-6">
                              <span className="bg-gray-100 px-3 py-1 rounded-full text-xs font-bold text-gray-600">
                                {dealer.branches_count} branches
                              </span>
                            </td>
                            <td className="px-8 py-6">
                              <p className="text-xs text-gray-500 font-medium max-w-[200px]">{dealer.address}</p>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => handleApproveDealer(dealer.id)} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all" title="Approve">
                                  <CheckCircle size={20} />
                                </button>
                                <button onClick={() => handleRejectDealer(dealer.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all" title="Reject">
                                  <XCircle size={20} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeSection === 'users' && (
                <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-50">
                        <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">User</th>
                        <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Role</th>
                        <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                        <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase())).map(u => (
                        <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-8 py-6">
                            <p className="font-bold text-gray-900">{u.name}</p>
                            <p className="text-xs text-gray-400 font-medium">{u.email}</p>
                          </td>
                          <td className="px-8 py-6">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              u.role === 'dealer' ? 'bg-blue-50 text-blue-600' : u.role === 'super_admin' ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            {u.is_verified === -1 ? (
                              <span className="flex items-center gap-1 text-red-500 text-xs font-bold">
                                <XCircle size={14} /> Banned
                              </span>
                            ) : u.is_verified ? (
                              <span className="flex items-center gap-1 text-emerald-500 text-xs font-bold">
                                <CheckCircle size={14} /> Verified
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-gray-400 text-xs font-bold">
                                Unverified
                              </span>
                            )}
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => handleBanUser(u.id)} className="p-2 text-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all" title="Ban">
                                <Ban size={18} />
                              </button>
                              <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeSection === 'activity' && (
                <div className="space-y-4">
                  {activity.map((log) => (
                    <div key={log.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-6">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        log.action.includes('deleted') || log.action.includes('suspended') || log.action.includes('banned')
                          ? 'bg-red-50 text-red-500'
                          : log.action.includes('added') || log.action.includes('followed')
                          ? 'bg-emerald-50 text-emerald-500'
                          : 'bg-blue-50 text-blue-500'
                      }`}>
                        <History size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-bold text-gray-900">{log.action}</h4>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 font-medium">{log.details}</p>
                        <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest">By: {log.user_name || 'System'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
};
