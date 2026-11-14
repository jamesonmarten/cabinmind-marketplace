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
import SocialDashboard from '../../components/dashboards/SocialDashboard';
import TrainingDashboard from '../../components/dashboards/TrainingDashboard';
import AutomationDashboard from '../../components/dashboards/AutomationDashboard';
import { motion } from 'framer-motion';

const DASHBOARDS = {
  receptionist:      ReceptionistDashboard,
  'website-audit':   AuditDashboard,
  'blog-writer':     BlogDashboard,
  'sales-assistant': SalesDashboard,
  'lead-researcher': LeadDashboard,
  // Lead Researcher BYOK tiers — all use the same dashboard
  'lead-starter':    LeadDashboard,
  'lead-pro':        LeadDashboard,
  'lead-scale':      LeadDashboard,
  'lead-agency':     LeadDashboard,
  // Social Media Hub
  'social-hub':      SocialDashboard,
  // 1-on-1 AI Training
  'ai-training':     TrainingDashboard,
  // AI Automation Expert
  'automation-expert': AutomationDashboard,
  'automation-single': AutomationDashboard,
  'automation-agency': AutomationDashboard,
};

const AGENT_META = {
  receptionist:      { name: 'AI Receptionist',             icon: '🤖', color: 'from-blue-500 to-cyan-400'     },
  'website-audit':   { name: 'AI Website Auditor',           icon: '📈', color: 'from-green-500 to-emerald-400' },
  'blog-writer':     { name: 'AI Blog Writer',               icon: '✍️',  color: 'from-yellow-500 to-orange-400' },
  'sales-assistant': { name: 'AI Sales Assistant',           icon: '💼', color: 'from-pink-500 to-rose-400'     },
  'lead-researcher': { name: 'AI Lead Researcher',           icon: '🔎', color: 'from-purple-500 to-violet-400' },
  'lead-starter':    { name: 'AI Lead Researcher — Starter', icon: '🔎', color: 'from-purple-500 to-violet-400' },
  'lead-pro':        { name: 'AI Lead Researcher — Pro',     icon: '🔎', color: 'from-purple-500 to-violet-400' },
  'lead-scale':      { name: 'AI Lead Researcher — Scale',   icon: '🔎', color: 'from-purple-600 to-fuchsia-500'},
  'lead-agency':     { name: 'AI Lead Researcher — Agency',  icon: '🔎', color: 'from-violet-600 to-purple-500' },
  'social-hub':      { name: 'AI Social Media Hub',          icon: '📱', color: 'from-pink-500 to-orange-400'  },
  'ai-training':     { name: '1-on-1 AI Training',            icon: '🎓', color: 'from-emerald-500 to-teal-400'  },
  'automation-expert': { name: 'AI Automation Expert',        icon: '⚡', color: 'from-amber-500 to-orange-500'  },
  'automation-single': { name: 'AI Automation — Single Workflow', icon: '⚡', color: 'from-amber-500 to-orange-500' },
  'automation-agency': { name: 'AI Automation — Agency',      icon: '⚡', color: 'from-amber-600 to-red-500'    },
};

export default function DashboardPage() {
  const router = useRouter();
  const { token } = router.query;

  const [session, setSession] = useState(null);
  const [loading, setLoading]  = useState(true);
  const [error, setError]      = useState(null);
  const [cancelState, setCancelState] = useState(null); // null | 'confirming' | 'cancelling' | { cancelAt }
  const [brandForm, setBrandForm] = useState({ brandCompany: '', brandLogoUrl: '', brandColor: '' });
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandSaved, setBrandSaved] = useState(false);

  useEffect(() => {
    if (!router.isReady || !token) return;
    fetch(`/api/dashboard/session?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setLoading(false); return; }
        setSession(data);
        setBrandForm({
          brandCompany: data.brandCompany || '',
          brandLogoUrl: data.brandLogoUrl || '',
          brandColor:   data.brandColor || '',
        });
        setLoading(false);
      })
      .catch(() => { setError('Could not load your dashboard.'); setLoading(false); });
  }, [router.isReady, token]);

  const saveBranding = async () => {
    setBrandSaving(true);
    try {
      await fetch('/api/dashboard/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...brandForm }),
      });
      setSession(s => ({ ...s, ...brandForm, whiteLabel: true }));
      setBrandSaved(true);
      setTimeout(() => setBrandSaved(false), 2500);
    } catch {}
    setBrandSaving(false);
  };

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
          <p className="text-gray-500 text-sm">Check your welcome email for the correct link, or contact <a href="mailto:info@devcabin.tech" className="text-brand-400">info@devcabin.tech</a></p>
        </div>
      </div>
    </Layout>
  );

  const meta = AGENT_META[session.agentId] || { name: 'Agent Dashboard', icon: '⚡', color: 'from-brand-500 to-purple-500' };
  const DashboardComponent = DASHBOARDS[session.agentId];

  // White-label overrides (Agency plan only)
  const brandName = session.whiteLabel && session.brandCompany ? session.brandCompany : 'CabinMind';
  const displayName = session.whiteLabel && session.brandCompany ? `${meta.name} — ${session.brandCompany}` : meta.name;

  return (
    <Layout title={`${meta.name} Dashboard – ${brandName}`}>
      {/* Header bar */}
      <div className={`bg-gradient-to-r ${meta.color} pt-16`} style={session.whiteLabel && session.brandColor ? { background: session.brandColor } : undefined}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
            {session.whiteLabel && session.brandLogoUrl
              ? <img src={session.brandLogoUrl} alt={brandName} className="h-12 w-12 object-contain rounded-lg bg-white/10" />
              : <span className="text-5xl">{meta.icon}</span>}
            <div>
              <p className="text-white/70 text-sm font-medium">Your Dashboard</p>
              <h1 className="text-3xl font-black text-white">{displayName}</h1>
              <p className="text-white/60 text-sm mt-0.5">
                {session.customerName && `${session.customerName} · `}{session.customerEmail}
              </p>
            </div>
            <div className="ml-auto text-right hidden sm:block">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-3 py-1.5 rounded-full text-white text-xs font-medium">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                {cancelState?.cancelAt ? 'Cancels at period end' : 'Active subscription'}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Dashboard content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {DashboardComponent ? (
          <DashboardComponent
            session={session}
            dashboardToken={token}
            isPaid={true}
            initialPlan={
              session.agentId === 'lead-pro'    ? 'pro'
              : session.agentId === 'lead-scale'  ? 'scale'
              : session.agentId === 'lead-agency' ? 'agency'
              : 'starter'
            }
          />
        ) : (
          <div className="text-center py-24 text-gray-500">Dashboard coming soon.</div>
        )}

        {/* White-label branding (Agency plan only) */}
        {session.agentId === 'lead-agency' && (
          <div className="mt-16 border-t border-white/10 pt-8">
            <h3 className="text-gray-500 text-xs uppercase tracking-widest font-semibold mb-4">White-Label Branding</h3>
            <p className="text-gray-500 text-sm mb-4">Replace CabinMind branding on this dashboard with your own for client-facing resale.</p>
            <div className="grid sm:grid-cols-3 gap-3 max-w-2xl">
              <input value={brandForm.brandCompany} onChange={e => setBrandForm(f => ({ ...f, brandCompany: e.target.value }))}
                placeholder="Your company name" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50" />
              <input value={brandForm.brandLogoUrl} onChange={e => setBrandForm(f => ({ ...f, brandLogoUrl: e.target.value }))}
                placeholder="Logo URL" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50" />
              <input value={brandForm.brandColor} onChange={e => setBrandForm(f => ({ ...f, brandColor: e.target.value }))}
                placeholder="Brand color (e.g. #7c3aed)" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50" />
            </div>
            <button onClick={saveBranding} disabled={brandSaving}
              className="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition">
              {brandSaving ? 'Saving…' : brandSaved ? '✅ Saved' : 'Save Branding'}
            </button>
          </div>
        )}

        {/* Manage Subscription */}
        <div className="mt-16 border-t border-white/10 pt-8">
          <h3 className="text-gray-500 text-xs uppercase tracking-widest font-semibold mb-4">Manage Subscription</h3>
          {cancelState?.cancelAt ? (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm">
              <p className="text-amber-300 font-medium">Your subscription is set to cancel on {new Date(cancelState.cancelAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.</p>
              <p className="text-gray-400 mt-1">You'll retain full access until then. Contact <a href="mailto:info@devcabin.tech" className="text-brand-400 hover:underline">info@devcabin.tech</a> to reactivate.</p>
            </div>
          ) : cancelState === 'confirming' ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <p className="text-red-300 font-medium text-sm mb-3">Are you sure you want to cancel?</p>
              <p className="text-gray-400 text-xs mb-4">Your subscription will remain active until the end of your current billing period. No further charges will be made.</p>
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    setCancelState('cancelling');
                    try {
                      const r = await fetch('/api/dashboard/cancel', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token }),
                      });
                      const data = await r.json();
                      if (data.success) {
                        setCancelState({ cancelAt: data.cancelAt });
                      } else {
                        alert(data.error || 'Failed to cancel');
                        setCancelState(null);
                      }
                    } catch {
                      alert('Something went wrong. Please try again.');
                      setCancelState(null);
                    }
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition"
                >
                  Yes, cancel my subscription
                </button>
                <button
                  onClick={() => setCancelState(null)}
                  className="px-4 py-2 bg-white/5 border border-white/10 text-gray-400 text-xs font-bold rounded-lg hover:bg-white/10 transition"
                >
                  Nevermind, keep it
                </button>
              </div>
            </div>
          ) : cancelState === 'cancelling' ? (
            <p className="text-gray-500 text-sm">Cancelling…</p>
          ) : (
            <button
              onClick={() => setCancelState('confirming')}
              className="text-xs text-gray-600 hover:text-red-400 transition underline underline-offset-2"
            >
              Cancel subscription
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
}
