/**
 * lib/icpTemplates.js
 * Saved ICP search templates per subscription — lets users reuse a search
 * without retyping. Requires Supabase (no file fallback: templates are a
 * paid-tier convenience feature, not a soft usage cap, so we don't want
 * them silently vanishing on a cold start with an ephemeral file).
 */
import { getSupabase } from './supabaseClient';

export async function listTemplates(subscriptionKey) {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('icp_templates')
    .select('*')
    .eq('subscription_key', subscriptionKey)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[icpTemplates] list failed:', error.message);
    return [];
  }
  return (data || []).map(rowToTemplate);
}

export async function saveTemplate(subscriptionKey, template) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Saved ICP templates require Supabase to be configured.');
  const { data, error } = await supabase
    .from('icp_templates')
    .insert({
      subscription_key:  subscriptionKey,
      name:              template.name,
      icp:               template.icp,
      industry:          template.industry || null,
      location:          template.location || null,
      company_size:      template.companySize || null,
      exclude_companies: template.excludeCompanies || null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToTemplate(data);
}

export async function deleteTemplate(subscriptionKey, id) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Saved ICP templates require Supabase to be configured.');
  const { error } = await supabase
    .from('icp_templates')
    .delete()
    .eq('subscription_key', subscriptionKey)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

function rowToTemplate(row) {
  return {
    id:               row.id,
    name:             row.name,
    icp:              row.icp,
    industry:         row.industry || '',
    location:         row.location || '',
    companySize:      row.company_size || '',
    excludeCompanies: row.exclude_companies || '',
    createdAt:        row.created_at,
  };
}
