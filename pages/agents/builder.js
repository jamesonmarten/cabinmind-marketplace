import Layout from '../../components/Layout';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = ['Customer Support', 'Marketing', 'Content', 'Sales', 'Operations', 'Finance', 'Other'];

const FIELD_ICONS = {
  name: '🏷️', prompt: '🧠', category: '📂', price: '💰',
  features: '✨', tools: '🔧', actions: '⚡',
};

const STEPS = [
  { id: 'basics',   label: 'Basics',      fields: ['name', 'category', 'price'] },
  { id: 'prompt',   label: 'Prompt',      fields: ['prompt'] },
  { id: 'details',  label: 'Capabilities', fields: ['features', 'tools', 'actions'] },
  { id: 'review',   label: 'Review',      fields: [] },
];

function FloatingOrb({ className }) {
  return <div className={`absolute rounded-full blur-3xl opacity-10 pointer-events-none animate-pulse-slow ${className}`} />;
}

function StepIndicator({ steps, current }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-10">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
            i < current ? 'bg-gradient-to-br from-brand-500 to-purple-600 text-white' :
            i === current ? 'bg-gradient-to-br from-brand-400 to-purple-500 text-white shadow-lg shadow-brand-500/40 scale-110' :
            'bg-white/5 border border-white/10 text-gray-500'
          }`}>
            {i < current ? '✓' : i + 1}
          </div>
          <span className={`text-sm font-medium hidden sm:block ${i === current ? 'text-white' : 'text-gray-500'}`}>{step.label}</span>
          {i < steps.length - 1 && (
            <div className={`w-8 h-0.5 rounded-full ${i < current ? 'bg-brand-500' : 'bg-white/10'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

const PLACEHOLDERS = {
  name: 'e.g. AI Customer Support Agent',
  prompt: 'e.g. You are a friendly AI assistant for Acme Corp. Answer customer questions politely, qualify leads, and offer to book a call if they seem interested. Keep responses under 3 sentences.',
  category: '',
  price: '29',
  features: 'e.g. 24/7 availability, Lead qualification, Appointment booking',
  tools: 'e.g. Calendar API, CRM lookup, FAQ database',
  actions: 'e.g. Book appointment, Send lead to CRM, Email summary',
};

const FIELD_LABELS = {
  name: 'Agent Name',
  prompt: 'System Prompt',
  category: 'Category',
  price: 'Monthly Price ($)',
  features: 'Features',
  tools: 'Tools',
  actions: 'Actions',
};

const FIELD_HELP = {
  name: 'Give your agent a clear, descriptive name.',
  prompt: 'This is the instruction set your agent follows. Be specific about tone, tasks, and limits.',
  category: 'Choose the best-fit category for your agent.',
  price: 'What you\'ll charge subscribers per month.',
  features: 'Comma-separated list of what your agent can do.',
  tools: 'Comma-separated list of APIs or systems it connects to.',
  actions: 'Comma-separated list of actions it can take.',
};

export default function AgentBuilder() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '', prompt: '', category: 'Customer Support',
    price: '', features: '', tools: '', actions: '',
  });
  const [submitted, setSubmitted] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
  }

  const inputClass = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-400/50 focus:bg-white/8 transition-all text-sm';
  const labelClass = 'block text-sm font-semibold text-gray-300 mb-2';

  function renderField(field) {
    if (field === 'prompt') {
      return (
        <div key={field}>
          <label className={labelClass} htmlFor={field}>
            <span className="mr-2">{FIELD_ICONS[field]}</span>{FIELD_LABELS[field]}
          </label>
          <textarea
            id={field} name={field} rows={6}
            className={inputClass}
            value={form[field]}
            onChange={handleChange}
            placeholder={PLACEHOLDERS[field]}
            required
          />
          <p className="text-xs text-gray-500 mt-1.5">{FIELD_HELP[field]}</p>
        </div>
      );
    }
    if (field === 'category') {
      return (
        <div key={field}>
          <label className={labelClass} htmlFor={field}>
            <span className="mr-2">{FIELD_ICONS[field]}</span>{FIELD_LABELS[field]}
          </label>
          <select
            id={field} name={field}
            className={`${inputClass} cursor-pointer`}
            value={form[field]}
            onChange={handleChange}
          >
            {CATEGORIES.map((c) => <option key={c} value={c} className="bg-gray-900">{c}</option>)}
          </select>
        </div>
      );
    }
    return (
      <div key={field}>
        <label className={labelClass} htmlFor={field}>
          <span className="mr-2">{FIELD_ICONS[field]}</span>{FIELD_LABELS[field]}
        </label>
        <input
          id={field} name={field}
          type={field === 'price' ? 'number' : 'text'}
          className={inputClass}
          value={form[field]}
          onChange={handleChange}
          placeholder={PLACEHOLDERS[field]}
          required={['name'].includes(field)}
        />
        <p className="text-xs text-gray-500 mt-1.5">{FIELD_HELP[field]}</p>
      </div>
    );
  }

  // Review step
  function ReviewStep() {
    const rows = [
      { label: 'Name',     value: form.name || '—',     icon: '🏷️' },
      { label: 'Category', value: form.category || '—', icon: '📂' },
      { label: 'Price',    value: form.price ? `$${form.price}/mo` : '—', icon: '💰' },
      { label: 'Features', value: form.features || '—', icon: '✨' },
      { label: 'Tools',    value: form.tools || '—',    icon: '🔧' },
      { label: 'Actions',  value: form.actions || '—',  icon: '⚡' },
    ];
    return (
      <div className="space-y-4">
        <div className="glass rounded-2xl p-5 border border-white/10 space-y-3">
          {rows.map((r) => (
            <div key={r.label} className="flex items-start gap-3 text-sm">
              <span className="text-lg mt-0.5">{r.icon}</span>
              <div>
                <div className="text-gray-400 font-medium text-xs uppercase tracking-wide mb-0.5">{r.label}</div>
                <div className="text-white">{r.value}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="glass rounded-2xl p-5 border border-white/10">
          <div className="flex items-start gap-3 text-sm">
            <span className="text-lg mt-0.5">🧠</span>
            <div>
              <div className="text-gray-400 font-medium text-xs uppercase tracking-wide mb-0.5">System Prompt</div>
              <div className="text-white text-xs leading-relaxed whitespace-pre-wrap">{form.prompt || '—'}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <Layout title="Agent Builder – CabinMind" fullBleed>
        <div className="min-h-screen flex items-center justify-center px-4 relative">
          <FloatingOrb className="w-96 h-96 bg-brand-500 top-1/4 left-1/4" />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-3xl p-12 text-center max-w-lg w-full border border-brand-400/20 relative z-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="text-6xl mb-6"
            >
              🎉
            </motion.div>
            <h2 className="text-3xl font-black text-white mb-3">Agent Submitted!</h2>
            <p className="text-gray-400 mb-2">
              <span className="font-semibold text-white">{form.name}</span> has been submitted for review.
            </p>
            <p className="text-gray-500 text-sm mb-8">
              In the full version, your agent will go live in the marketplace after approval. Persistence and payments coming soon.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => { setSubmitted(false); setStep(0); setForm({ name:'',prompt:'',category:'Customer Support',price:'',features:'',tools:'',actions:'' }); }}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 text-white font-bold hover:opacity-90 transition-all"
              >
                Build Another
              </button>
              <a href="/agents" className="px-6 py-3 rounded-xl glass border border-white/10 text-white font-semibold hover:border-white/20 transition-all">
                View Marketplace
              </a>
            </div>
          </motion.div>
        </div>
      </Layout>
    );
  }

  const currentStepData = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  return (
    <Layout title="Agent Builder – CabinMind" fullBleed>
      <div className="min-h-screen relative overflow-hidden pt-16">
        <FloatingOrb className="w-[500px] h-[500px] bg-brand-600 -top-48 -right-48" />
        <FloatingOrb className="w-96 h-96 bg-purple-600 bottom-0 -left-32" />
        <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto px-4 py-16">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full text-sm text-gray-300 mb-6 border border-brand-400/20">
              ⚙️ Agent Builder
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-white mb-3">
              Build Your <span className="gradient-text">AI Agent</span>
            </h1>
            <p className="text-gray-400">Define your agent, set its capabilities, and submit it to the marketplace.</p>
          </motion.div>

          <StepIndicator steps={STEPS} current={step} />

          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
              >
                <div className="glass rounded-2xl p-8 border border-white/10 space-y-6">
                  <h2 className="text-xl font-bold text-white">
                    Step {step + 1}: {currentStepData.label}
                  </h2>

                  {currentStepData.id === 'review'
                    ? <ReviewStep />
                    : currentStepData.fields.map(renderField)
                  }
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                className="px-6 py-3 rounded-xl glass border border-white/10 text-white font-semibold disabled:opacity-30 hover:border-white/20 transition-all"
              >
                ← Back
              </button>

              {isLastStep ? (
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 text-white font-bold hover:opacity-90 transition-all shadow-xl shadow-brand-500/30"
                >
                  🚀 Submit Agent
                </motion.button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 text-white font-bold hover:opacity-90 transition-all shadow-xl shadow-brand-500/30"
                >
                  Next →
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <footer className="border-t border-white/5 py-8 text-center text-gray-600 text-sm relative z-10">
        © {new Date().getFullYear()} Dev Cabin Technologies · CabinMind
      </footer>
    </Layout>
  );
}