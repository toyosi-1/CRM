import type { Checklist, ChecklistItem, ChecklistTemplate } from '../types';
import { createChecklistIfMissing } from './db';

export function periodStart(frequency: string) {
  const now = new Date();
  if (frequency === 'daily') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (frequency === 'weekly') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start.setDate(start.getDate() - start.getDay());
    return start;
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

const pad = (n: number) => String(n).padStart(2, '0');

export function periodKey(frequency: string) {
  const start = periodStart(frequency);
  return `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
}

export function isDueToday(template: ChecklistTemplate) {
  return !(template.frequency === 'daily' && template.daysOfWeek?.length && !template.daysOfWeek.includes(new Date().getDay()));
}

export function instanceId(template: ChecklistTemplate) {
  return `${template.id}_${periodKey(template.frequency)}`;
}

const DAY_NAMES = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];

export function scheduleLabel(template: ChecklistTemplate) {
  if (template.frequency === 'weekly') return 'Weekly';
  if (template.frequency === 'monthly') return 'Monthly';
  const days = [...new Set(template.daysOfWeek ?? [])].sort((a, b) => a - b).map(d => DAY_NAMES[d]).filter(Boolean);
  if (days.length === 0) return 'Daily';
  if (days.length === 1) return days[0];
  return `${days.slice(0, -1).join(', ')} & ${days[days.length - 1]}`;
}

/**
 * Ensures one checklist instance exists per due template for the current
 * period. Instance ids are deterministic (template + period), so concurrent
 * callers converge on the same row.
 */
export async function ensureChecklistInstances(
  siteId: string,
  templates: ChecklistTemplate[],
  checklists: Checklist[]
): Promise<void> {
  for (const template of templates.filter(t => t.siteId === siteId && isDueToday(t))) {
    const id = instanceId(template);
    if (checklists.some(c => c.id === id)) continue;
    const items: ChecklistItem[] = template.zones.filter(z => z.active).flatMap(zone =>
      zone.items.map((item, index) => ({
        id: `${zone.id}-${item.id}-${index}`,
        label: item.name,
        checked: false,
        zone: zone.name,
        responseType: item.type,
        role: item.role,
        unit: item.unit,
      }))
    );
    if (items.length === 0) continue;
    try {
      await createChecklistIfMissing({
        id,
        title: template.title,
        siteId,
        type: 'facility_inspection',
        items,
        submittedToAdmin: false,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to generate scheduled checklist', error);
    }
  }
}
