import Link from 'next/link';
import { motion } from 'framer-motion';

const categoryColors = {
  'Customer Support': 'from-blue-500 to-cyan-400',
  'Marketing':        'from-green-500 to-emerald-400',
  'Content':          'from-yellow-500 to-orange-400',
  'Sales':            'from-pink-500 to-rose-400',
};

const categoryIcons = {
  'Customer Support': '🤖',
  'Marketing':        '📈',
  'Content':          '✍️',
  'Sales':            '💼',
};

export default function AgentCard({ agent, index = 0 }) {
  const gradient = categoryColors[agent.category] || 'from-brand-400 to-purple-500';
  const icon = categoryIcons[agent.category] || '⚡';

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

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto">
          {agent.price && (
            <div>
              <span className="text-2xl font-bold text-white">${agent.price}</span>
              <span className="text-gray-400 text-sm"> /mo</span>
            </div>
          )}
          <Link
            href={`/agents/${agent.id}`}
            className={`ml-auto px-4 py-2 rounded-xl bg-gradient-to-r ${gradient} text-white text-sm font-semibold hover:opacity-90 transition-all shadow-lg`}
          >
            View Details →
          </Link>
        </div>
      </div>
    </motion.div>
  );
}