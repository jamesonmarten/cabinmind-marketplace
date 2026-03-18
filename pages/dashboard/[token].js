/**
 * /dashboard/[token]
 * Customer product dashboard — unique per subscriber.
 * Token is generated on purchase and embedded in the confirmation email.
 * Each agent gets its own full-featured UI here.
 */
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import ReceptionistDashboard from '../../components/dashboards/ReceptionistDashboard';
import AuditDashboard from '../../components/dashboards/AuditDashboard';
import BlogDashboard from '../../components/dashboards/BlogDashboard';
import SalesDashboard from '../../components/dashboards/SalesDashboard';
import LeadDashboard from '../../components/dashboards/LeadDashboard';
import { motion } from 'framer-motion';

const DASHBOARDS = {
  receptionist:      ReceptionistDashboard,
  'website-audit':   AuditDashboard,
  'blog-writer':     BlogDashboard,
  'sales-assistant': SalesDashboard,
  'lead-researcher': LeadDashboard,
};

const AGENT_META = {
  receptionist:      { name: 'AI Receptionist',    icon: '🤖', color: 'from-blue-500 to-cyan-400' },
  'website-audit':   { name: 'AI Website Auditor',  icon: '📈', color: 'from-green-500 to-emerald-400' },
  'blog-writer':     { name: 'AI Blog Writer',       icon: '✍️', color: 'from-yellow-500 to-orange-400' },
  'sales-assistant': { name: 'AI Sales Assistant',   icon: '💼', color: 'from-pink-500 to-rose-400' },
  'lead-researcher': { name: 'AI Lead Researcher',   icon: '🔎', color: 'from-purple-500 to-violet-400' },
};

export default function DashboardPage() {
  const router = useRouter();
  const { token } = router.query;

  const [session, setSession] = useState(null);
  const [loading, setLoading]  = useState(true);
  const [error, setError]      = useState(null);

  useEffect(() => {
    if (!router.isReady || !token) return;
    fetch(`/api/dashboard/session?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setLoading(false); return; }
        setSession(data);
        setLoading(false);
      })
      .catch(() => { setError('Could not load your dashboard.'); setLoading(false); });
  }, [router.isReady, token]);

  if (loading) return (
    <Layout title="Loading your dashboard…">
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading your dashboard…</p>
        </div>
      </div>
    </Layout>
  );

  if (error) return (
    <Layout title="Dashboard not found">
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-white mb-3">Dashboard not found</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <p className="text-gray-500 text-sm">Check your welcome email for the correct link, or contact <a href="mailto:support@devcabin.tech" className="text-brand-400">support@devcabin.tech</a></p>
        </div>
      </div>
    </Layout>
  );

  const meta = AGENT_META[session.agentId] || { name: 'Agent Dashboard', icon: '⚡', color: 'from-brand-500 to-purple-500' };
  const DashboardComponent = DASHBOARDS[session.agentId];

  return (
    <Layout title={`${meta.name} Dashboard – CabinMind`}>
      {/* Header bar */}
      <div className={`bg-gradient-to-r ${meta.color} pt-16`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
            <span className="text-5xl">{meta.icon}</span>
            <div>
              <p className="text-white/70 text-sm font-medium">Your Dashboard</p>
              <h1 className="text-3xl font-black text-white">{meta.name}</h1>
              <p className="text-white/60 text-sm mt-0.5">
                {session.customerName && `${session.customerName} · `}{session.customerEmail}
              </p>
            </div>
            <div className="ml-auto text-right hidden sm:block">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-3 py-1.5 rounded-full text-white text-xs font-medium">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Active subscription
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Dashboard content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {DashboardComponent ? (
          <DashboardComponent session={session} isPaid={true} />
        ) : (
          <div className="text-center py-24 text-gray-500">Dashboard coming soon.</div>
        )}
      </div>
    </Layout>
  );
}
