// Tiny display helpers for the admin screens.
export const fmtDate = (d: Date | string | null | undefined) =>
	d ? new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Australia/Sydney' }) : '—';
export const fmtDateTime = (d: Date | string | null | undefined) =>
	d ? new Date(d).toLocaleString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Sydney' }) : '—';
export const fmtMoney = (v: string | number | null | undefined) =>
	v == null || v === '' ? '—' : '$' + Number(v).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
// For <input type="date"> values: local Sydney calendar date.
export const dateInput = (d: Date | string | null | undefined) =>
	d ? new Date(d).toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' }) : '';
export const daysUntil = (d: Date | string | null | undefined) =>
	d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400_000) : null;
export const statusClass = (s: string | null | undefined) =>
	s === 'Active' || s === 'active' ? 'ok' : s === 'Trialing' || s === 'Pending' || s === 'Past_due' ? 'warn'
	: s === 'Canceled' || s === 'Unpaid' || s === 'Expired' || s === 'locked' || s === 'inactive' ? 'bad' : '';
