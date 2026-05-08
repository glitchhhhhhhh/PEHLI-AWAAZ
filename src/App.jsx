import { useUIStore } from './store';
import { SocketProvider } from './context/SocketProvider';

// Light Mode Components
import LandingPage from './components/light/LandingPage';
import DashboardLayout from './components/light/DashboardLayout';
import LiveConversation from './components/light/LiveConversation';
import RMDashboard from './components/light/RMDashboard';
import AnalyticsDashboard from './components/light/AnalyticsDashboard';

export default function App() {
  const activeScene = useUIStore((s) => s.activeScene);
  const setScene = useUIStore((s) => s.setScene);

  const launchDemo = () => {
    setScene('live_conversation');
  };

  const renderContent = () => {
    // Render Landing Page
    if (activeScene === 'landing') {
      return <LandingPage onLaunch={launchDemo} />;
    }

    // Render Dashboard
    return (
      <DashboardLayout>
        {activeScene === 'live_conversation' && <LiveConversation />}
        {activeScene === 'rm_dashboard' && <RMDashboard />}
        {activeScene === 'analytics' && <AnalyticsDashboard />}
        
        {/* Fallback for undeveloped pages (Leads, Knowledge, Settings) */}
        {['leads', 'knowledge', 'settings', 'integrations'].includes(activeScene) && (
          <div className="flex flex-col items-center justify-center h-full bg-slate-50 text-slate-400">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4 opacity-50"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            <p className="text-lg font-medium">Page Under Construction</p>
            <button onClick={() => setScene('live_conversation')} className="mt-4 text-indigo-600 hover:underline">
              Return to Live Conversation
            </button>
          </div>
        )}
      </DashboardLayout>
    );
  };

  return (
    <SocketProvider>
      {renderContent()}
    </SocketProvider>
  );
}
