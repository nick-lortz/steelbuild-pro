import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import {
  Building, LayoutDashboard, FolderOpen, FileText, MessageSquareWarning,
  FileCheck, DollarSign, Users, ChevronDown, Search, LogOut,
  Settings, UserCircle, Menu, X, LayoutGrid,
  Calendar, Truck, Camera, Clock, BarChart3, Wrench, Package,
  Gauge, TrendingUp, Sparkles, Hash, AlertCircle, CheckCircle2,
  MessageSquare, File, Bell
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import NotificationCenter from '@/components/notifications/NotificationCenter';

// ── Primary nav tabs (visible in the bar) ──────────────────────────────────
const PRIMARY_TABS = [
  { name: 'Dashboard',      page: 'ProjectDashboard',  icon: LayoutDashboard },
  { name: 'Projects',       page: 'Projects',           icon: FolderOpen },
  { name: 'Drawings',       page: 'Drawings',           icon: FileText },
  { name: 'RFIs',           page: 'RFIHub',             icon: MessageSquareWarning },
  { name: 'Change Orders',  page: 'ChangeOrders',       icon: FileCheck },
  { name: 'Finance',        page: 'FinancialsRedesign', icon: DollarSign },
  { name: 'Resources',      page: 'Resources',          icon: Users },
];

// ── "More" secondary groups ─────────────────────────────────────────────────
const MORE_GROUPS = [
  {
    label: 'Field Execution',
    items: [
      { name: 'Schedule',          page: 'Schedule',         icon: Calendar },
      { name: 'Weekly Schedule',   page: 'WeeklySchedule',   icon: Calendar },
      { name: 'Field Tools',       page: 'FieldTools',       icon: Camera },
      { name: 'Daily Logs',        page: 'DailyLogs',        icon: FileText },
      { name: 'Photos',            page: 'ProjectPhotos',    icon: Camera },
    ],
  },
  {
    label: 'Fabrication & Logistics',
    items: [
      { name: 'Fabrication',       page: 'Fabrication',      icon: Wrench },
      { name: 'Work Packages',     page: 'WorkPackages',     icon: Package },
      { name: 'Deliveries',        page: 'Deliveries',       icon: Truck },
      { name: 'Look-Ahead',        page: 'LookAheadPlanning',icon: Calendar },
      { name: 'Shipping & Travel', page: 'PMShippingTravel', icon: Truck },
    ],
  },
  {
    label: 'Communications',
    items: [
      { name: 'Submittals',        page: 'Submittals',       icon: FileCheck },
      { name: 'Messages',          page: 'Messages',         icon: MessageSquare },
      { name: 'Production Notes',  page: 'ProductionMeetings',icon: Calendar },
      { name: 'Meetings',          page: 'Meetings',         icon: Users },
      { name: 'Action Items',      page: 'MyActionItems',    icon: CheckCircle2 },
    ],
  },
  {
    label: 'Cost Control',
    items: [
      { name: 'Budget Control',    page: 'BudgetControl',    icon: BarChart3 },
      { name: 'Cost Codes',        page: 'CostCodes',        icon: Hash },
      { name: 'Labor & Scope',     page: 'LaborScope',       icon: Clock },
      { name: 'Labor',             page: 'Labor',            icon: Clock },
      { name: 'Equipment',         page: 'Equipment',        icon: Truck },
    ],
  },
  {
    label: 'Reporting & Analytics',
    items: [
      { name: 'Portfolio Pulse',   page: 'PortfolioPulse',           icon: Gauge },
      { name: 'Executive Roll-Up', page: 'ExecutiveRollUp',          icon: TrendingUp },
      { name: 'Project Analytics', page: 'ProjectAnalyticsDashboard',icon: BarChart3 },
      { name: 'Job Status Report', page: 'JobStatusReport',          icon: FileText },
      { name: 'Reports',           page: 'Reports',                  icon: FileText },
      { name: 'AI Insights',       page: 'Insights',                 icon: Sparkles },
    ],
  },
  {
    label: 'Job Setup',
    items: [
      { name: 'Contracts',         page: 'Contracts',        icon: FileText },
      { name: 'Job Setup',         page: 'PMJobSetup',       icon: CheckCircle2 },
      { name: 'Scope & Exclusions',page: 'PMScopeExclusions',icon: FileText },
      { name: 'Contacts',          page: 'PMContacts',       icon: Users },
      { name: 'Documents',         page: 'Documents',        icon: File },
      { name: 'Detailing',         page: 'Detailing',        icon: FileCheck },
      { name: 'Alerts',            page: 'Alerts',           icon: AlertCircle },
      { name: 'Calendar',          page: 'Calendar',         icon: Calendar },
      { name: 'To-Do List',        page: 'ToDoList',         icon: CheckCircle2 },
    ],
  },
];

// flat list for search
const ALL_MORE_ITEMS = MORE_GROUPS.flatMap(g => g.items.map(i => ({ ...i, group: g.label })));

// ── More Dropdown ────────────────────────────────────────────────────────────
function MoreDropdown({ currentPageName }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const isMoreActive = MORE_GROUPS.some(g => g.items.some(i => i.page === currentPageName));

  // focus search on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setQuery('');
    }
  }, [open]);

  // keyboard: Escape closes
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') setOpen(false);
  }, []);

  const filtered = query.trim()
    ? ALL_MORE_ITEMS.filter(i =>
        i.name.toLowerCase().includes(query.toLowerCase()) ||
        i.group.toLowerCase().includes(query.toLowerCase())
      )
    : null;

  return (
    <div className="relative" onKeyDown={handleKeyDown}>
      <button
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="More navigation items"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-1 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF5A1F] focus-visible:outline-offset-2',
          'transition-all duration-150'
        )}
        style={{
          fontSize: '0.65rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          padding: '6px 12px',
          color: isMoreActive ? '#fff' : 'rgba(255,255,255,0.38)',
          background: isMoreActive ? 'rgba(255,255,255,0.07)' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        More
        <ChevronDown
          size={10}
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
            color: 'rgba(255,255,255,0.4)',
          }}
        />
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* panel */}
          <div
            role="dialog"
            aria-label="More modules"
            className="absolute top-full mt-2 z-50"
            style={{
              left: '50%',
              transform: 'translateX(-50%)',
              width: 520,
              maxHeight: '72vh',
              overflowY: 'auto',
              background: '#0D1117',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
              boxShadow: '0 24px 64px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,90,31,0.08)',
            }}
          >
            {/* Search */}
            <div
              style={{
                padding: '10px 12px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                position: 'sticky',
                top: 0,
                background: '#0D1117',
                zIndex: 1,
              }}
            >
              <Search size={13} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search modules…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                aria-label="Search modules"
                style={{
                  background: 'transparent',
                  border: 'none !important',
                  outline: 'none',
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.8)',
                  width: '100%',
                  padding: '0 !important',
                  boxShadow: 'none !important',
                }}
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 0 }}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div style={{ padding: '8px 4px' }}>
              {filtered ? (
                /* Search results — flat list */
                filtered.length === 0 ? (
                  <p style={{ padding: '16px 12px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                    No modules found
                  </p>
                ) : (
                  <div style={{ padding: '0 8px' }}>
                    <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,90,31,0.6)', marginBottom: 4, padding: '2px 4px' }}>
                      Results
                    </p>
                    {filtered.map(item => (
                      <MoreItem key={item.page} item={item} currentPageName={currentPageName} onSelect={() => setOpen(false)} />
                    ))}
                  </div>
                )
              ) : (
                /* Grouped layout */
                <div className="grid grid-cols-2 gap-x-2">
                  {MORE_GROUPS.map(group => (
                    <div key={group.label} style={{ padding: '4px 8px', marginBottom: 4 }}>
                      <p style={{
                        fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.12em',
                        textTransform: 'uppercase', color: 'rgba(255,90,31,0.6)',
                        padding: '2px 4px', marginBottom: 2,
                      }}>
                        {group.label}
                      </p>
                      {group.items.map(item => (
                        <MoreItem key={item.page} item={item} currentPageName={currentPageName} onSelect={() => setOpen(false)} />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MoreItem({ item, currentPageName, onSelect }) {
  const Icon = item.icon;
  const isActive = currentPageName === item.page;
  return (
    <Link
      to={createPageUrl(item.page)}
      onClick={onSelect}
      role="menuitem"
      className="flex items-center gap-2 rounded-lg transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF5A1F] focus-visible:outline-offset-1"
      style={{
        padding: '5px 8px',
        fontSize: '0.7rem',
        color: isActive ? '#FF8C42' : 'rgba(255,255,255,0.55)',
        background: isActive ? 'rgba(255,90,31,0.1)' : 'transparent',
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon size={11} style={{ flexShrink: 0, color: isActive ? '#FF8C42' : 'rgba(255,255,255,0.3)' }} />
      {item.name}
    </Link>
  );
}

// ── TopNav ───────────────────────────────────────────────────────────────────
export default function TopNav({ currentPageName, currentUser, visibleNavGroups, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* ── Sticky header ── */}
      <header
        role="banner"
        aria-label="Main navigation"
        style={{
          height: 48,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          zIndex: 30,
          background: 'rgba(13,17,23,0.97)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.04), 0 4px 16px rgba(0,0,0,0.4)',
        }}
      >
        {/* ── Logo ── */}
        <Link
          to={createPageUrl('ProjectDashboard')}
          aria-label="SteelBuild Pro — go to dashboard"
          className="flex items-center gap-2 mr-6 flex-shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF5A1F] focus-visible:outline-offset-2 rounded-lg"
          style={{ textDecoration: 'none' }}
        >
          <div
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg, #FF5A1F, #FF8C42)',
              boxShadow: '0 0 14px rgba(255,90,31,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Building size={14} color="#fff" />
          </div>
          <span className="hidden sm:block" style={{
            fontWeight: 800, fontSize: '0.68rem', letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.88)',
          }}>
            SteelBuild Pro
          </span>
        </Link>

        {/* ── Primary Tab Bar (desktop) ── */}
        <nav
          role="navigation"
          aria-label="Primary"
          className="hidden lg:flex items-center gap-0.5 flex-1"
        >
          {PRIMARY_TABS.map(tab => {
            const isActive = currentPageName === tab.page;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.page}
                to={createPageUrl(tab.page)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg transition-all duration-150',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF5A1F] focus-visible:outline-offset-2'
                )}
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  padding: '6px 11px',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.38)',
                  background: isActive
                    ? 'linear-gradient(135deg,rgba(255,90,31,0.18),rgba(255,140,66,0.08))'
                    : 'transparent',
                  border: isActive ? '1px solid rgba(255,90,31,0.2)' : '1px solid transparent',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? '0 0 12px rgba(255,90,31,0.08)' : 'none',
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = 'rgba(255,255,255,0.38)'; e.currentTarget.style.background = 'transparent'; } }}
              >
                <Icon size={11} style={{ flexShrink: 0 }} />
                {tab.name}
              </Link>
            );
          })}

          {/* More dropdown */}
          <MoreDropdown currentPageName={currentPageName} />
        </nav>

        {/* ── Right actions ── */}
        <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">

          {/* All-apps grid (desktop) */}
          <div className="hidden lg:block">
            <AllAppsGrid navGroups={visibleNavGroups} currentPageName={currentPageName} />
          </div>

          {/* Notifications */}
          <NotificationCenter />

          {/* Mobile hamburger */}
          <button
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-panel"
            className="lg:hidden flex items-center justify-center w-8 h-8 rounded-xl transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF5A1F]"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            onClick={() => setMobileOpen(v => !v)}
          >
            {mobileOpen
              ? <X size={15} style={{ color: 'rgba(255,255,255,0.6)' }} />
              : <Menu size={15} style={{ color: 'rgba(255,255,255,0.6)' }} />
            }
          </button>

          {/* User dropdown */}
          {currentUser && (
            <UserMenu user={currentUser} onLogout={onLogout} />
          )}
        </div>
      </header>

      {/* ── Mobile nav panel ── */}
      {mobileOpen && (
        <div
          id="mobile-nav-panel"
          role="navigation"
          aria-label="Mobile navigation"
          style={{
            background: '#0D1117',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            padding: '10px 12px',
          }}
        >
          <div className="grid grid-cols-2 gap-1">
            {[...PRIMARY_TABS, ...MORE_GROUPS[0].items, ...MORE_GROUPS[1].items].slice(0, 16).map(tab => {
              const isActive = currentPageName === tab.page;
              return (
                <Link
                  key={tab.page}
                  to={createPageUrl(tab.page)}
                  onClick={() => setMobileOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                  className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF5A1F]"
                  style={{
                    fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                    padding: '8px 10px', borderRadius: 8, textDecoration: 'none',
                    color: isActive ? '#FF8C42' : 'rgba(255,255,255,0.45)',
                    background: isActive ? 'rgba(255,90,31,0.1)' : 'rgba(255,255,255,0.03)',
                  }}
                >
                  {tab.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

// ── All-apps compact grid ────────────────────────────────────────────────────
function AllAppsGrid({ navGroups, currentPageName }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="All modules"
          className="flex items-center justify-center w-8 h-8 rounded-xl transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF5A1F]"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <LayoutGrid size={14} style={{ color: 'rgba(255,255,255,0.55)' }} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[480px] max-h-[70vh] overflow-y-auto p-3"
        style={{
          background: '#0D1117',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16,
          boxShadow: '0 24px 48px rgba(0,0,0,0.8)',
        }}
      >
        <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', padding: '0 8px 8px' }}>All Modules</p>
        <div className="grid grid-cols-2 gap-1">
          {navGroups.map(group => (
            <div key={group.name} className="mb-2">
              <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,90,31,0.65)', padding: '2px 8px', marginBottom: 2 }}>{group.name}</p>
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = currentPageName === item.page;
                return (
                  <DropdownMenuItem key={item.page} asChild>
                    <Link
                      to={createPageUrl(item.page)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF5A1F]"
                      style={{
                        color: isActive ? '#FF8C42' : 'rgba(255,255,255,0.55)',
                        background: isActive ? 'rgba(255,90,31,0.1)' : 'transparent',
                        textDecoration: 'none',
                      }}
                    >
                      <Icon size={11} />
                      {item.name}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── User menu ────────────────────────────────────────────────────────────────
function UserMenu({ user, onLogout }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={`User menu for ${user.full_name || user.email}`}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF5A1F]"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            background: 'linear-gradient(135deg, #FF5A1F, #FF8C42)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#fff' }}>
              {(user.full_name || user.email || 'U')[0].toUpperCase()}
            </span>
          </div>
          <span className="hidden md:block" style={{
            fontSize: '0.65rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)',
            maxWidth: 88, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {user.full_name || user.email}
          </span>
          <ChevronDown size={10} style={{ color: 'rgba(255,255,255,0.3)' }} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48"
        style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, boxShadow: '0 16px 40px rgba(0,0,0,0.8)' }}
      >
        <div style={{ padding: '10px 12px' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: 2 }}>
            {user.full_name || user.email}
          </p>
          <p style={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,90,31,0.7)' }}>
            {user.role}
          </p>
        </div>
        <DropdownMenuSeparator style={{ background: 'rgba(255,255,255,0.06)' }} />
        <DropdownMenuItem asChild>
          <Link
            to={createPageUrl('Profile')}
            className="flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF5A1F]"
            style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)', padding: '8px 12px', cursor: 'pointer', textDecoration: 'none' }}
          >
            <UserCircle size={13} /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            to={createPageUrl('Settings')}
            className="flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF5A1F]"
            style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)', padding: '8px 12px', cursor: 'pointer', textDecoration: 'none' }}
          >
            <Settings size={13} /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator style={{ background: 'rgba(255,255,255,0.06)' }} />
        <DropdownMenuItem
          onClick={onLogout}
          className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF5A1F]"
          style={{ fontSize: '0.7rem', color: '#FF4D4D', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer' }}
        >
          <LogOut size={13} /> Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}