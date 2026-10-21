import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Building2, LifeBuoy, Menu, Moon, Search, Sun, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { ROLE_LABELS } from '../../utils/helpers';
import { markNotificationRead, subscribeNotifications, type AppNotification } from '../../lib/db';
import { enablePushNotifications, getPushSubscription, pushSupported } from '../../lib/push';

interface TopBarProps {
  darkMode: boolean;
  onToggleTheme: () => void;
  onOpenMenu: () => void;
}

const PORTAL_TITLES: Record<string, string> = {
  facility_manager: 'FM Portal',
  procurement: 'Procurement Portal',
  supervisor: 'Supervisor Portal',
  finance: 'Finance Portal',
  technician: 'Technician Portal',
  admin: 'Admin Portal',
  ict_admin: 'ICT Admin',
};

export default function TopBar({ darkMode, onToggleTheme, onOpenMenu }: TopBarProps) {
  const navigate = useNavigate();
  const { currentUser, requests, sites, activeSiteId, setActiveSiteId, users } = useStore();
  const [search, setSearch] = useState('');
  const [showBell, setShowBell] = useState(false);
  const [storedNotifications, setStoredNotifications] = useState<AppNotification[]>([]);
  const [pushState, setPushState] = useState<'unsupported' | 'off' | 'on' | 'denied'>('off');
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState('');

  useEffect(() => subscribeNotifications(setStoredNotifications), []);
  useEffect(() => {
    const check = async () => {
      if (!pushSupported()) { setPushState('unsupported'); return; }
      if (Notification.permission === 'denied') { setPushState('denied'); return; }
      const sub = await getPushSubscription();
      setPushState(sub ? 'on' : 'off');
    };
    void check();
  }, []);

  const enablePush = async () => {
    if (!currentUser) return;
    setPushBusy(true);
    setPushError('');
    const result = await enablePushNotifications(currentUser.id);
    if (result.ok) setPushState('on'); else setPushError(result.reason ?? 'Unable to enable notifications.');
    setPushBusy(false);
  };

  if (!currentUser) return null;

  // Only FM and technician work is site-scoped; other roles operate across all facilities
  const siteScoped = currentUser.role === 'facility_manager' || currentUser.role === 'technician';
  const assignedSiteIds = currentUser.siteIds?.length ? [...currentUser.siteIds] : (currentUser.siteId ? [currentUser.siteId] : []);
  // Acting FM coverage (spec §5.8): include covered sites while the assignment window is live
  const todayIso = new Date().toISOString().slice(0, 10);
  const covered = users.find(u => u.id === currentUser.actingForProfileId);
  if (covered && currentUser.actingStart && currentUser.actingEnd && currentUser.actingStart <= todayIso && currentUser.actingEnd >= todayIso) {
    (covered.siteIds?.length ? covered.siteIds : [covered.siteId].filter(Boolean)).forEach(id => {
      if (id && !assignedSiteIds.includes(id)) assignedSiteIds.push(id);
    });
  }
  const site = siteScoped ? sites.find(item => item.id === (activeSiteId ?? currentUser.siteId)) : undefined;
  const siteLabel = site?.name ?? (siteScoped || currentUser.role === 'admin' ? 'All facilities' : ROLE_LABELS[currentUser.role]);
  const slaBreached = requests.filter(request => request.slaBreached && !['PAID', 'CLOSED', 'REJECTED'].includes(request.status)).length;
  const pendingCount = currentUser.role === 'procurement'
    ? requests.filter(request => request.status === 'REQUEST_CREATED').length
    : currentUser.role === 'supervisor'
      ? requests.filter(request => ['PO_GENERATED', 'SUPERVISOR_APPROVAL'].includes(request.status)).length
      : currentUser.role === 'finance'
        ? requests.filter(request => ['PAYMENT_PENDING', 'ADMIN_APPROVED'].includes(request.status)).length
        : currentUser.role === 'admin'
          ? requests.filter(request => !['PAID', 'CLOSED', 'REJECTED'].includes(request.status)).length
          : requests.filter(request => request.siteId === (activeSiteId ?? currentUser.siteId) && !['PAID', 'CLOSED', 'REJECTED'].includes(request.status)).length;
  const term = search.trim().toLowerCase();
  const results = term.length < 2 ? [] : requests.filter(request => [request.requestNumber, request.description, request.siteName, request.vendorName]
    .some(value => value?.toLowerCase().includes(term))).slice(0, 6);
  const actionNotifications = [
    slaBreached > 0 ? `${slaBreached} active SLA breach${slaBreached === 1 ? '' : 'es'}` : null,
    pendingCount > 0 ? `${pendingCount} item${pendingCount === 1 ? '' : 's'} pending your action` : null,
  ].filter((item): item is string => Boolean(item));
  const unreadCount = storedNotifications.filter(notification => !notification.readAt).length + actionNotifications.length;
  const openNotification = async (notification: AppNotification) => {
    if (!notification.readAt) {
      await markNotificationRead(notification.id);
      setStoredNotifications(current => current.map(item => item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item));
    }
    if (notification.link) navigate(notification.link);
    setShowBell(false);
  };

  return (
    <header className="app-topbar">
      <button className="topbar-icon mobile-menu" onClick={onOpenMenu} aria-label="Open navigation"><Menu size={17} /></button>
      <div className="topbar-title">
        <strong>{PORTAL_TITLES[currentUser.role] ?? ROLE_LABELS[currentUser.role]}</strong>
        <span className="tb-sep" aria-hidden="true" />
        <span className="tb-sub">{siteLabel} · {new Date().toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
      </div>
      <div className="global-search">
        <Search size={14} />
        <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search requests, sites, vendors…" aria-label="Global search" />
        {search && <button onClick={() => setSearch('')} aria-label="Clear search"><X size={13} /></button>}
        {search.trim().length >= 2 && (
          <div className="search-results">
            {results.length ? results.map(request => (
              <button key={request.id} onClick={() => { navigate(`/request/${request.id}`); setSearch(''); }}>
                <strong>{request.requestNumber}</strong><span>{request.description}</span><small>{request.siteName}</small>
              </button>
            )) : <p>No matching requests</p>}
          </div>
        )}
      </div>
      <div className="topbar-actions">
        {siteScoped && (assignedSiteIds.length > 1 ? (
          <select className="site-pill bg-transparent" value={site?.id ?? ''} onChange={event => setActiveSiteId(event.target.value)} aria-label="Switch facility">
            {assignedSiteIds.map(id => <option key={id} value={id}>{sites.find(item => item.id === id)?.name ?? id}</option>)}
          </select>
        ) : (
          <span className="site-pill"><Building2 size={13} />{site?.name ?? 'All sites'}</span>
        ))}
        <button className="topbar-icon" onClick={() => navigate('/support')} title="Help & support" aria-label="Help and support"><LifeBuoy size={15} /></button>
        <button className="topbar-icon" onClick={onToggleTheme} title={darkMode ? 'Use light mode' : 'Use dark mode'} aria-label="Toggle theme">{darkMode ? <Sun size={15} /> : <Moon size={15} />}</button>
        <div className="notification-wrap">
          <button className="topbar-icon" onClick={() => setShowBell(value => !value)} aria-label="Notifications"><Bell size={15} />{unreadCount > 0 && <span className="notification-dot" />}</button>
          {showBell && <div className="notification-panel"><div><strong>Notifications</strong><button onClick={() => setShowBell(false)}><X size={13} /></button></div>{pushState === 'off' && <button className="block w-full text-left px-3 py-2 border-t border-slate-100 text-xs font-bold text-brand-600" onClick={() => void enablePush()} disabled={pushBusy}>{pushBusy ? 'Enabling…' : 'Enable push notifications on this device'}</button>}{pushState === 'denied' && <p className="px-3 py-2 border-t border-slate-100 text-xs text-amber-600">Push notifications are blocked — allow them in browser settings</p>}{pushError && <p className="px-3 py-2 text-xs text-red-600">{pushError}</p>}{actionNotifications.map(message => <p key={message}>{message}</p>)}{storedNotifications.map(notification => <button key={notification.id} className={`block w-full text-left px-3 py-2 border-t border-slate-100 ${notification.readAt ? 'opacity-60' : ''}`} onClick={() => void openNotification(notification)}><strong className="block text-xs">{notification.title}</strong><span className="text-xs text-slate-500">{notification.body}</span></button>)}{!actionNotifications.length && !storedNotifications.length && <p>No pending actions</p>}</div>}
        </div>
      </div>
    </header>
  );
}
