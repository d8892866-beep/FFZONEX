import { useState } from 'react';
import { Wrench } from 'lucide-react';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthModal } from './components/AuthModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { HomePage } from './components/HomePage';
import { LoadingScreen } from './components/LoadingScreen';
import { Navbar } from './components/Navbar';
import { OrderModal } from './components/OrderModal';
import { StoreView } from './components/StoreView';
import { SupportView } from './components/SupportView';
import { TrackOrderView } from './components/TrackOrderView';
import { UserDashboard } from './components/UserDashboard';
import { WalletView } from './components/WalletView';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StoreProvider, useStore } from './context/StoreContext';
import { ActiveView, AuthModalMode, Product } from './types';

function AppShell() {
  const { authReady, isAdmin, firebaseUser, connectionOk } = useAuth();
  const { settings } = useStore();

  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [trackedOrderCode, setTrackedOrderCode] = useState<string | null>(null);

  if (!authReady) {
    return <LoadingScreen label="Initializing FFZONEX Marketplace" />;
  }

  const navigate = (view: ActiveView) => {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (settings.maintenanceMode && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#090A0D] text-zinc-100 flex flex-col">
        <Navbar
          activeView={activeView}
          onNavigate={navigate}
          onOpenAuth={(m) => setAuthModalMode(m)}
        />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full surface-gold-edge rounded-2xl p-8 text-center space-y-4">
            <Wrench className="w-10 h-10 text-[#D4AF37] mx-auto" />
            <h1 className="font-display text-2xl font-bold text-white">Scheduled Maintenance</h1>
            <p className="text-sm text-zinc-300 leading-relaxed">
              FFZONEX is undergoing scheduled upgrades to our top-up delivery servers. Please check
              back shortly.
            </p>
            {!firebaseUser && (
              <button
                onClick={() => setAuthModalMode('login')}
                className="btn-gold px-5 py-2.5 rounded-xl text-xs cursor-pointer"
              >
                Admin Sign In
              </button>
            )}
          </div>
        </main>
        <AuthModal
          mode={authModalMode}
          onClose={() => setAuthModalMode(null)}
          onSwitchMode={(m) => setAuthModalMode(m)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090A0D] text-[#F4F4F5] flex flex-col relative overflow-x-hidden">
      {/* Subtle Animated Gaming Ambient Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
        <div className="animate-ambient-drift absolute -top-40 -left-32 w-[520px] h-[520px] rounded-full bg-[#D4AF37]/[0.07] blur-[120px]" />
        <div className="animate-ambient-drift absolute top-1/3 -right-32 w-[480px] h-[480px] rounded-full bg-[#0EA5E9]/[0.06] blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar
          activeView={activeView}
          onNavigate={navigate}
          onOpenAuth={(m) => setAuthModalMode(m)}
        />

        {!connectionOk && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-center text-xs text-amber-200">
            Firestore network connectivity check reported offline mode. Some real-time updates may
            sync once reconnected.
          </div>
        )}

        <main className="flex-1">
          {activeView === 'home' && (
            <HomePage
              onSelectProduct={(p) => setSelectedProduct(p)}
              onNavigate={navigate}
            />
          )}
          {activeView === 'store' && (
            <StoreView onSelectProduct={(p) => setSelectedProduct(p)} />
          )}
          {activeView === 'track' && (
            <TrackOrderView
              initialOrderCode={trackedOrderCode}
              onOpenAuth={(m) => setAuthModalMode(m)}
            />
          )}
          {activeView === 'wallet' && (
            <WalletView onOpenAuth={(m) => setAuthModalMode(m)} />
          )}
          {activeView === 'support' && (
            <SupportView onOpenAuth={(m) => setAuthModalMode(m)} />
          )}
          {activeView === 'dashboard' && <UserDashboard onNavigate={navigate} />}
          {activeView === 'admin' && <AdminDashboard />}
        </main>

        <Footer onNavigate={navigate} />
      </div>

      <OrderModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onOpenAuth={(m) => setAuthModalMode(m)}
        onOrderCreated={(code) => {
          setSelectedProduct(null);
          setTrackedOrderCode(code);
          navigate('track');
        }}
        onGoToWallet={() => navigate('wallet')}
      />

      <AuthModal
        mode={authModalMode}
        onClose={() => setAuthModalMode(null)}
        onSwitchMode={(m) => setAuthModalMode(m)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <StoreProvider>
          <AppShell />
        </StoreProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
