import Link from 'next/link';
import { motion } from 'framer-motion';
import { useCheckout } from '../hooks/useCheckout';

const categoryColors = {
  'Customer Support': 'from-blue-500 to-cyan-400',
  'Marketing':        'from-green-500 to-emerald-400',
  'Content':          'from-yellow-500 to-orange-400',
  'Sales':            'from-pink-500 to-rose-400',
  'Consulting':       'from-emerald-500 to-teal-400',
};

const categoryIcons = {
  'Customer Support': '🤖',
  'Marketing':        '📈',
  'Content':          '✍️',
  'Sales':            '💼',
  'Consulting':       '🎓',
};

// Per-agent icon overrides — keeps cards distinct even within a category
const AGENT_ICON_OVERRIDES = {
  'receptionist':      '🤖',
  'website-audit':     '📈',
  'blog-writer':       '✍️',
  'sales-assistant':   '💼',
  'lead-researcher':   '🔎',
  'social-hub':        '📱',
  'ai-training':       '🎓',
  'automation-expert': '⚡',
};

export default function AgentCard({ agent, index = 0 }) {
  const { handleCheckout, loading: checkoutLoading } = useCheckout();
  const gradient = categoryColors[agent.category] || 'from-brand-400 to-purple-500';
  const icon = AGENT_ICON_OVERRIDES[agent.id] || categoryIcons[agent.category] || '⚡';
  const isThisLoading = checkoutLoading === agent.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="glass rounded-2xl overflow-hidden flex flex-col group"
    >
      {/* Top gradient bar */}
      <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />

      <div className="p-6 flex flex-col flex-1">
        {/* Icon + category */}
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-2xl shadow-lg`}>
            {icon}
          </div>
          <span className="text-xs font-medium text-gray-400 bg-white/5 rounded-full px-3 py-1 border border-white/10">
            {agent.category}
          </span>
        </div>

        <h3 className="text-xl font-bold text-white mb-2 group-hover:gradient-text transition-all">
          {agent.name}
        </h3>
        <p className="text-gray-400 text-sm leading-relaxed mb-4 flex-1">
          {agent.description}
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {(agent.features || []).slice(0, 3).map((f, i) => (
            <span key={i} className="text-xs text-gray-300 bg-white/5 border border-white/10 rounded-full px-2.5 py-0.5">
              {f}
            </span>
          ))}
        </div>

        {/* Price */}
        <div className="mb-4">
          {agent.priceLabel ? (
            <div className="text-white font-bold text-lg leading-tight">{agent.priceLabel}</div>
          ) : agent.price ? (
            <div>
              <span className="text-2xl font-bold text-white">${agent.price}</span>
              <span className="text-gray-400 text-sm">{agent.priceSuffix || '/mo'}</span>
            </div>
          ) : null}
        </div>

        {/* CTAs — primary buy, secondary demo */}
        <div className="flex gap-2 mt-auto">
          <button
            onClick={() => handleCheckout(agent.id)}
            disabled={isThisLoading}
            className={`flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r ${gradient} text-white text-sm font-bold hover:opacity-90 transition-all shadow-lg disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-1.5`}
          >
            {isThisLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Loading…
              </>
            ) : (
              <>Get Started →</>
            )}
          </button>
          <Link
            href={`/agents/${agent.id}`}
            className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm font-semibold hover:bg-white/10 hover:text-white transition whitespace-nowrap"
            title="View demo, full features, and details"
          >
            👁 Demo
          </Link>
        </div>
      </div>
    </motion.div>
  );
}