import { useState, useEffect, useCallback, useRef, FormEvent } from 'react';
import { 
  LayoutGrid, 
  Cpu, 
  ClipboardList, 
  Settings, 
  Bell, 
  LogOut, 
  Bot, 
  Search, 
  Filter, 
  Plus,
  RefreshCw,
  Zap,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Info,
  Rocket,
  MemoryStick,
  Power,
  Factory,
  Waves,
  Thermometer,
  ShieldAlert,
  MoreHorizontal,
  Sun,
  Moon,
  User,
  Activity,
  Shield,
  Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { ROBOTS, TASKS, SESSIONS } from './constants';
import { Robot, Task, Session } from './types';

type View = 'dashboard' | 'fleet' | 'tasks' | 'settings' | 'profile';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isMobile, setIsMobile] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'fleet', label: 'Fleet', icon: Cpu },
    { id: 'tasks', label: 'Tasks', icon: ClipboardList },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-brand-bg text-stone-900 dark:text-stone-100 transition-colors duration-300">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="fixed left-0 top-0 h-screen w-64 border-r border-brand-outline-variant/20 bg-brand-surface-lowest py-8 flex flex-col z-40">
          <div className="px-8 mb-12">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 bg-brand-primary rounded-lg flex items-center justify-center text-white">
                <LayoutGrid size={24} />
              </div>
              <div>
                <h1 className="text-brand-primary font-black tracking-tighter text-xl uppercase leading-none">GRIDROBOT</h1>
                <p className="text-[10px] text-stone-600 dark:text-brand-outline font-bold uppercase tracking-widest mt-1">Simulation Lead</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as View)}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group",
                  currentView === item.id 
                    ? "bg-brand-primary/5 text-brand-primary font-bold border-r-4 border-brand-primary" 
                    : "text-stone-500 dark:text-stone-400 hover:text-brand-primary hover:bg-brand-surface-low"
                )}
              >
                <item.icon size={20} className={cn(currentView === item.id ? "text-brand-primary" : "text-stone-400 dark:text-stone-500 group-hover:text-brand-primary")} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-auto px-6 pt-6 border-t border-brand-outline-variant/20">
            <div 
              onClick={() => setCurrentView('profile')}
              className={cn(
                "flex items-center gap-3 p-2 rounded-xl transition-colors cursor-pointer",
                currentView === 'profile' ? "bg-brand-primary/10" : "hover:bg-brand-surface-low"
              )}
            >
              <img 
                src="https://picsum.photos/seed/operator/100/100" 
                alt="User" 
                className="w-10 h-10 rounded-full object-cover border-2 border-brand-primary/10"
              />
              <div className="flex flex-col">
                <span className="text-sm font-bold dark:text-white">Alex Rivera</span>
                <span className="text-[10px] text-brand-primary font-black uppercase tracking-widest">
                  ADMIN
                </span>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className={cn("flex-1 flex flex-col min-h-screen", !isMobile && "ml-64")}>
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-brand-bg/80 backdrop-blur-md border-b border-brand-outline-variant/10 h-16 flex items-center justify-between px-6 md:px-10">
          <div className="flex items-center gap-4">
            {isMobile && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center text-white">
                  <LayoutGrid size={18} />
                </div>
                <h1 className="text-brand-primary font-black tracking-tighter text-lg uppercase">GRIDROBOT</h1>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {isMobile && (
              <button 
                onClick={() => setCurrentView('profile')}
                className={cn(
                  "p-2 text-stone-500 dark:text-stone-400 hover:text-brand-primary transition-colors rounded-full",
                  currentView === 'profile' && "bg-brand-primary/10 text-brand-primary"
                )}
              >
                <User size={20} />
              </button>
            )}
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-stone-500 dark:text-stone-400 hover:text-brand-primary transition-colors bg-brand-surface-low rounded-full"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={cn(
                  "p-2 text-stone-500 dark:text-stone-400 hover:text-brand-primary transition-colors relative rounded-full",
                  showNotifications && "bg-brand-primary/10 text-brand-primary"
                )}
              >
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-error rounded-full border-2 border-brand-bg"></span>
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-brand-surface-lowest border border-brand-outline-variant/20 rounded-2xl shadow-xl z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-brand-outline-variant/10 flex justify-between items-center">
                      <h3 className="font-bold text-sm uppercase tracking-widest text-brand-primary">Notificaciones</h3>
                      <span className="text-[10px] font-bold text-stone-700 dark:text-brand-outline bg-brand-surface-low px-2 py-0.5 rounded-full">3 Nuevas</span>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {[
                        { id: 1, title: 'Robot R01', message: 'Llegada a destino exitosa.', time: 'Hace 2 min', type: 'success', icon: CheckCircle2 },
                        { id: 2, title: 'Alerta de Proximidad', message: 'Obstáculo detectado en cuadrícula 15,12.', time: 'Hace 5 min', type: 'warning', icon: AlertTriangle },
                        { id: 3, title: 'Sistema', message: 'Actualización de firmware completada.', time: 'Hace 1 hora', type: 'info', icon: Info },
                      ].map((notif) => (
                        <div key={notif.id} className="p-4 border-b border-brand-outline-variant/5 hover:bg-brand-surface-low transition-colors cursor-pointer group">
                          <div className="flex gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                              notif.type === 'success' && "bg-emerald-500/10 text-emerald-500",
                              notif.type === 'warning' && "bg-brand-error/10 text-brand-error",
                              notif.type === 'info' && "bg-brand-primary/10 text-brand-primary",
                            )}>
                              <notif.icon size={14} />
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-bold text-brand-primary group-hover:text-brand-primary transition-colors">{notif.title}</span>
                              <p className="text-[11px] text-stone-700 dark:text-brand-outline leading-tight">{notif.message}</p>
                              <span className="text-[9px] text-stone-500 dark:text-brand-outline/60 mt-1">{notif.time}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 bg-brand-surface text-center">
                      <button className="text-[10px] font-bold text-brand-primary uppercase tracking-widest hover:underline">Ver todas las alertas</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary text-white font-bold text-sm shadow-md hover:shadow-lg active:scale-95 transition-all">
              <span className="hidden sm:inline">Cerrar sesión</span>
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <div className="p-6 md:p-10 pb-32 md:pb-10 max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            {currentView === 'dashboard' && <DashboardView key="dashboard" />}
            {currentView === 'fleet' && <FleetView key="fleet" />}
            {currentView === 'tasks' && <TasksView key="tasks" />}
            {currentView === 'settings' && <SettingsView key="settings" />}
            {currentView === 'profile' && (
              <div key="profile">
                <ProfileView isAdmin={isAdmin} setIsAdmin={setIsAdmin} />
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 w-full z-50 bg-brand-bg/90 backdrop-blur-xl border-t border-brand-outline-variant/10 h-20 flex justify-around items-center px-4 pb-safe shadow-brand-soft">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as View)}
              className={cn(
                "flex flex-col items-center justify-center transition-all duration-300 px-4 py-2 rounded-2xl",
                currentView === item.id 
                  ? "text-brand-primary bg-brand-primary/10 scale-110" 
                  : "text-stone-400 dark:text-stone-500"
              )}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-bold uppercase tracking-widest mt-1">{item.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

function ProfileView({ isAdmin, setIsAdmin }: { isAdmin: boolean, setIsAdmin: (val: boolean) => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <section className="bg-brand-surface-lowest p-8 rounded-3xl shadow-brand-soft border border-brand-outline-variant/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-bl-full -mr-20 -mt-20"></div>
        
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="relative">
            <img 
              src="https://picsum.photos/seed/operator/300/300" 
              alt="Alex Rivera" 
              className="w-32 h-32 md:w-48 md:h-48 rounded-3xl object-cover border-4 border-brand-primary/10 shadow-xl"
            />
            <div className="absolute -bottom-2 -right-2 p-2 rounded-xl shadow-lg bg-brand-primary text-white">
              <ShieldAlert size={20} />
            </div>
          </div>
          
          <div className="text-center md:text-left space-y-4 flex-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                  <h2 className="text-3xl md:text-4xl font-black text-brand-primary tracking-tighter">Alex Rivera</h2>
                  <span className="px-3 py-1 bg-brand-primary text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm">
                    ADMIN
                  </span>
                </div>
                <p className="text-stone-600 dark:text-brand-outline font-medium">
                  Lead Simulation Engineer & Fleet Administrator
                </p>
              </div>

              <div className="flex items-center gap-2 bg-brand-primary/10 px-4 py-2 rounded-2xl border border-brand-primary/20 self-center md:self-start">
                <Shield size={16} className="text-brand-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Verified Administrator</span>
              </div>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <div className="px-4 py-2 bg-brand-surface-low rounded-xl border border-brand-outline-variant/20">
                <p className="text-[10px] font-bold text-stone-600 dark:text-brand-outline uppercase tracking-widest mb-1">Employee ID</p>
                <p className="font-mono text-sm font-bold">GR-992-ALPHA</p>
              </div>
              <div className="px-4 py-2 bg-brand-surface-low rounded-xl border border-brand-outline-variant/20">
                <p className="text-[10px] font-bold text-stone-600 dark:text-brand-outline uppercase tracking-widest mb-1">Clearance</p>
                <p className="font-mono text-sm font-bold">Level 5 (Omega)</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="bg-brand-surface-low p-8 rounded-3xl border border-brand-outline-variant/10 space-y-6">
          <h3 className="text-xl font-bold text-brand-primary flex items-center gap-2">
            <Info size={20} />
            Account Details
          </h3>
          <div className="space-y-4">
            <DetailItem label="Email" value="alex.rivera@gridrobot.tech" />
            <DetailItem label="Department" value="Autonomous Systems & Fleet Control" />
            <DetailItem label="Location" value="Main Atelier - Sector 7" />
            <DetailItem label="Joined" value="March 2024" />
          </div>
        </section>

        <section className="bg-brand-surface-low p-8 rounded-3xl border border-brand-outline-variant/10 space-y-6">
          <h3 className="text-xl font-bold text-brand-primary flex items-center gap-2">
            <ShieldAlert size={20} />
            Permissions & Roles
          </h3>
          <div className="space-y-3">
            <PermissionBadge label="Full Fleet Control" active={true} />
            <PermissionBadge label="System Configuration" active={true} />
            <PermissionBadge label="Task Assignment" active={true} />
            <PermissionBadge label="Emergency Override" active={true} />
            <PermissionBadge label="Financial Access" active={false} />
          </div>
          <div className="pt-4 border-t border-brand-outline-variant/20">
            <p className="text-xs text-stone-600 dark:text-brand-outline italic">
              Your account is currently in **Admin Mode**. You have full read/write access to all simulation parameters and physical unit overrides.
            </p>
          </div>
        </section>
      </div>

      <div className="flex justify-center pt-8">
        <button className="flex items-center gap-2 px-8 py-4 bg-brand-error/10 text-brand-error font-black uppercase tracking-widest text-xs rounded-2xl border border-brand-error/20 hover:bg-brand-error hover:text-white transition-all active:scale-95">
          <LogOut size={16} />
          Cerrar Sesión Global
        </button>
      </div>
    </motion.div>
  );
}

function DetailItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold text-stone-600 dark:text-brand-outline uppercase tracking-widest">{label}</span>
      <span className="text-sm font-bold text-brand-primary">{value}</span>
    </div>
  );
}

function PermissionBadge({ label, active }: { label: string, active: boolean }) {
  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-xl border transition-all",
      active 
        ? "bg-brand-primary/5 border-brand-primary/20 text-brand-primary" 
        : "bg-brand-surface-lowest border-brand-outline-variant/10 text-stone-500 dark:text-brand-outline opacity-50"
    )}>
      <span className="text-xs font-bold">{label}</span>
      {active ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
    </div>
  );
}

function DashboardView() {
  const [filter, setFilter] = useState<'all' | 'robots' | 'threats' | 'route'>('all');
  const [zoom, setZoom] = useState(100);
  const [isCompact, setIsCompact] = useState(false);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn("space-y-8 transition-all duration-500", isCompact && "space-y-4")}
    >
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-brand-primary/60 uppercase tracking-[0.2em]">Operational Overview</p>
          <h2 className={cn("font-black text-brand-primary tracking-tighter transition-all", isCompact ? "text-2xl" : "text-3xl md:text-4xl")}>
            Supervisión central del mundo GRIDROBOT
          </h2>
        </div>
        <button 
          onClick={() => setIsCompact(!isCompact)}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all border active:scale-95",
            isCompact 
              ? "bg-brand-primary text-white border-brand-primary shadow-lg" 
              : "bg-brand-surface-low text-brand-primary border-brand-outline-variant/20 hover:bg-brand-surface"
          )}
        >
          <MoreHorizontal size={16} />
          {isCompact ? "Vista normal" : "Vista compacta"}
        </button>
      </section>

      <AnimatePresence>
        {!isCompact && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 overflow-hidden"
          >
            <StatCard label="Ciclo Actual" value="2324" unit="Hertz" />
            <StatCard label="Flota Activa" value="20" unit="Robots" />
            <StatCard label="Hallazgos" value="15" unit="Obstáculos" color="tertiary" />
            <StatCard label="Estado de Enlace" value="Conectado" isStatus color="primary" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        <div className={cn("bg-brand-surface-lowest rounded-2xl shadow-brand-soft overflow-hidden border border-brand-outline-variant/10 transition-all", isCompact ? "xl:col-span-12" : "xl:col-span-10")}>
          <div className={cn("bg-brand-surface px-6 py-4 flex justify-between items-center border-b border-brand-outline-variant/10", isCompact && "py-2")}>
            <div className="flex items-center gap-2">
              <LayoutGrid size={18} className="text-brand-primary" />
              <h3 className="font-bold text-brand-primary tracking-tight">Mundo de Cuadrícula</h3>
            </div>
            <div className="flex gap-2">
              <div className="px-3 py-1 rounded-full bg-brand-surface-low text-[10px] font-black uppercase text-stone-700 dark:text-brand-outline">40 x 25 Scale</div>
              <div className="px-3 py-1 rounded-full bg-brand-primary/10 text-[10px] font-black uppercase text-brand-primary">Live Feed</div>
            </div>
          </div>
          
          <div className={cn("bg-brand-surface-low overflow-auto transition-all", isCompact ? "p-2 max-h-[400px]" : "p-4 md:p-8 max-h-[600px]")}>
            <div 
              className="grid-pattern relative min-w-[700px] aspect-[40/25] bg-brand-surface-lowest rounded-xl border border-brand-outline-variant/30 shadow-inner transition-transform duration-300 origin-top-left"
              style={{ transform: `scale(${zoom / 100})`, width: `${zoom}%` }}
            >
              {/* Simulated Grid Content */}
              <div className="absolute inset-0 grid grid-cols-40 grid-rows-25 p-2">
                {/* Routes */}
                {(filter === 'all' || filter === 'route') && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                    <path 
                      d="M 200 100 L 400 150 L 500 300" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeDasharray="4 4" 
                      className="text-brand-primary/40"
                    />
                    <path 
                      d="M 100 400 L 300 350 L 600 450" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeDasharray="4 4" 
                      className="text-brand-primary/40"
                    />
                  </svg>
                )}
                
                {/* Robots */}
                {(filter === 'all' || filter === 'robots') && (
                  <>
                    {/* Robot 1 */}
                    <div className="col-start-12 row-start-5 relative group cursor-pointer">
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-brand-primary text-[8px] text-white px-1.5 py-0.5 rounded font-bold">R01</div>
                      <div className="w-full h-full flex items-center justify-center bg-brand-primary text-white rounded shadow-md transform scale-150 transition-transform group-hover:scale-175 z-10">
                        <Bot size={10} />
                      </div>
                    </div>
                    {/* Robot 2 */}
                    <div className="col-start-28 row-start-18 relative group cursor-pointer">
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-brand-primary text-[8px] text-white px-1.5 py-0.5 rounded font-bold">R02</div>
                      <div className="w-full h-full flex items-center justify-center bg-brand-primary text-white rounded shadow-md transform scale-150 transition-transform group-hover:scale-175 z-10">
                        <Bot size={10} />
                      </div>
                    </div>
                  </>
                )}
                
                {/* Obstacles */}
                {(filter === 'all' || filter === 'threats') && (
                  [
                    { c: 15, r: 12 },
                    { c: 32, r: 20 },
                    { c: 5, r: 22 }
                  ].map((obs, i) => (
                    <div key={i} className={cn("flex items-center justify-center", `col-start-${obs.c} row-start-${obs.r} col-span-2 row-span-2`)}>
                      <div className="w-6 h-6 rounded-full border-2 border-brand-error/40 flex items-center justify-center bg-brand-error/10">
                        <div className="w-2 h-2 bg-brand-error rounded-full shadow-[0_0_10px_rgba(186,26,26,0.5)]"></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className={cn("bg-brand-surface-low px-8 py-6 flex flex-wrap gap-8 items-center border-t border-brand-outline-variant/10", isCompact && "py-3 px-4")}>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold text-stone-600 dark:text-brand-outline">Zoom Control</span>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleZoomOut}
                  className="w-8 h-8 rounded-full bg-brand-surface-lowest flex items-center justify-center text-brand-primary shadow-sm hover:bg-white transition-colors active:scale-90"
                >
                  <Plus size={14} className="rotate-45" />
                </button>
                <span className="text-sm font-bold w-12 text-center">{zoom}%</span>
                <button 
                  onClick={handleZoomIn}
                  className="w-8 h-8 rounded-full bg-brand-surface-lowest flex items-center justify-center text-brand-primary shadow-sm hover:bg-white transition-colors active:scale-90"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
            <div className="h-10 w-[1px] bg-brand-outline-variant/30 hidden md:block"></div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold text-stone-600 dark:text-brand-outline">Map Filter</span>
              <div className="flex gap-2">
                <span 
                  onClick={() => setFilter('all')}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all",
                    filter === 'all' ? "bg-brand-primary text-white" : "bg-brand-surface-lowest text-brand-primary border border-brand-outline-variant/20 hover:bg-white"
                  )}
                >
                  Todos
                </span>
                <span 
                  onClick={() => setFilter('robots')}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all",
                    filter === 'robots' ? "bg-brand-primary text-white" : "bg-brand-surface-lowest text-brand-primary border border-brand-outline-variant/20 hover:bg-white"
                  )}
                >
                  Solo Robots
                </span>
                <span 
                  onClick={() => setFilter('threats')}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all",
                    filter === 'threats' ? "bg-brand-primary text-white" : "bg-brand-surface-lowest text-brand-primary border border-brand-outline-variant/20 hover:bg-white"
                  )}
                >
                  Obstáculos Visibles
                </span>
                <span 
                  onClick={() => setFilter('route')}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all",
                    filter === 'route' ? "bg-brand-primary text-white" : "bg-brand-surface-lowest text-brand-primary border border-brand-outline-variant/20 hover:bg-white"
                  )}
                >
                  Ruta
                </span>
              </div>
            </div>
          </div>
        </div>

        {!isCompact && (
          <aside className="xl:col-span-2 space-y-6">
            <div className="bg-brand-surface-low p-6 rounded-2xl border border-brand-outline-variant/10">
              <h3 className="font-bold text-sm text-brand-primary uppercase tracking-widest mb-6">Leyenda</h3>
              <ul className="space-y-5">
                <LegendItem icon={Bot} label="Robot" color="primary" />
                <LegendItem icon={Factory} label="Ruta" color="secondary" isPath />
                <LegendItem icon={AlertTriangle} label="Obstáculo Visible" color="error" isObstacle />
              </ul>
            </div>
            <div className="bg-brand-primary/5 p-6 rounded-2xl border border-brand-primary/10">
              <p className="text-xs text-brand-primary/70 leading-relaxed italic">
                "La visualización 40x25 representa la densidad operativa actual optimizada para el Atelier Industrial."
              </p>
            </div>
          </aside>
        )}
      </div>
    </motion.div>
  );
}

function FleetView() {
  const [robots, setRobots] = useState<Robot[]>(ROBOTS);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  
  const [newRobot, setNewRobot] = useState({
    name: '',
    type: 'manufacturing' as const,
    capacity: '40 units / 180kg'
  });

  const filteredRobots = filterStatus === 'all' 
    ? robots 
    : robots.filter(r => r.status === filterStatus);

  const handleAddRobot = (e: FormEvent) => {
    e.preventDefault();
    const id = `R0${robots.length + 1}`;
    const newItem: Robot = {
      id,
      name: newRobot.name || `Unit ${id}`,
      status: 'inactive',
      position: [0, 0],
      capacity: newRobot.capacity,
      objective: 'Idle',
      type: newRobot.type,
      battery: 100
    };
    setRobots([...robots, newItem]);
    setIsAdding(false);
    setNewRobot({ name: '', type: 'manufacturing', capacity: '40 units / 180kg' });
  };

  const statuses = ['all', 'active', 'waiting', 'maintenance', 'inactive', 'disconnected'];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="space-y-10"
    >
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-brand-primary mb-2">Flota de Robots</h2>
          <p className="text-stone-600 dark:text-brand-outline font-medium">Seleccione un robot para inspeccionar su ruta</p>
        </div>
        <div className="flex gap-3 relative">
          <div className="relative">
            <button 
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className={cn(
                "bg-brand-surface-low text-brand-primary px-6 py-3 rounded-full text-sm font-bold flex items-center gap-2 border transition-all",
                showFilterMenu ? "border-brand-primary bg-brand-primary/5" : "border-brand-outline-variant/20 hover:bg-brand-surface"
              )}
            >
              <Filter size={18} />
              {filterStatus === 'all' ? 'FILTRAR' : filterStatus.toUpperCase()}
            </button>
            
            <AnimatePresence>
              {showFilterMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-48 bg-brand-surface-lowest border border-brand-outline-variant/20 rounded-2xl shadow-xl z-50 overflow-hidden"
                >
                  {statuses.map(status => (
                    <button
                      key={status}
                      onClick={() => {
                        setFilterStatus(status);
                        setShowFilterMenu(false);
                      }}
                      className={cn(
                        "w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors",
                        filterStatus === status ? "bg-brand-primary/10 text-brand-primary" : "text-stone-600 dark:text-brand-outline hover:bg-brand-surface-low"
                      )}
                    >
                      {status}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            onClick={() => setIsAdding(true)}
            className="bg-brand-primary text-white px-6 py-3 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg hover:shadow-xl active:scale-95 transition-all"
          >
            <Plus size={18} />
            NUEVA UNIDAD
          </button>
        </div>
      </section>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-brand-surface-low p-8 rounded-3xl border border-brand-primary/20 shadow-brand-soft overflow-hidden"
          >
            <form onSubmit={handleAddRobot} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-stone-600 dark:text-brand-outline uppercase tracking-widest">Nombre de Unidad</label>
                <input 
                  type="text" 
                  value={newRobot.name}
                  onChange={e => setNewRobot({...newRobot, name: e.target.value})}
                  placeholder="Ej: Sinoe Prime"
                  className="w-full bg-brand-surface-lowest border border-brand-outline-variant/20 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-brand-primary outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-stone-600 dark:text-brand-outline uppercase tracking-widest">Tipo de Sistema</label>
                <select 
                  value={newRobot.type}
                  onChange={e => setNewRobot({...newRobot, type: e.target.value as any})}
                  className="w-full bg-brand-surface-lowest border border-brand-outline-variant/20 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-brand-primary outline-none"
                >
                  <option value="manufacturing">Manufacturing</option>
                  <option value="rocket">Rocket</option>
                  <option value="memory">Memory</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-stone-600 dark:text-brand-outline uppercase tracking-widest">Capacidad</label>
                <input 
                  type="text" 
                  value={newRobot.capacity}
                  onChange={e => setNewRobot({...newRobot, capacity: e.target.value})}
                  className="w-full bg-brand-surface-lowest border border-brand-outline-variant/20 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-brand-primary outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button 
                  type="submit"
                  className="flex-1 bg-brand-primary text-white py-2 rounded-xl text-xs font-bold uppercase tracking-widest shadow-md hover:shadow-lg transition-all"
                >
                  Confirmar
                </button>
                <button 
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 bg-brand-surface-lowest text-stone-600 dark:text-brand-outline border border-brand-outline-variant/20 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRobots.map((robot) => (
          <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            key={robot.id}
          >
            <RobotCard robot={robot} />
          </motion.div>
        ))}
        
        <div className="bg-brand-primary p-8 rounded-2xl text-white flex flex-col justify-between relative overflow-hidden shadow-xl" style={{ background: 'linear-gradient(135deg, #004f45, #02201b)' }}>
          <LayoutGrid className="absolute -right-4 -bottom-4 text-9xl opacity-10" />
          <div className="relative z-10">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] mb-4 text-white/60">Resumen de Operación</h4>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-5xl font-black tracking-tighter">
                {Math.round((robots.filter(r => r.status === 'active').length / robots.length) * 100)}%
              </span>
              <span className="text-xs font-bold uppercase text-white/80">Eficiencia</span>
            </div>
          </div>
          <div className="mt-8 space-y-4 relative z-10">
            <div className="flex justify-between items-center text-sm">
              <span className="opacity-70">Unidades Activas</span>
              <span className="font-mono font-bold">
                {robots.filter(r => r.status === 'active').length.toString().padStart(2, '0')}/{robots.length.toString().padStart(2, '0')}
              </span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-white h-full transition-all duration-1000" 
                style={{ width: `${(robots.filter(r => r.status === 'active').length / robots.length) * 100}%` }}
              ></div>
            </div>
            <p className="text-[10px] font-medium leading-relaxed opacity-60">Sistema operando bajo parámetros normales en el sector primario de simulación.</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TasksView() {
  const [tasks, setTasks] = useState<Task[]>(TASKS);
  const [isCreating, setIsCreating] = useState(false);
  const [cargoFilter, setCargoFilter] = useState<string | null>(null);
  const [priorityFilters, setPriorityFilters] = useState({
    low: true,
    normal: true,
    high: true
  });
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'normal' as const,
    loadDetails: 'Standard Cargo'
  });

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [assigningTask, setAssigningTask] = useState<Task | null>(null);

  const handleCreateTask = (e: FormEvent) => {
    e.preventDefault();
    const id = `T-${tasks.length + 101}`;
    const newItem: Task = {
      id,
      title: newTask.title || `Task ${id}`,
      description: newTask.description || 'No description provided.',
      priority: newTask.priority,
      status: 'pending',
      origin: 'Loading Bay A',
      originCoords: [10, 10],
      destination: 'Unloading Zone C',
      destCoords: [40, 40],
      loadDetails: newTask.loadDetails,
      requirements: ['Standard Clearance'],
      progress: 0,
      stage: 'Queued'
    };
    setTasks([newItem, ...tasks]);
    setIsCreating(false);
    setNewTask({ title: '', description: '', priority: 'normal', loadDetails: 'Standard Cargo' });
  };

  const handleAssignRobot = (taskId: string, robotId: string) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: 'in-progress', stage: 'Robot Assigned', progress: 10 } : t
    ));
    setAssigningTask(null);
  };

  const filteredTasks = tasks.filter(task => {
    const matchesPriority = priorityFilters[task.priority];
    
    if (!cargoFilter) return matchesPriority;

    const searchStr = cargoFilter.toLowerCase();
    const taskData = [
      task.title,
      task.description,
      task.loadDetails,
      ...task.requirements
    ].join(' ').toLowerCase();

    // Map common terms
    const mappings: Record<string, string[]> = {
      'fragile': ['fragile', 'frágil'],
      'hazardous': ['hazardous', 'hazard', 'biohazard', 'danger'],
      'liquid bulk': ['liquid', 'bulk'],
      'heavy': ['heavy', 'weight', 'kg', 'ton']
    };

    const termsToMatch = mappings[searchStr] || [searchStr];
    const matchesCargo = termsToMatch.some(term => taskData.includes(term));

    return matchesPriority && matchesCargo;
  });

  const pendingCount = filteredTasks.filter(t => t.status === 'pending').length;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-10"
    >
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="text-[10px] font-bold text-brand-primary/60 uppercase tracking-[0.2em] block mb-2">Mission Control</span>
          <h2 className="text-4xl font-black tracking-tight text-brand-primary">Task Assignment</h2>
        </div>
        <div className="flex gap-3">
          <div className="bg-brand-surface-low px-6 py-3 rounded-full flex items-center gap-3 border border-brand-outline-variant/20">
            <RefreshCw size={18} className="text-brand-primary" />
            <span className="font-bold text-brand-primary">{pendingCount} Pending</span>
          </div>
          <button 
            onClick={() => setIsCreating(true)}
            className="bg-brand-primary text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-lg hover:shadow-xl active:scale-95 transition-all"
          >
            <Plus size={18} />
            Create Task
          </button>
        </div>
      </section>

      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-brand-surface-low p-8 rounded-3xl border border-brand-primary/20 shadow-brand-soft overflow-hidden"
          >
            <form onSubmit={handleCreateTask} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-stone-600 dark:text-brand-outline uppercase tracking-widest">Task Title</label>
                  <input 
                    type="text" 
                    required
                    value={newTask.title}
                    onChange={e => setNewTask({...newTask, title: e.target.value})}
                    placeholder="Ej: Transport Core"
                    className="w-full bg-brand-surface-lowest border border-brand-outline-variant/20 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-brand-primary outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-stone-600 dark:text-brand-outline uppercase tracking-widest">Priority</label>
                  <select 
                    value={newTask.priority}
                    onChange={e => setNewTask({...newTask, priority: e.target.value as any})}
                    className="w-full bg-brand-surface-lowest border border-brand-outline-variant/20 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-brand-primary outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-stone-600 dark:text-brand-outline uppercase tracking-widest">Cargo Type</label>
                  <input 
                    type="text" 
                    value={newTask.loadDetails}
                    onChange={e => setNewTask({...newTask, loadDetails: e.target.value})}
                    className="w-full bg-brand-surface-lowest border border-brand-outline-variant/20 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-brand-primary outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-stone-600 dark:text-brand-outline uppercase tracking-widest">Description</label>
                <textarea 
                  value={newTask.description}
                  onChange={e => setNewTask({...newTask, description: e.target.value})}
                  rows={2}
                  className="w-full bg-brand-surface-lowest border border-brand-outline-variant/20 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-brand-primary outline-none resize-none"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button 
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-6 py-2 bg-brand-surface-lowest text-stone-600 dark:text-brand-outline border border-brand-outline-variant/20 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-8 py-2 bg-brand-primary text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-md hover:shadow-lg transition-all"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-3 space-y-6">
          <div className="bg-brand-surface-low p-6 rounded-2xl border border-brand-outline-variant/10">
            <h3 className="font-bold text-brand-primary mb-4 flex items-center gap-2">
              <Filter size={16} />
              Priority Filter
            </h3>
            <div className="space-y-2">
              {[
                { id: 'low', label: 'Baja' },
                { id: 'normal', label: 'Normal' },
                { id: 'high', label: 'Urgente' }
              ].map((p) => (
                <label key={p.id} className="flex items-center justify-between p-3 bg-brand-surface-lowest rounded-xl cursor-pointer hover:bg-white transition-colors border border-transparent hover:border-brand-outline-variant/20">
                  <span className="text-sm font-bold text-stone-700 dark:text-stone-200">{p.label}</span>
                  <input 
                    type="checkbox" 
                    checked={priorityFilters[p.id as keyof typeof priorityFilters]} 
                    onChange={() => setPriorityFilters(prev => ({ ...prev, [p.id]: !prev[p.id as keyof typeof priorityFilters] }))}
                    className="rounded border-brand-outline-variant text-brand-primary focus:ring-brand-primary" 
                  />
                </label>
              ))}
            </div>
          </div>
          <div className="bg-brand-surface-low p-6 rounded-2xl border border-brand-outline-variant/10">
            <h3 className="font-bold text-brand-primary mb-4 flex items-center gap-2">
              <LayoutGrid size={16} />
              Cargo Type
            </h3>
            <div className="flex flex-wrap gap-2">
              {['Liquid Bulk', 'Fragile', 'Heavy', 'Hazardous'].map((type) => (
                <span 
                  key={type} 
                  onClick={() => setCargoFilter(prev => prev === type ? null : type)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer",
                    cargoFilter === type ? "bg-brand-primary text-white" : "bg-brand-surface-lowest text-stone-600 dark:text-brand-outline border border-brand-outline-variant/20 hover:bg-white"
                  )}
                >
                  {type}
                </span>
              ))}
            </div>
            {cargoFilter && (
              <button 
                onClick={() => setCargoFilter(null)}
                className="mt-4 text-[10px] font-bold text-brand-primary uppercase tracking-widest hover:underline"
              >
                Clear Filter
              </button>
            )}
          </div>
        </aside>

        <div className="lg:col-span-9 space-y-6">
          <AnimatePresence>
            {filteredTasks.map((task) => (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={task.id}
              >
                <TaskCard 
                  task={task} 
                  onDetails={() => setSelectedTask(task)}
                  onAssign={() => setAssigningTask(task)}
                />
              </motion.div>
            ))}
            {filteredTasks.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-brand-surface-low p-12 rounded-3xl border border-dashed border-brand-outline-variant/30 text-center"
              >
                <ClipboardList size={48} className="text-brand-outline/20 mx-auto mb-4" />
                <p className="text-stone-600 dark:text-brand-outline font-medium">No tasks found matching the selected filters.</p>
                <button 
                  onClick={() => {
                    setCargoFilter(null);
                    setPriorityFilters({ low: true, normal: true, high: true });
                  }}
                  className="mt-4 text-brand-primary font-bold hover:underline"
                >
                  Reset all filters
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-brand-surface-low p-8 rounded-2xl border-2 border-dashed border-brand-outline-variant/30 flex flex-col items-center justify-center text-center">
              <RefreshCw size={32} className="text-stone-400 dark:text-brand-outline/40 mb-4" />
              <p className="text-stone-600 dark:text-brand-outline font-medium text-sm">Automated scheduling insights will appear here.</p>
            </div>
            <div className="bg-brand-primary/5 p-8 rounded-2xl border-2 border-dashed border-brand-primary/20 flex flex-col items-center justify-center text-center">
              <Bot size={32} className="text-brand-primary/40 mb-4" />
              <p className="text-brand-primary/60 font-medium text-sm">3 Free robots available for manual assignment.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Task Details Modal */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTask(null)}
              className="absolute inset-0 bg-brand-primary/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-brand-surface-lowest rounded-[2.5rem] shadow-2xl overflow-hidden border border-brand-outline-variant/20"
            >
              <div className="p-8 md:p-12 space-y-8">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-[10px] font-black tracking-widest uppercase mb-2 inline-block">Task Details</span>
                    <h3 className="text-3xl font-black text-brand-primary tracking-tight">{selectedTask.title}</h3>
                  </div>
                  <button 
                    onClick={() => setSelectedTask(null)}
                    className="p-2 hover:bg-brand-surface-low rounded-full transition-colors"
                  >
                    <Plus size={24} className="rotate-45 text-stone-600 dark:text-brand-outline" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-bold text-stone-600 dark:text-brand-outline uppercase tracking-widest block mb-2">Description</label>
                      <p className="text-sm text-brand-primary/80 leading-relaxed font-medium">{selectedTask.description}</p>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-brand-surface-low rounded-2xl border border-brand-outline-variant/10">
                      <div className="w-12 h-12 rounded-full bg-brand-primary flex items-center justify-center text-white">
                        <Waves size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-stone-600 dark:text-brand-outline font-bold">Cargo Manifest</p>
                        <p className="text-sm font-bold">{selectedTask.loadDetails}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <LayoutGrid size={20} className="text-brand-primary mt-1" />
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-stone-600 dark:text-brand-outline font-bold">Origin Point</p>
                          <p className="text-sm font-bold">{selectedTask.origin}</p>
                          <p className="text-xs text-stone-600 dark:text-brand-outline font-mono">GPS: {selectedTask.originCoords.join(', ')}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Rocket size={20} className="text-brand-primary mt-1" />
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-stone-600 dark:text-brand-outline font-bold">Destination Point</p>
                          <p className="text-sm font-bold">{selectedTask.destination}</p>
                          <p className="text-xs text-stone-600 dark:text-brand-outline font-mono">GPS: {selectedTask.destCoords.join(', ')}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-stone-600 dark:text-brand-outline font-bold mb-3">Operational Requirements</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedTask.requirements.map(req => (
                          <div key={req} className="flex items-center gap-2 px-3 py-1.5 bg-brand-surface-low text-brand-primary rounded-xl text-[10px] font-bold border border-brand-primary/10">
                            {req === 'Refrigeración' ? <Thermometer size={12} /> : <Zap size={12} />}
                            {req}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-brand-outline-variant/10 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-3 h-3 rounded-full", selectedTask.status === 'in-progress' ? "bg-brand-secondary animate-pulse" : "bg-brand-outline")}></div>
                    <span className="font-bold text-brand-primary uppercase tracking-widest text-xs">{selectedTask.status}</span>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedTask(null);
                      setAssigningTask(selectedTask);
                    }}
                    className="px-8 py-3 bg-brand-primary text-white font-bold rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95"
                  >
                    Assign Robot Now
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assign Robot Modal */}
      <AnimatePresence>
        {assigningTask && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAssigningTask(null)}
              className="absolute inset-0 bg-brand-primary/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-brand-surface-lowest rounded-[2.5rem] shadow-2xl overflow-hidden border border-brand-outline-variant/20"
            >
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-black text-brand-primary tracking-tight">Assign Robot</h3>
                  <button onClick={() => setAssigningTask(null)} className="p-2 hover:bg-brand-surface-low rounded-full">
                    <Plus size={20} className="rotate-45 text-stone-600 dark:text-brand-outline" />
                  </button>
                </div>
                
                <p className="text-sm text-stone-600 dark:text-brand-outline font-medium">Select an available unit for task <span className="text-brand-primary font-bold">{assigningTask.id}</span></p>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {ROBOTS.filter(r => r.status === 'active' || r.status === 'waiting').map(robot => (
                    <button 
                      key={robot.id}
                      onClick={() => handleAssignRobot(assigningTask.id, robot.id)}
                      className="w-full flex items-center justify-between p-4 bg-brand-surface-low rounded-2xl border border-brand-outline-variant/10 hover:border-brand-primary hover:bg-white transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-colors">
                          <Bot size={20} />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-brand-primary">{robot.name}</p>
                          <p className="text-[10px] text-stone-600 dark:text-brand-outline font-bold uppercase tracking-widest">{robot.type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-brand-primary">{robot.battery}%</p>
                        <div className="w-12 bg-brand-outline-variant/20 h-1 rounded-full overflow-hidden">
                          <div className="bg-brand-primary h-full" style={{ width: `${robot.battery}%` }}></div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => setAssigningTask(null)}
                  className="w-full py-4 text-stone-600 dark:text-brand-outline font-bold text-xs uppercase tracking-widest hover:text-brand-primary transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}


function SettingsView() {
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>(SESSIONS);

  const handleLogout = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (selectedSession?.id === sessionId) setSelectedSession(null);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-10"
    >
      <section className="mb-10">
        <span className="text-[10px] font-bold text-brand-primary/60 uppercase tracking-[0.2em] block mb-2">System Administration</span>
        <h2 className="text-4xl font-black tracking-tight text-brand-primary">Sesiones Activas</h2>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-6">
          {sessions.map((session) => (
            <div key={session.id}>
              <SessionCard 
                session={session} 
                onManage={() => setSelectedSession(session)}
                onLogout={() => handleLogout(session.id)}
              />
            </div>
          ))}

          <section className="bg-brand-primary p-8 rounded-2xl text-white relative overflow-hidden shadow-xl">
            <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Info className="text-brand-primary-container" />
              ¿Cómo funciona el sistema?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-white/80 leading-relaxed text-sm">
              <div className="space-y-4">
                <p className="font-bold text-white">Gestión de Flotas en Tiempo Real</p>
                <p>El núcleo de GRIDROBOT utiliza un motor de simulación de baja latencia que sincroniza cada unidad física con su gemelo digital mediante protocolos MQTT industriales.</p>
                <div className="flex items-center gap-2 py-2 px-3 bg-white/10 rounded-lg border border-white/5">
                  <Zap size={14} className="text-white" />
                  <span className="text-[10px] uppercase tracking-wider font-bold">End-to-End Encryption Enabled</span>
                </div>
              </div>
              <div className="space-y-4">
                <p className="font-bold text-white">Seguridad y Redundancia</p>
                <p>Cada sesión de operador requiere una firma criptográfica única. Si se detectan múltiples inicios desde IP geográficamente distantes, el sistema bloquea preventivamente los movimientos físicos.</p>
                <ul className="list-none space-y-1 opacity-80 text-xs italic">
                  <li>• Registro de auditoría inmutable (Logs)</li>
                  <li>• Handshake cada 500ms</li>
                  <li>• Fail-safe automático en desconexión</li>
                </ul>
              </div>
            </div>
          </section>
        </div>

        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-brand-surface-low p-6 rounded-2xl border border-brand-outline-variant/10">
            <h5 className="text-xs font-black uppercase tracking-[0.2em] text-stone-600 dark:text-brand-outline mb-6">Estado Global</h5>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-sm font-medium text-brand-secondary">Uso de Servidor</span>
                  <span className="text-xl font-black text-brand-primary">24%</span>
                </div>
                <div className="w-full bg-brand-surface-variant/30 h-2 rounded-full overflow-hidden">
                  <div className="bg-brand-primary h-full w-[24%] rounded-full"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-sm font-medium text-brand-secondary">Ancho de Banda (Sync)</span>
                  <span className="text-xl font-black text-brand-primary">1.2 Gbps</span>
                </div>
                <div className="w-full bg-brand-surface-variant/30 h-2 rounded-full overflow-hidden">
                  <div className="bg-brand-secondary h-full w-[65%] rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-brand-surface-lowest p-6 rounded-2xl border-l-4 border-brand-primary shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Info size={18} className="text-brand-primary" />
              <span className="font-bold text-brand-primary text-xs uppercase tracking-tight">Nota de Operación</span>
            </div>
            <p className="text-xs text-stone-600 dark:text-brand-outline leading-relaxed">
              Las sesiones inactivas por más de 120 minutos se cerrarán automáticamente para preservar la integridad del ancho de banda en la red de control.
            </p>
          </div>

          <div className="space-y-3">
            <button className="w-full py-4 px-6 bg-brand-primary text-white font-bold rounded-full flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95 transition-all">
              <RefreshCw size={18} />
              Actualizar Red
            </button>
            <button className="w-full py-4 px-6 border-2 border-brand-primary/20 text-brand-primary font-bold rounded-full flex items-center justify-center gap-2 hover:bg-brand-primary/5 transition-all">
              <Settings size={18} />
              Configurar Gateway
            </button>
          </div>
        </aside>
      </div>

      {/* Session Management Modal */}
      <AnimatePresence>
        {selectedSession && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSession(null)}
              className="absolute inset-0 bg-brand-primary/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-brand-surface-lowest rounded-[2.5rem] shadow-2xl overflow-hidden border border-brand-outline-variant/20"
            >
              <div className="p-8 md:p-12 space-y-8">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                      <Shield size={32} />
                    </div>
                    <div>
                      <span className="px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-[10px] font-black tracking-widest uppercase mb-1 inline-block">Security Management</span>
                      <h3 className="text-3xl font-black text-brand-primary tracking-tight">{selectedSession.name}</h3>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedSession(null)}
                    className="p-2 hover:bg-brand-surface-low rounded-full transition-colors"
                  >
                    <Plus size={24} className="rotate-45 text-stone-600 dark:text-brand-outline" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="bg-brand-surface-low p-6 rounded-2xl border border-brand-outline-variant/10">
                      <h4 className="text-xs font-black uppercase tracking-widest text-stone-600 dark:text-brand-outline mb-4 flex items-center gap-2">
                        <Activity size={14} />
                        Network Diagnostics
                      </h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-brand-primary/60">Latency</span>
                          <span className="text-sm font-bold text-brand-secondary">12ms</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-brand-primary/60">Packet Loss</span>
                          <span className="text-sm font-bold text-brand-primary">0.001%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-brand-primary/60">Encryption</span>
                          <span className="text-sm font-bold text-emerald-600">AES-256-GCM</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-brand-surface-low p-6 rounded-2xl border border-brand-outline-variant/10">
                      <h4 className="text-xs font-black uppercase tracking-widest text-stone-600 dark:text-brand-outline mb-4 flex items-center gap-2">
                        <Monitor size={14} />
                        Device Information
                      </h4>
                      <div className="space-y-2 text-sm">
                        <p className="flex justify-between"><span className="text-brand-primary/60">OS:</span> <span className="font-bold">{selectedSession.os || 'Unknown'}</span></p>
                        <p className="flex justify-between"><span className="text-brand-primary/60">IP:</span> <span className="font-mono font-bold">{selectedSession.ip}</span></p>
                        <p className="flex justify-between"><span className="text-brand-primary/60">MAC:</span> <span className="font-mono font-bold">{selectedSession.mac || 'N/A'}</span></p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-brand-primary/5 p-6 rounded-2xl border border-brand-primary/10">
                      <h4 className="text-xs font-black uppercase tracking-widest text-brand-primary mb-4">Session Privileges</h4>
                      <div className="space-y-3">
                        {['Fleet Control', 'Task Assignment', 'System Logs', 'Emergency Stop'].map(perm => (
                          <div key={perm} className="flex items-center gap-3 text-sm font-bold text-brand-primary">
                            <CheckCircle2 size={16} className="text-brand-secondary" />
                            {perm}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="pt-4 space-y-3">
                      <button 
                        onClick={() => handleLogout(selectedSession.id)}
                        className="w-full py-3 bg-brand-error/10 text-brand-error font-bold rounded-xl border border-brand-error/20 hover:bg-brand-error hover:text-white transition-all text-sm"
                      >
                        Terminate Session
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Sub-components

function StatCard({ label, value, unit, color = 'primary', isStatus = false }: { label: string, value: string, unit?: string, color?: string, isStatus?: boolean }) {
  return (
    <div className="bg-brand-surface-lowest p-5 rounded-2xl shadow-brand-soft flex flex-col justify-between border border-brand-outline-variant/10">
      <span className="text-stone-600 dark:text-brand-outline text-[10px] font-bold uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-2 mt-2">
        {isStatus && <div className="w-2.5 h-2.5 rounded-full bg-brand-secondary animate-pulse"></div>}
        <span className={cn("text-2xl font-black tracking-tight", color === 'tertiary' ? "text-brand-tertiary" : "text-brand-primary")}>{value}</span>
        {unit && <span className="text-stone-400 dark:text-stone-500 text-xs font-medium">{unit}</span>}
      </div>
    </div>
  );
}

function LegendItem({ icon: Icon, label, color, isPath, isObstacle }: { icon: any, label: string, color: string, isPath?: boolean, isObstacle?: boolean }) {
  return (
    <li className="flex items-center gap-3">
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center shadow-sm",
        color === 'primary' && "bg-brand-primary text-white",
        color === 'secondary' && "bg-brand-secondary/20 text-brand-secondary",
        color === 'error' && "bg-brand-error/10 text-brand-error"
      )}>
        {isPath ? <div className="w-6 h-1 bg-brand-primary/40 rounded-full" /> : <Icon size={14} />}
      </div>
      <span className="text-sm font-semibold text-stone-600 dark:text-stone-400">{label}</span>
    </li>
  );
}

function RobotCard({ robot }: { robot: Robot }) {
  const Icon = robot.type === 'manufacturing' ? Factory : robot.type === 'rocket' ? Rocket : robot.type === 'memory' ? MemoryStick : Power;
  
  return (
    <div className="bg-brand-surface-lowest p-6 rounded-2xl shadow-brand-soft border border-brand-outline-variant/10 hover:shadow-xl hover:border-brand-primary/20 transition-all duration-300 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
      <div className="flex justify-between items-start mb-6 relative">
        <div className="p-3 bg-brand-surface-low rounded-2xl text-brand-primary">
          <Icon size={24} />
        </div>
        <span className={cn(
          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5",
          robot.status === 'active' ? "bg-brand-primary/10 text-brand-primary" : "bg-brand-surface-low text-stone-600 dark:text-brand-outline"
        )}>
          {robot.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse"></span>}
          {robot.status}
        </span>
      </div>
      <div className="mb-6">
        <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100">{robot.name}</h3>
        <p className="text-xs font-bold text-brand-primary/60 tracking-widest uppercase">ID: {robot.id}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 border-t border-brand-outline-variant/10 pt-6">
        <div>
          <p className="text-[10px] font-bold text-stone-600 dark:text-brand-outline uppercase tracking-wider mb-1">Posición</p>
          <p className="font-mono text-sm font-semibold">({robot.position[0]},{robot.position[1]})</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-stone-600 dark:text-brand-outline uppercase tracking-wider mb-1">Capacidad</p>
          <p className="font-mono text-sm font-semibold">{robot.capacity}</p>
        </div>
        <div className="col-span-2">
          <p className="text-[10px] font-bold text-stone-600 dark:text-brand-outline uppercase tracking-wider mb-1">Objetivo</p>
          <p className="text-sm font-medium text-stone-600 dark:text-stone-400 italic">{robot.objective}</p>
        </div>
      </div>
    </div>
  );
}

function TaskCard({ task, onDetails, onAssign }: { task: Task, onDetails?: () => void, onAssign?: () => void }) {
  return (
    <div className="group relative bg-brand-surface-lowest p-8 rounded-2xl shadow-brand-soft hover:shadow-xl transition-all flex flex-col md:flex-row gap-8 overflow-hidden border border-brand-outline-variant/10">
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
      <div className="md:w-1/3 border-r border-brand-outline-variant/10 pr-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="px-3 py-1 bg-brand-surface-low text-brand-primary rounded-full text-[10px] font-black tracking-widest uppercase">ID: {task.id}</span>
          <span className={cn(
            "px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase",
            task.priority === 'high' ? "bg-brand-tertiary/10 text-brand-tertiary" : "bg-brand-primary/10 text-brand-primary"
          )}>{task.priority}</span>
        </div>
        <h3 className="text-2xl font-black text-brand-primary mb-2 tracking-tight">{task.title}</h3>
        <p className="text-sm text-stone-600 dark:text-brand-outline font-medium mb-6">{task.description}</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center text-white">
            <Waves size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-stone-600 dark:text-brand-outline font-bold">Load Details</p>
            <p className="text-sm font-bold">{task.loadDetails}</p>
          </div>
        </div>
      </div>
      <div className="md:w-2/3 flex flex-col justify-between">
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <LayoutGrid size={18} className="text-brand-primary mt-1" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-stone-600 dark:text-brand-outline font-bold">Origin</p>
                <p className="text-sm font-bold">{task.origin}</p>
                <p className="text-xs text-stone-500 dark:text-brand-outline font-mono">[{task.originCoords[0]}, {task.originCoords[1]}]</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Rocket size={18} className="text-brand-primary mt-1" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-stone-600 dark:text-brand-outline font-bold">Destination</p>
                <p className="text-sm font-bold">{task.destination}</p>
                <p className="text-xs text-stone-500 dark:text-brand-outline font-mono">[{task.destCoords[0]}, {task.destCoords[1]}]</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-stone-600 dark:text-brand-outline font-bold mb-2">Requirements</p>
              <div className="flex flex-wrap gap-2">
                {task.requirements.map(req => (
                  <div key={req} className="flex items-center gap-1 px-2 py-1 bg-brand-surface-low text-brand-primary rounded text-[10px] font-bold">
                    {req === 'Refrigeración' ? <Thermometer size={10} /> : <Zap size={10} />}
                    {req}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-stone-600 dark:text-brand-outline font-bold mb-2">Current Stage</p>
              <div className="w-full bg-brand-surface-low rounded-full h-1.5 overflow-hidden">
                <div className="bg-brand-primary h-full rounded-full transition-all duration-500" style={{ width: `${task.progress}%` }}></div>
              </div>
              <p className="text-[10px] font-bold mt-1 text-brand-primary">{task.stage}</p>
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center mt-auto">
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", task.status === 'in-progress' ? "bg-brand-secondary animate-pulse" : "bg-brand-outline")}></div>
            <span className="text-sm font-bold">{task.status === 'in-progress' ? 'En progreso' : 'Pendiente'}</span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={onDetails}
              className="px-4 py-2 text-brand-primary font-bold text-sm rounded-full border border-brand-primary/20 hover:bg-brand-primary/5 transition-colors"
            >
              Details
            </button>
            <button 
              onClick={onAssign}
              className="px-6 py-2 bg-brand-primary text-white font-bold text-sm rounded-full hover:shadow-lg transition-all active:scale-95"
            >
              Assign Robot
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


function SessionCard({ session, onManage, onLogout }: { session: Session, onManage?: () => void, onLogout?: () => void }) {
  return (
    <div className="bg-brand-surface-lowest p-8 rounded-2xl shadow-brand-soft relative overflow-hidden group border border-brand-outline-variant/10">
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div className="flex items-start gap-4">
          <div className="mt-1 w-12 h-12 rounded-2xl bg-brand-primary/5 flex items-center justify-center text-brand-primary">
            <LayoutGrid size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-brand-primary">{session.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn("inline-block w-2 h-2 rounded-full", session.status === 'active' ? "bg-brand-secondary animate-pulse" : "bg-brand-outline")}></span>
              <span className="text-sm font-medium text-stone-600 dark:text-brand-outline">{session.status === 'active' ? 'Sesión Actual (Activa)' : 'Sesión Secundaria'}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-4 text-xs font-mono text-stone-600 dark:text-brand-outline">
              <p><span className="opacity-60 uppercase tracking-tighter">IP:</span> {session.ip}</p>
              <p><span className="opacity-60 uppercase tracking-tighter">Login:</span> {session.loginTime}</p>
              {session.mac && <p><span className="opacity-60 uppercase tracking-tighter">MAC:</span> {session.mac}</p>}
              {session.os && <p><span className="opacity-60 uppercase tracking-tighter">Os:</span> {session.os}</p>}
            </div>
          </div>
        </div>
        <div className="flex items-center">
          {session.status === 'active' ? (
            <button 
              onClick={onManage}
              className="px-6 py-2 rounded-full bg-brand-surface-low text-brand-primary font-bold text-sm border border-brand-outline-variant/20 hover:bg-brand-surface transition-colors"
            >
              Gestionar
            </button>
          ) : (
            <button 
              onClick={onLogout}
              className="text-brand-error font-bold text-sm hover:underline flex items-center gap-1 group"
            >
              Cerrar sesión
              <LogOut size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
