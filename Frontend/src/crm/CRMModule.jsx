import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Users, Star, Award, ShoppingBag, TrendingUp, Bell, AlertTriangle,
  UserPlus, Receipt, Heart, MessageSquare, LayoutDashboard,
  ChevronRight, ChevronLeft, Pill, Calendar, Eye, ArrowLeft, Search, Plus,
  Edit2, Send, X, Check, CheckCircle, Phone, Mail, MapPin, Hash, Shield, User,
  Activity, Info, Package, Repeat, Download, Clock, CreditCard,
  Smartphone, Banknote, ArrowUp, ArrowDown, RefreshCw, Zap, Link as LinkIcon
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts';
import { fetchCrmCustomers, fetchCustomerSummary, fetchCustomerPurchases, fetchReminders, createReminder, updateReminder } from '../services/crm';
import { fetchSales } from '../services/pos';
import { fetchProducts } from '../services/medicine';
import { ApiError } from '../services/api';
import { fetchNotifications, markNotificationRead } from '../services/notifications';

const SUBMENU_TABS = [
  { key: 'dashboard', label: 'CRM Dashboard', icon: LayoutDashboard },
  { key: 'tiers', label: 'Customer Tiers', icon: Award },
  { key: 'reminders', label: 'Medicine Reminders', icon: Bell },
  { key: 'health', label: 'Health Information', icon: Heart },
  { key: 'receipts', label: 'Receipts', icon: Receipt },
  { key: 'notifications', label: 'Notifications', icon: MessageSquare },
];

const PROFILE_TABS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'purchases', label: 'Purchase History', icon: ShoppingBag },
  { key: 'health', label: 'Health Information', icon: Heart },
  { key: 'reminders', label: 'Medicine Reminders', icon: Bell },
  { key: 'receipts', label: 'Receipts', icon: Receipt },
];

const PAGE_META = {
  dashboard: { title: 'CRM Dashboard', description: 'Customer overview and relationship insights' },
  tiers: { title: 'Customer Tiers', description: 'Loyalty tier structure and benefits' },
  reminders: { title: 'Med. Reminders', description: 'Automated refill reminders' },
  health: { title: 'Health Info', description: 'Customer health notes for safe dispensing' },
  receipts: { title: 'Receipts', description: 'Purchase history and receipts' },
  notifications: { title: 'Notifications', description: 'SMS and notification history' },
};

const initials = (name) => name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'CU';

// ─── Backend Data Mapping Helpers ─────────────────────────────────────────────

const CRM_TIER_MAP = { platinum: 'Platinum', gold: 'Premium', silver: 'Regular', bronze: 'Basic' };
const CRM_TIER_TO_BACKEND = { Basic: 'bronze', Regular: 'silver', Premium: 'gold', Platinum: 'platinum' };

const crmTier = (tier) => CRM_TIER_MAP[tier] || 'Basic';

const calcAge = (dob) => {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
};

const mapCrmCustomer = (c, summary) => ({
  id: `PHC-${String(c.id).padStart(3, '0')}`,
  name: c.name,
  phone: c.phone,
  email: c.email,
  area: c.address || '—',
  tier: crmTier(c.membership_tier),
  purchases: summary ? summary.total_purchases : 0,
  spending: summary ? Number(summary.total_spending || 0) : 0,
  lastPurchase: summary && summary.recent_purchases && summary.recent_purchases.length
    ? (summary.recent_purchases[0].sale_date || summary.recent_purchases[0].created_at || 'Recently')
    : 'Never',
  lastPurchaseDays: null,
  joinDate: c.member_since ? c.member_since.slice(0, 7) : '—',
  status: summary && summary.total_purchases > 0 ? 'Active' : 'Inactive',
  bloodType: '—',
  allergies: [],
  notes: c.notes || '',
  dob: c.date_of_birth || '—',
  age: calcAge(c.date_of_birth),
  gender: '—',
  occupation: '—',
  nid: '—',
  referredBy: '—',
  createdAt: c.created_at,
  frequentlyBought: summary && summary.frequently_purchased_products && summary.frequently_purchased_products.length
    ? summary.frequently_purchased_products[0].product_name
    : null,
});

const mapPurchase = (s) => ({
  id: s.invoice_number || `#${s.id}`,
  date: (s.sale_date || s.created_at || '').slice(0, 10),
  time: (s.created_at || '').slice(11, 16),
  items: Array.isArray(s.items) ? s.items.length : 0,
  qty: Array.isArray(s.items) ? s.items.reduce((sum, i) => sum + Number(i.quantity || 0), 0) : 0,
  amount: Number(s.payable_amount || s.total_amount || 0),
  method: PAYMENT_DISPLAY[s.payment_method] || 'Cash',
  status: 'Paid',
  products: Array.isArray(s.items) ? s.items.map((i) => `${i.product?.name || i.product_name || 'Item'} ×${i.quantity}`) : [],
});

const mapCrmReminder = (r) => ({
  id: `RMD-${r.id}`,
  customerId: r.customer && r.customer.id ? `PHC-${String(r.customer.id).padStart(3, '0')}` : null,
  customer: (r.customer && r.customer.name) || '—',
  tier: (r.customer && crmTier(r.customer.membership_tier)) || 'Regular',
  medicine: (r.product && r.product.name) || r.title || '—',
  dose: '—',
  frequency: r.reminder_time ? `Reminder ${r.reminder_time}` : '—',
  startDate: r.created_at ? r.created_at.slice(0, 10) : '—',
  endDate: 'Ongoing',
  nextReminder: r.reminder_time || '—',
  daysLeft: r.is_active ? 3 : null,
  status: r.is_active ? 'Active' : 'Completed',
});

const PAYMENT_DISPLAY = { cash: 'Cash', card: 'Card', bkash: 'MFS', nagad: 'MFS' };

const mapSaleReceipt = (s) => ({
  id: s.invoice_number || `#${s.id}`,
  customerId: s.customer && (s.customer.id || s.customer) ? `PHC-${String(s.customer.id || s.customer).padStart(3, '0')}` : null,
  customer: (s.customer && s.customer.name) || s.customer_name || '—',
  date: (s.sale_date || s.created_at || '').slice(0, 10),
  items: Array.isArray(s.items) ? s.items.length : 0,
  amount: Number(s.payable_amount || s.total_amount || 0),
  payment: PAYMENT_DISPLAY[s.payment_method] || 'Cash',
  tier: 'Basic',
  method: PAYMENT_DISPLAY[s.payment_method] || 'Cash',
  status: 'Paid',
});

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const salesByMonth = (sales) => {
  const buckets = {};
  sales.forEach((s) => {
    const d = s.sale_date || s.created_at;
    const month = d ? `${d.slice(0, 4)}-${d.slice(5, 7)}` : null;
    if (!month) return;
    buckets[month] = buckets[month] || { count: 0, spend: 0 };
    buckets[month].count += 1;
    buckets[month].spend += Number(s.payable_amount || s.total_amount || 0);
  });
  const months = Object.keys(buckets).sort().slice(-6);
  return months.map((m) => ({
    month: MONTH_LABELS[Number(m.slice(5)) - 1],
    purchases: buckets[m].count,
    spend: buckets[m].spend,
  }));
};

// ─── UI Helper Badges ─────────────────────────────────────────────────────────

const TierPill = ({ tier }) => {
  const isPrem = tier === 'Premium';
  const isReg = tier === 'Regular';
  const isPlat = tier === 'Platinum';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[12px] font-semibold border ${
        isPrem
          ? 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]'
          : isReg
          ? 'bg-[#E6FBF9] text-[#0EA5A4] border-[#99E9E4]'
          : isPlat
          ? 'bg-purple-50 text-purple-700 border-purple-200'
          : 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]'
      }`}
    >
      {tier}
    </span>
  );
};

const StatusPill = ({ status }) => {
  const isActive = status === 'Active' || status === 'Paid' || status === 'Managed';
  const isAtRisk = status === 'At Risk' || status === 'Ending Soon' || status === 'Pending';
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[12px] font-medium border ${
        isActive
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : isAtRisk
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : 'bg-slate-100 text-slate-500 border-slate-200'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          isActive ? 'bg-emerald-500' : isAtRisk ? 'bg-amber-500' : 'bg-slate-400'
        }`}
      />
      {status}
    </span>
  );
};

const PaymentMethodBadge = ({ method }) => {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] px-2 py-0.5 rounded-md bg-[#F9FAFB] text-slate-700 border border-slate-200">
      {method === 'Card' ? (
        <CreditCard size={11} className="shrink-0 text-slate-500" />
      ) : method === 'MFS' ? (
        <Smartphone size={11} className="shrink-0 text-slate-500" />
      ) : (
        <Banknote size={11} className="shrink-0 text-slate-500" />
      )}
      <span>{method}</span>
    </span>
  );
};

const WhatsAppIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const Avatar = ({ name, tier, size = 'sm' }) => {
  const isPrem = tier === 'Premium';
  const isReg = tier === 'Regular';
  const isPlat = tier === 'Platinum';
  const bg = isPrem ? 'bg-[#D97706]' : isReg ? 'bg-[#0EA5A4]' : isPlat ? 'bg-purple-600' : 'bg-[#64748B]';
  const dim = size === 'lg' ? 'w-14 h-14 rounded-2xl text-lg' : 'w-7 h-7 rounded-full text-[11px]';
  return (
    <div className={`${dim} flex items-center justify-center font-bold shrink-0 text-white ${bg}`}>
      {initials(name)}
    </div>
  );
};

// ─── Custom Interactive Chart Tooltips ────────────────────────────────────────

const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    const color = item.payload?.color || '#D97706';
    return (
      <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-md text-xs font-semibold select-none" style={{ color }}>
        {item.name} : {item.value} customers
      </div>
    );
  }
  return null;
};

const CustomBarTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="bg-white px-3.5 py-2 rounded-lg border border-slate-200 shadow-md flex flex-col gap-0.5 min-w-[105px] select-none">
        <span className="text-xs font-semibold text-slate-800">{label}</span>
        <span className="text-xs font-medium text-blue-600">
          purchases : <span className="font-semibold">{item.value}</span>
        </span>
      </div>
    );
  }
  return null;
};

// ─── 1. CRM Dashboard View ────────────────────────────────────────────────────

function CRMDashboardView({ onNavigateTab, onNavigate, onViewProfile, customers = [], reminders = [], receipts = [] }) {
  const totalCustomers = customers.length;
  const basicCount = customers.filter((c) => c.tier === 'Basic').length;
  const regularCount = customers.filter((c) => c.tier === 'Regular').length;
  const premiumCount = customers.filter((c) => c.tier === 'Premium').length;
  const totalSpend = customers.reduce((sum, c) => sum + c.spending, 0);
  const totalPurchases = customers.reduce((sum, c) => sum + c.purchases, 0);
  const activeReminders = reminders.filter((r) => r.status === 'Active').length;
  const needAttention = customers.filter((c) => c.status !== 'Active').length;

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const newThisWeek = customers.filter((c) => c.createdAt && c.createdAt.slice(0, 10) >= weekAgo).length;

  const tierData = [
    { name: 'Premium', customers: premiumCount, spend: customers.filter(c => c.tier === 'Premium').reduce((s, c) => s + c.spending, 0), color: '#D97706', light: '#FFFBEB' },
    { name: 'Regular', customers: regularCount, spend: customers.filter(c => c.tier === 'Regular').reduce((s, c) => s + c.spending, 0), color: '#0EA5A4', light: '#E6FBF9' },
    { name: 'Basic', customers: basicCount, spend: customers.filter(c => c.tier === 'Basic').reduce((s, c) => s + c.spending, 0), color: '#475569', light: '#F8FAFC' },
  ].filter((t) => t.customers > 0);

  const monthData = salesByMonth(receipts);

  const topCustomers = [...customers].sort((a, b) => b.spending - a.spending).slice(0, 4);

  const recentReceipts = [...receipts].slice(0, 4).map((r) => ({
    id: r.id,
    customer: r.customer,
    items: r.items,
    amount: r.amount,
    payment: r.payment,
    time: r.date,
  }));

  const upcoming = reminders
    .filter((r) => r.status === 'Active')
    .sort((a, b) => (a.daysLeft ?? 99) - (b.daysLeft ?? 99))
    .slice(0, 4)
    .map((r) => ({ customer: r.customer, medicine: r.medicine, date: r.nextReminder || '—', daysLeft: r.daysLeft ?? 1, tier: r.tier }));

  const kpiCards = [
    { label: 'Total Customers', value: String(totalCustomers), sub: `+${newThisWeek} this week`, icon: Users, iconBg: 'bg-blue-50', iconColor: 'text-[#0EA5A4]', isGreen: true },
    { label: 'Basic Tier', value: String(basicCount), sub: totalCustomers ? `${Math.round((basicCount / totalCustomers) * 100)}% of total` : '0% of total', icon: Star, iconBg: 'bg-slate-100', iconColor: 'text-slate-400', isGreen: false },
    { label: 'Regular Tier', value: String(regularCount), sub: totalCustomers ? `${Math.round((regularCount / totalCustomers) * 100)}% of total` : '0% of total', icon: Star, iconBg: 'bg-blue-50', iconColor: 'text-[#0EA5A4]', isGreen: false },
    { label: 'Premium Tier', value: String(premiumCount), sub: totalCustomers ? `${Math.round((premiumCount / totalCustomers) * 100)}% of total` : '0% of total', icon: Award, iconBg: 'bg-amber-50', iconColor: 'text-amber-500', isGreen: false },
    { label: 'Med. Purchases', value: String(totalPurchases), sub: `৳${totalSpend.toLocaleString()} total`, icon: ShoppingBag, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', isGreen: true },
    { label: 'Customer Spend', value: `৳${totalSpend >= 100000 ? `${(totalSpend / 1000).toFixed(0)}k` : totalSpend.toLocaleString()}`, sub: `৳${totalSpend.toLocaleString()} total`, icon: TrendingUp, iconBg: 'bg-violet-50', iconColor: 'text-violet-500', isGreen: true },
    { label: 'Active Reminders', value: String(activeReminders), sub: `${reminders.filter((r) => r.daysLeft !== null && r.daysLeft <= 1).length} due soon`, icon: Bell, iconBg: 'bg-orange-50', iconColor: 'text-orange-400', isGreen: false },
    { label: 'Need Attention', value: String(needAttention), sub: 'Inactive or at risk', icon: AlertTriangle, iconBg: 'bg-red-50', iconColor: 'text-red-400', isGreen: false },
  ];

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
        {kpiCards.map((k) => (
          <div key={k.label} className="bg-white border border-[#E5E7EB] rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[12px] font-medium text-slate-500 leading-tight">{k.label}</span>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${k.iconBg}`}>
                <k.icon size={14} className={k.iconColor} />
              </div>
            </div>
            <div className="text-xl font-bold text-slate-800 tracking-tight mt-1.5 mb-1">{k.value}</div>
            <div className={`text-[12px] font-medium leading-none ${k.isGreen ? 'text-emerald-600' : 'text-slate-400'}`}>
              {k.sub}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Left Column */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-2xs flex flex-col">
            <div className="text-sm font-semibold text-slate-800 mb-3">Customer Tiers</div>
            <div className="flex items-center justify-between gap-2">
              <div className="shrink-0" style={{ width: 110, height: 110 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={tierData} dataKey="customers" cx="50%" cy="50%" innerRadius={32} outerRadius={50} paddingAngle={3} startAngle={90} endAngle={-270}>
                      {tierData.map(t => <Cell key={t.name} fill={t.color} />)}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2.5 flex-1 pr-2">
                {tierData.map(t => (
                  <div key={t.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                      <span className="text-slate-600 font-medium">{t.name}</span>
                    </span>
                    <span className="font-semibold text-slate-800">{t.customers}</span>
                  </div>
                ))}
              </div>
            </div>
<div className="mt-3.5 pt-3 border-t border-slate-100">
                <div className="text-[12px] font-medium text-slate-500 mb-2">Avg. Spend / Customer</div>
                {(() => {
                  const maxAvg = Math.max(1, ...tierData.map(t => t.customers ? t.spend / t.customers : 0));
                  return tierData.map(t => {
                    const avg = t.customers ? Math.round(t.spend / t.customers) : 0;
                    return (
                      <div key={t.name} className="flex items-center gap-2 mb-2">
                        <span className="text-[11px] font-medium w-14 text-slate-500 shrink-0">{t.name}</span>
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.round((avg / maxAvg) * 100)}%`, backgroundColor: t.color }} />
                        </div>
                        <span className="text-[11px] w-12 text-right text-slate-700 font-medium">৳{avg.toLocaleString()}</span>
                      </div>
                    );
                  });
                })()}
              </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-2xs flex flex-col">
            <div className="text-sm font-semibold text-slate-800 mb-2">Monthly Purchases</div>
            <div className="w-full" style={{ height: 165 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthData} margin={{ top: 10, right: 8, left: -22, bottom: 0 }} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(203, 213, 225, 0.4)', radius: 3 }} />
                  <Bar dataKey="purchases" radius={[3, 3, 0, 0]}>
                    {monthData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === monthData.length - 1 ? '#0EA5A4' : '#99E9E4'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Center Column */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
          <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-2xs overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-800">Recent Customers</div>
              <button onClick={() => onNavigate('customers')} className="text-xs text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1 cursor-pointer">
                View all <ChevronRight size={13} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="px-4 py-2">Customer</th>
                    <th className="px-3 py-2">Tier</th>
                    <th className="px-3 py-2 text-right">Spending</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-2 py-2 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {topCustomers.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <Avatar name={c.name} tier={c.tier} />
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-slate-800 truncate">{c.name}</div>
                            <div className="text-[11px] text-slate-400">{c.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5"><TierPill tier={c.tier} /></td>
                      <td className="px-3 py-2.5 text-right font-semibold text-slate-800 whitespace-nowrap">৳{c.spending.toLocaleString()}</td>
                      <td className="px-3 py-2.5"><StatusPill status={c.status} /></td>
                      <td className="px-2 py-2.5 text-center">
                        <button onClick={() => onViewProfile ? onViewProfile(c.id) : onNavigate('customers')} className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors mx-auto opacity-0 group-hover:opacity-100 cursor-pointer">
                          <Eye size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-2xs overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-800">Recent Purchases</div>
              <button onClick={() => onNavigateTab('receipts')} className="text-xs text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1 cursor-pointer">
                View all <ChevronRight size={13} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="px-4 py-2">Receipt</th>
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-2 py-2 text-center">Items</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-2 py-2">Payment</th>
                    <th className="px-3 py-2 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {recentReceipts.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-[11px] text-blue-600 font-semibold">{r.id}</td>
                      <td className="px-3 py-2.5 font-medium text-slate-800">{r.customer}</td>
                      <td className="px-2 py-2.5 text-center text-slate-500">{r.items}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-slate-800">৳{r.amount.toLocaleString()}</td>
                      <td className="px-2 py-2.5">
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">{r.payment}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-[11px] text-slate-400 whitespace-nowrap">{r.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
          <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-2xs overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-800">Upcoming Reminders</div>
              <button onClick={() => onNavigateTab('reminders')} className="text-xs text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1 cursor-pointer">
                All <ChevronRight size={13} />
              </button>
            </div>
            <div className="p-3 flex flex-col gap-2">
              {upcoming.map((r, i) => {
                const isEndingSoon = r.daysLeft === 1;
                return (
                  <div key={i} className={`rounded-lg border p-2.5 flex flex-col gap-1.5 transition-colors ${isEndingSoon ? 'bg-amber-50/70 border-amber-200' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-slate-800 truncate text-[12px]">{r.customer}</span>
                      <span className={`shrink-0 text-[11px] font-bold px-1.5 py-0.5 rounded ${isEndingSoon ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {isEndingSoon ? 'Ending Soon' : 'Active'}
                      </span>
                    </div>
                    <div className="text-slate-500 truncate text-[11px] flex items-center gap-1">
                      <Pill size={10} className="shrink-0 text-slate-400" />
                      {r.medicine}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar size={10} />
                      <span>Next: <span className="font-medium text-slate-600">{r.date}</span></span>
                      <span className={`ml-auto font-semibold ${isEndingSoon ? 'text-amber-600' : 'text-slate-500'}`}>{r.daysLeft}d</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-2xs flex flex-col">
            <div className="text-sm font-semibold text-slate-800 mb-3">Quick Actions</div>
            <div className="flex flex-col gap-2">
              <button onClick={() => onNavigate('customers')} className="w-full h-9 rounded-lg flex items-center justify-center gap-2 px-3 text-xs font-medium bg-[#0EA5A4] text-white hover:bg-[#0C8F8E] shadow-2xs transition-colors cursor-pointer">
                <UserPlus size={14} />
                <span>Add Customer</span>
              </button>
              <button onClick={() => onNavigateTab('reminders')} className="w-full h-9 rounded-lg flex items-center gap-2.5 px-3.5 text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
                <Bell size={14} className="text-slate-400" />
                <span>Add Reminder</span>
              </button>
              <button onClick={() => onNavigate('customers')} className="w-full h-9 rounded-lg flex items-center gap-2.5 px-3.5 text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
                <Users size={14} className="text-slate-400" />
                <span>View Customers</span>
              </button>
              <button onClick={() => onNavigateTab('receipts')} className="w-full h-9 rounded-lg flex items-center gap-2.5 px-3.5 text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
                <Receipt size={14} className="text-slate-400" />
                <span>Receipts</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 2. Customer Tiers View (Matching Screenshot 1 & 2) ────────────────────────

function CustomerTiersView({ customers, onSelectCustomer }) {
  const [selectedTier, setSelectedTier] = useState('All');

  const tiers = [
    {
      key: 'Basic',
      label: 'Basic',
      desc: 'Entry-level customers',
      minSpend: '৳0 – ৳19,999',
      color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0', statBoxBg: 'bg-slate-100',
      selectedBorder: 'border-slate-400 ring-2 ring-slate-400/20',
      accentBar: 'bg-slate-400',
      perks: ['Purchase history', 'Refill reminders', 'Basic support'],
      customers: customers.filter(c => c.tier === 'Basic'),
    },
    {
      key: 'Regular',
      label: 'Regular',
      desc: 'Consistent repeat customers',
      minSpend: '৳20,000 – ৳49,999',
      color: '#0EA5A4', bg: '#E6FBF9', border: '#99E9E4', statBoxBg: 'bg-blue-50',
      selectedBorder: 'border-blue-500 ring-2 ring-blue-500/20',
      accentBar: 'bg-blue-600',
      perks: ['5% discount on medicines', 'Priority reminders', 'Monthly report'],
      customers: customers.filter(c => c.tier === 'Regular'),
    },
    {
      key: 'Premium',
      label: 'Premium',
      desc: 'High-value loyal customers',
      minSpend: '৳50,000+',
      color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', statBoxBg: 'bg-amber-50',
      selectedBorder: 'border-amber-500 ring-2 ring-amber-500/20',
      accentBar: 'bg-amber-500',
      perks: ['10% off all products', 'Free delivery', 'Birthday discount', 'Dedicated support'],
      customers: customers.filter(c => c.tier === 'Premium'),
    },
  ];

  const tierBarData = tiers.map(t => ({
    name: t.label,
    customers: t.customers.length,
    purchases: t.customers.reduce((s, c) => s + c.purchases, 0),
    spend: t.customers.reduce((s, c) => s + c.spending, 0),
    color: t.color,
  }));

  const visibleCustomers = selectedTier === 'All'
    ? customers.filter(c => ['Basic', 'Regular', 'Premium'].includes(c.tier))
    : customers.filter(c => c.tier === selectedTier);

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* 3 Tier Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers.map((t) => {
          const purchases = t.customers.reduce((s, c) => s + c.purchases, 0);
          const spending = t.customers.reduce((s, c) => s + c.spending, 0);
          const active = t.customers.filter((c) => c.status === 'Active').length;
          const isSelected = selectedTier === t.key;
          return (
            <div
              key={t.key}
              onClick={() => setSelectedTier(isSelected ? 'All' : t.key)}
              className={`bg-white border rounded-xl shadow-2xs overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                isSelected ? t.selectedBorder : 'border-slate-200'
              }`}
            >
              <div className={`h-1 w-full ${t.accentBar}`} />
              <div className="p-5">
                {/* Top header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold text-slate-900">{t.label}</span>
                      <span
                        className="text-[11px] px-1.5 py-0.5 rounded font-medium border"
                        style={{ color: t.color, background: t.bg, borderColor: t.border }}
                      >
                        {t.minSpend}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{t.desc}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-slate-900 leading-tight">{t.customers.length}</div>
                    <div className="text-[11px] text-slate-400">customers</div>
                  </div>
                </div>

                {/* 3 Mini Stat Boxes */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className={`rounded-lg p-2.5 text-center ${t.statBoxBg}`}>
                    <div className="text-sm font-bold text-slate-900">{purchases}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Purchases</div>
                  </div>
                  <div className={`rounded-lg p-2.5 text-center ${t.statBoxBg}`}>
                    <div className="text-sm font-bold text-slate-900">৳{(spending / 1000).toFixed(0)}k</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Spending</div>
                  </div>
                  <div className={`rounded-lg p-2.5 text-center ${t.statBoxBg}`}>
                    <div className="text-sm font-bold text-slate-900">{active}/{t.customers.length}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Active</div>
                  </div>
                </div>

                {/* Perks Checklist */}
                <div className="flex flex-col gap-1.5 pt-3 border-t border-slate-100">
                  {t.perks.map((p) => (
                    <div key={p} className="flex items-center gap-1.5 text-xs text-slate-700">
                      <CheckCircle size={12} style={{ color: t.color }} className="shrink-0" />
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart + Table Row */}
      <div className="grid grid-cols-12 gap-4 items-start">
        {/* Left: Distribution Chart */}
        <div className="col-span-12 lg:col-span-4 bg-white border border-slate-200 rounded-xl shadow-2xs p-5 flex flex-col gap-4 self-start">
          <div>
            <div className="text-sm font-semibold text-slate-900 mb-0.5">Tier Distribution</div>
            <p className="text-xs text-slate-400 mb-3">Customers · Purchases · Spend</p>
            <div className="w-full" style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tierBarData} margin={{ top: 0, right: 0, left: -22, bottom: 0 }} barGap={3}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} ticks={[0, 40, 80, 120, 160]} />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                  <Bar dataKey="customers" name="Customers" radius={[3, 3, 0, 0]} barSize={16}>
                    {tierBarData.map(d => <Cell key={d.name} fill={d.color} />)}
                  </Bar>
                  <Bar dataKey="purchases" name="Purchases" radius={[3, 3, 0, 0]} barSize={16} fill="#99E9E4" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Spend Legend */}
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            {tierBarData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-slate-600 font-medium">{d.name}</span>
                </span>
                <span className="font-semibold text-slate-900">৳{d.spend.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Customers Table */}
        <div className="col-span-12 lg:col-span-8 bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">Customers</span>
              <span className="text-xs text-slate-400">
                {selectedTier === 'All' ? 'All tiers' : selectedTier} · {visibleCustomers.length} records
              </span>
            </div>
            <div className="flex items-center gap-1 bg-slate-100/70 border border-slate-200/80 rounded-lg p-0.5">
              {['All', 'Basic', 'Regular', 'Premium'].map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTier(t)}
                  className={`px-3 h-7 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    selectedTier === t ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3">CUSTOMER</th>
                  <th className="px-4 py-3">TIER</th>
                  <th className="px-4 py-3 text-right">PURCHASES</th>
                  <th className="px-4 py-3 text-right">SPENDING</th>
                  <th className="px-4 py-3">LAST PURCHASE</th>
                  <th className="px-4 py-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {visibleCustomers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => onSelectCustomer && onSelectCustomer(c.id)}
                    className="hover:bg-slate-50/60 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.name} tier={c.tier} />
                        <div>
                          <div className="text-xs font-medium text-slate-900 group-hover:text-blue-600 transition-colors">{c.name}</div>
                          <div className="text-[11px] text-slate-400">{c.area}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><TierPill tier={c.tier} /></td>
                    <td className="px-4 py-3 text-right text-slate-700 font-medium">{c.purchases}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">৳{c.spending.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-600 font-normal whitespace-nowrap">{c.lastPurchase}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusPill status={c.status} /></td>
                  </tr>
                ))}
                {visibleCustomers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-xs text-slate-400">
                      No customers found in this tier.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 3. Medicine Reminders View ───────────────────────────────────────────────

function MedicineRemindersView({ reminders: initialReminders = [], customers = [] }) {
  const [reminders, setReminders] = useState(initialReminders);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [tierFilter, setTierFilter] = useState('All');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    setReminders(initialReminders);
  }, [initialReminders]);

  const [addForm, setAddForm] = useState({
    customer: '', medicine: '', dose: '', frequency: '', startDate: 'Aug 17, 2026', endDate: 'Ongoing'
  });

  const [editForm, setEditForm] = useState({
    medicine: '', dose: '', frequency: '', startDate: '', endDate: ''
  });

  const filteredReminders = useMemo(() => {
    return reminders.filter((r) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        r.customer.toLowerCase().includes(q) ||
        r.medicine.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'All' || r.status === statusFilter;
      const matchTier = tierFilter === 'All' || r.tier === tierFilter;
      return matchSearch && matchStatus && matchTier;
    });
  }, [reminders, search, statusFilter, tierFilter]);

  const counts = useMemo(() => ({
    active: reminders.filter((r) => r.status === 'Active').length,
    endingSoon: reminders.filter((r) => r.status === 'Ending Soon').length,
    completed: reminders.filter((r) => r.status === 'Completed').length,
  }), [reminders]);

  const handleOpenEdit = (reminder) => {
    setEditingReminder(reminder);
    setEditForm({
      medicine: reminder.medicine, dose: reminder.dose, frequency: reminder.frequency,
      startDate: reminder.startDate, endDate: reminder.endDate
    });
  };

  const handleSaveEdit = async (e) => {
    e?.preventDefault();
    if (!editingReminder) return;
    setSaving(true);
    setFormError('');
    try {
      await updateReminder(Number(editingReminder.id.replace('RMD-', '')), { title: editForm.medicine });
      setReminders(prev => prev.map(r => r.id === editingReminder.id ? { ...r, ...editForm } : r));
      setEditingReminder(null);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Unable to update the reminder.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAdd = async (e) => {
    e?.preventDefault();
    setFormError('');
    if (!addForm.customer || !addForm.medicine) return;
    const cust = customers.find((c) => c.name.toLowerCase() === addForm.customer.trim().toLowerCase());
    if (!cust) {
      setFormError('Customer not found. Use the exact name from the Customers tab.');
      return;
    }
    let product = null;
    try {
      const matches = await fetchProducts({ search: addForm.medicine.trim() });
      product = matches && matches[0];
    } catch { /* ignore search failure */ }
    if (!product) {
      setFormError('Medicine not found in inventory. Add it in the POS module first.');
      return;
    }
    setSaving(true);
    try {
      await createReminder({
        customer: Number(cust.id.replace('PHC-', '')),
        product: product.id,
        title: `${addForm.medicine} — refill reminder`,
        reminder_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
      });
      const newRecord = {
        id: `RMD-${Date.now()}`,
        customerId: cust.id,
        customer: addForm.customer,
        tier: cust.tier,
        medicine: addForm.medicine,
        dose: addForm.dose || '—',
        frequency: addForm.frequency || 'Once daily',
        startDate: addForm.startDate || '—',
        endDate: addForm.endDate || 'Ongoing',
        nextReminder: addForm.startDate || '—',
        daysLeft: 7,
        status: 'Active'
      };
      setReminders([newRecord, ...reminders]);
      setIsAddOpen(false);
      setAddForm({ customer: '', medicine: '', dose: '', frequency: '', startDate: 'Aug 17, 2026', endDate: 'Ongoing' });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Unable to save the reminder.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-1.5 h-9 rounded-full bg-emerald-500 shrink-0" />
          <div>
            <div className="text-2xl font-bold text-emerald-600 tracking-tight leading-none">{counts.active}</div>
            <div className="text-xs text-slate-500 font-normal mt-1">Active reminders</div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-1.5 h-9 rounded-full bg-amber-500 shrink-0" />
          <div>
            <div className="text-2xl font-bold text-amber-600 tracking-tight leading-none">{counts.endingSoon}</div>
            <div className="text-xs text-slate-500 font-normal mt-1">Ending Soon reminders</div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-1.5 h-9 rounded-full bg-slate-300 shrink-0" />
          <div>
            <div className="text-2xl font-bold text-slate-500 tracking-tight leading-none">{counts.completed}</div>
            <div className="text-xs text-slate-500 font-normal mt-1">Completed reminders</div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer or medicine..."
            className="w-[230px] h-9 pl-9 pr-3 text-xs bg-white border border-slate-200 rounded-lg placeholder-slate-400 text-slate-800 focus:outline-none focus:border-blue-600 transition-colors"
          />
        </div>
        <div className="bg-slate-100/70 border border-slate-200/80 rounded-lg p-0.5 flex items-center gap-0.5 h-9">
          {['All', 'Active', 'Ending Soon', 'Completed'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 h-7 text-xs rounded-md transition-colors whitespace-nowrap cursor-pointer ${statusFilter === s ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800 font-medium'}`}>{s}</button>
          ))}
        </div>
        <div className="bg-slate-100/70 border border-slate-200/80 rounded-lg p-0.5 flex items-center gap-0.5 h-9">
          {['All', 'Platinum', 'Premium', 'Regular', 'Basic'].map((t) => (
            <button key={t} onClick={() => setTierFilter(t)} className={`px-2.5 h-7 text-xs rounded-md transition-colors whitespace-nowrap cursor-pointer ${tierFilter === t ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800 font-medium'}`}>{t}</button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-slate-400 font-normal">{filteredReminders.length} {filteredReminders.length === 1 ? 'record' : 'records'}</span>
          <button onClick={() => setIsAddOpen(true)} className="h-9 px-3.5 rounded-lg bg-[#0EA5A4] hover:bg-[#0C8F8E] text-white text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer">
            <Plus size={14} /><span>Add Reminder</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-3">CUSTOMER</th>
                <th className="px-4 py-3">MEDICINE</th>
                <th className="px-3 py-3">DOSE</th>
                <th className="px-3 py-3">FREQUENCY</th>
                <th className="px-4 py-3">START DATE</th>
                <th className="px-4 py-3">END DATE</th>
                <th className="px-4 py-3">NEXT REMINDER</th>
                <th className="px-4 py-3">STATUS</th>
                <th className="px-3 py-3 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {filteredReminders.map((r) => {
                const urgentDays = r.daysLeft !== null && r.daysLeft <= 3 && r.status === 'Active';
                return (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={r.customer} tier={r.tier} />
                        <div>
                          <div className="text-xs font-medium text-slate-800">{r.customer}</div>
                          <div className="mt-0.5"><TierPill tier={r.tier} /></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><Pill size={11} /></div>
                        <span className="text-xs font-medium text-slate-800">{r.medicine}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-600 font-normal">{r.dose}</td>
                    <td className="px-3 py-3 text-slate-600 font-normal whitespace-nowrap">{r.frequency}</td>
                    <td className="px-4 py-3 text-slate-500 font-normal whitespace-nowrap">{r.startDate}</td>
                    <td className="px-4 py-3 text-slate-500 font-normal whitespace-nowrap">{r.endDate}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.nextReminder !== '—' ? (
                        <div>
                          <div className="text-xs font-medium text-slate-800">{r.nextReminder}</div>
                          {r.daysLeft !== null && (
                            <div className={`text-[11px] font-medium mt-0.5 ${urgentDays ? 'text-red-500' : r.daysLeft <= 7 ? 'text-amber-600' : 'text-slate-400'}`}>
                              {r.daysLeft <= 0 ? 'Overdue' : `${r.daysLeft}d left`}
                            </div>
                          )}
                        </div>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusPill status={r.status} /></td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button title="Edit Reminder" onClick={() => handleOpenEdit(r)} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer">
                          <Edit2 size={13} />
                        </button>
                        <button title="Send Notification" onClick={() => {}} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
                          <Send size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredReminders.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-xs text-slate-400">No medicine reminders match your search and filter criteria.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px]" onClick={() => setIsAddOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[500px] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm">Add Medicine Reminder</h3>
              <button onClick={() => setIsAddOpen(false)} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"><X size={15} /></button>
            </div>
            <form onSubmit={handleSaveAdd}>
              {formError && (
                <div className="px-6 pt-4">
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                    <AlertTriangle size={13} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                </div>
              )}
              <div className="p-6 flex flex-col gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Customer</label>
                  <input type="text" required value={addForm.customer} onChange={e => setAddForm({ ...addForm, customer: e.target.value })} placeholder="Search customer name..." className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Medicine Name</label>
                  <input type="text" required value={addForm.medicine} onChange={e => setAddForm({ ...addForm, medicine: e.target.value })} placeholder="e.g. Metformin 500mg" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 bg-white" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Dose</label>
                    <input type="text" value={addForm.dose} onChange={e => setAddForm({ ...addForm, dose: e.target.value })} placeholder="e.g. 500mg" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Frequency</label>
                    <input type="text" value={addForm.frequency} onChange={e => setAddForm({ ...addForm, frequency: e.target.value })} placeholder="e.g. Twice daily" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 bg-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
                    <input type="text" value={addForm.startDate} onChange={e => setAddForm({ ...addForm, startDate: e.target.value })} placeholder="Aug 17, 2026" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">End Date</label>
                    <input type="text" value={addForm.endDate} onChange={e => setAddForm({ ...addForm, endDate: e.target.value })} placeholder="Ongoing or specific date" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 bg-white" />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
                <button type="button" onClick={() => setIsAddOpen(false)} className="h-9 px-4 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">Cancel</button>
                <button type="submit" disabled={saving} className="h-9 px-4 rounded-lg bg-[#0EA5A4] text-white text-xs font-medium hover:bg-[#0C8F8E] shadow-2xs transition-colors cursor-pointer disabled:opacity-60">{saving ? 'Saving...' : 'Save Reminder'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px]" onClick={() => setEditingReminder(null)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[500px] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-slate-800 text-sm">Edit Reminder</h3>
                <span className="text-slate-400 font-mono text-xs font-normal">{editingReminder.id}</span>
              </div>
              <button onClick={() => setEditingReminder(null)} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"><X size={15} /></button>
            </div>
            <form onSubmit={handleSaveEdit}>
              {formError && (
                <div className="px-6 pt-4">
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                    <AlertTriangle size={13} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                </div>
              )}
              <div className="p-6 flex flex-col gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Medicine Name</label>
                  <input type="text" required value={editForm.medicine} onChange={e => setEditForm({ ...editForm, medicine: e.target.value })} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 bg-white" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Dose</label>
                    <input type="text" value={editForm.dose} onChange={e => setEditForm({ ...editForm, dose: e.target.value })} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Frequency</label>
                    <input type="text" value={editForm.frequency} onChange={e => setEditForm({ ...editForm, frequency: e.target.value })} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 bg-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
                    <input type="text" value={editForm.startDate} onChange={e => setEditForm({ ...editForm, startDate: e.target.value })} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">End Date</label>
                    <input type="text" value={editForm.endDate} onChange={e => setEditForm({ ...editForm, endDate: e.target.value })} className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 bg-white" />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
                <button type="button" onClick={() => setEditingReminder(null)} className="h-9 px-4 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">Cancel</button>
                <button type="submit" disabled={saving} className="h-9 px-4 rounded-lg bg-[#0EA5A4] text-white text-xs font-medium hover:bg-[#0C8F8E] shadow-2xs transition-colors cursor-pointer disabled:opacity-60">{saving ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 4. Health Information View (Matching Screenshot 3) ───────────────────────

function HealthInformationView({ customers = [], onSelectCustomer }) {
  const [search, setSearch] = useState('');

  const records = useMemo(() =>
    (customers || []).map((c) => ({
      customerId: c.id,
      customer: c.name,
      tier: c.tier,
      status: c.status,
      medicines: c.frequentlyBought || '—',
      notes: c.notes || '—',
      lastPurchase: c.lastPurchase || 'Never',
    })),
    [customers]
  );

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      return !q || r.customer.toLowerCase().includes(q) || r.customerId.toLowerCase().includes(q);
    });
  }, [records, search]);

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Disclaimer Banner */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-blue-50/70 border border-blue-200 shadow-2xs">
        <Shield size={15} className="text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-900 leading-relaxed">
          <strong className="font-semibold text-blue-950">Customer health notes.</strong> Information shown here is
          drawn from each customer's real profile and purchase history to support safe and accurate medicine
          dispensing. It is not a medical record and does not constitute diagnosis, prescription, or medical
          recommendation.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or ID..."
            className="w-[230px] h-9 pl-9 pr-3 text-xs bg-white border border-slate-200 rounded-lg placeholder-slate-400 text-slate-800 focus:outline-none focus:border-blue-600 transition-colors"
          />
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <span className="text-xs text-slate-400 font-normal">{filteredRecords.length} records</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-3">CUSTOMER</th>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">TIER</th>
                <th className="px-4 py-3">STATUS</th>
                <th className="px-4 py-3">MOST FREQUENT MEDICINE</th>
                <th className="px-4 py-3">NOTES</th>
                <th className="px-4 py-3">LAST PURCHASE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {filteredRecords.map((r) => (
                <tr key={r.customerId} className="hover:bg-slate-50/60 transition-colors group">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={r.customer} tier={r.tier} />
                      <div>
                        <div
                          onClick={() => onSelectCustomer && onSelectCustomer(r.customerId)}
                          className="text-xs font-medium text-slate-900 hover:text-blue-600 cursor-pointer transition-colors"
                        >
                          {r.customer}
                        </div>
                        <div className="mt-0.5"><TierPill tier={r.tier} /></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-[12px] font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                      {r.customerId}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[12px] font-medium border bg-slate-50 text-slate-600 border-slate-200">
                      {r.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3.5"><StatusPill status={r.status} /></td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 text-slate-700">
                      <Pill size={11} className="text-slate-400 shrink-0" />
                      {r.medicines}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 max-w-[260px]">
                    <span className="block truncate" title={r.notes}>{r.notes}</span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{r.lastPurchase}</td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-xs text-slate-400">
                    No health records found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
          {filteredRecords.length} of {records.length} records · Derived from live customer profiles and purchase history
        </div>
      </div>
    </div>
  );
}

// ─── 5. Receipts Global View (Matching Screenshot 4) ──────────────────────────

function ReceiptsView({ onViewProfile, receipts = [] }) {

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Recent Receipts</h3>
            <p className="text-xs text-slate-400 mt-0.5">All customer purchase receipts</p>
          </div>
          <button className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer">
            <Download size={12} />
            <span>Export</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-3">RECEIPT ID</th>
                <th className="px-5 py-3">CUSTOMER</th>
                <th className="px-5 py-3">DATE</th>
                <th className="px-5 py-3 text-center">ITEMS</th>
                <th className="px-5 py-3 text-right">AMOUNT</th>
                <th className="px-5 py-3">PAYMENT</th>
                <th className="px-5 py-3 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {receipts.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60 transition-colors group">
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                      {r.id}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={r.customer} tier={r.tier} />
                      <button
                        onClick={() => onViewProfile && onViewProfile(r.customerId)}
                        className="text-xs font-medium text-slate-900 hover:text-blue-600 hover:underline text-left cursor-pointer"
                      >
                        {r.customer}
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-600 whitespace-nowrap">{r.date}</td>
                  <td className="px-5 py-3.5 text-xs text-center text-slate-600">{r.items}</td>
                  <td className="px-5 py-3.5 text-right text-xs font-bold text-slate-900 whitespace-nowrap">
                    ৳{r.amount.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5">
                    <PaymentMethodBadge method={r.payment} />
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => onViewProfile && onViewProfile(r.customerId)}
                        className="h-6 px-2 rounded-md border border-slate-200 text-[11px] font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Eye size={10} /> Profile
                      </button>
                      <button
                        className="h-6 px-2.5 rounded-md bg-[#25D366] text-white text-[11px] font-medium hover:bg-[#20bd5a] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Send size={10} /> WA
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── 6. Notifications View (Matching Screenshot 5) ────────────────────────────

const fmtRelativeTime = (iso) => {
  if (!iso) return '—';
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '—';
  const mins = Math.round((Date.now() - then.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return then.toLocaleDateString();
};

const mapNotif = (n) => ({
  id: String(n.id),
  type: n.type,
  read: !!n.is_read,
  time: fmtRelativeTime(n.created_at),
  title: n.title,
  body: n.message,
  meta: n.product_name || n.dedup_key || null,
});

const NOTIF_CONFIG = {
  low_stock: {
    icon: AlertTriangle,
    iconBg: 'bg-red-50',
    iconColor: 'text-red-500',
    border: 'border-red-200',
    label: 'Low Stock',
    labelBg: 'bg-red-50',
    labelText: 'text-red-700',
  },
  expiry: {
    icon: Clock,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
    border: 'border-amber-200',
    label: 'Expiry',
    labelBg: 'bg-amber-50',
    labelText: 'text-amber-700',
  },
  near_expiry: {
    icon: Bell,
    iconBg: 'bg-blue-50',
    iconColor: 'text-[#0EA5A4]',
    border: 'border-blue-200',
    label: 'Near Expiry',
    labelBg: 'bg-[#E6FBF9]',
    labelText: 'text-[#0EA5A4]',
  },
  general: {
    icon: Info,
    iconBg: 'bg-slate-50',
    iconColor: 'text-slate-500',
    border: 'border-slate-200',
    label: 'General',
    labelBg: 'bg-slate-100',
    labelText: 'text-slate-600',
  },
};

function NotificationsView() {
  const [notifications, setNotifications] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const summaryCards = [
    { type: 'low_stock', label: 'Low Stock', count: notifications.filter(n => n.type === 'low_stock').length, icon: AlertTriangle, iconBg: 'bg-red-50', iconColor: 'text-red-500', badgeBg: 'bg-red-100 text-red-700' },
    { type: 'expiry', label: 'Expiry', count: notifications.filter(n => n.type === 'expiry').length, icon: Clock, iconBg: 'bg-amber-50', iconColor: 'text-amber-500', badgeBg: 'bg-amber-100 text-amber-700' },
    { type: 'near_expiry', label: 'Near Expiry', count: notifications.filter(n => n.type === 'near_expiry').length, icon: Bell, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', badgeBg: 'bg-blue-100 text-blue-700' },
    { type: 'general', label: 'General', count: notifications.filter(n => n.type === 'general').length, icon: Info, iconBg: 'bg-slate-50', iconColor: 'text-slate-500', badgeBg: 'bg-slate-100 text-slate-600' },
  ];

  const categoryOptions = [
    { label: 'All', value: 'all' },
    { label: 'Low Stock', value: 'low_stock' },
    { label: 'Expiry', value: 'expiry' },
    { label: 'Near Expiry', value: 'near_expiry' },
    { label: 'General', value: 'general' },
  ];

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await fetchNotifications();
      setNotifications((data || []).map(mapNotif));
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (statusFilter === 'unread' && n.read) return false;
      if (categoryFilter !== 'all' && n.type !== categoryFilter) return false;
      return true;
    });
  }, [notifications, statusFilter, categoryFilter]);

  const newNotifications = filteredNotifications.filter(n => !n.read);
  const earlierNotifications = filteredNotifications.filter(n => n.read);

  const handleMarkRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    const rawId = Number(id);
    if (Number.isFinite(rawId) && rawId > 0) {
      try {
        await markNotificationRead(rawId);
      } catch { /* local state is already updated */ }
    }
  };

  const renderNotifCard = (n) => {
    const cfg = NOTIF_CONFIG[n.type] || NOTIF_CONFIG['medicine-reminder'];
    const Icon = cfg.icon;
    return (
      <div
        key={n.id}
        className={`bg-white border rounded-xl shadow-2xs p-3.5 flex items-start gap-3.5 group hover:shadow-md transition-all ${
          !n.read ? `${cfg.border} bg-white` : 'border-slate-200'
        }`}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
          <Icon size={15} className={cfg.iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${cfg.labelBg} ${cfg.labelText}`}>
              {cfg.label}
            </span>
            {!n.read && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
            )}
            <span className="text-[11px] text-slate-400 ml-auto shrink-0">{n.time}</span>
          </div>
          <p className="text-xs font-semibold text-slate-900 leading-snug">{n.title}</p>
          <p className="text-[12px] text-slate-600 mt-0.5 leading-relaxed">{n.body}</p>
          {n.meta && (
            <div className="mt-1.5 flex items-center gap-1">
              <span className="text-[11px] text-slate-500 font-medium bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                {n.type === 'general' ? <Info size={10} className="text-slate-400" /> : <Pill size={10} className="text-slate-400" />}
                {n.meta}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => handleMarkRead(n.id)}
          title="Mark as read"
          className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all shrink-0 cursor-pointer"
        >
          <Check size={12} />
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* 5 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {summaryCards.map((c) => {
          const Icon = c.icon;
          const isSelected = categoryFilter === c.type;
          return (
            <button
              key={c.type}
              onClick={() => setCategoryFilter(isSelected ? 'all' : c.type)}
              className={`bg-white border rounded-xl p-3.5 flex flex-col gap-2 text-left transition-all hover:shadow-md cursor-pointer ${
                isSelected ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-sm' : 'border-slate-200 shadow-2xs'
              }`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${c.iconBg}`}>
                <Icon size={14} className={c.iconColor} />
              </div>
              <div className="text-xl font-bold text-slate-900">{c.count}</div>
              <div className={`text-[11px] font-semibold px-2 py-0.5 rounded-md self-start ${c.badgeBg}`}>
                {c.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Dual Filter Bars */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Status Filter */}
        <div className="flex items-center gap-0.5 bg-slate-100/70 border border-slate-200/80 rounded-lg p-0.5 h-8">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 h-6 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('unread')}
            className={`px-3 h-6 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              statusFilter === 'unread' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-0.5 bg-slate-100/70 border border-slate-200/80 rounded-lg p-0.5 h-8 overflow-x-auto">
          {categoryOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setCategoryFilter(opt.value)}
              className={`px-2.5 h-6 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                categoryFilter === opt.value ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-slate-400 font-normal">
          {filteredNotifications.length} notifications
        </span>
      </div>

      {/* Loading / Error states */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-400">
          <RefreshCw size={14} className="animate-spin" />
          <span>Loading notifications...</span>
        </div>
      )}
      {!loading && loadError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
          <AlertTriangle size={14} className="shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {/* New Notifications */}
      {!loading && !loadError && newNotifications.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold text-slate-900">New</span>
            <span className="text-[11px] bg-blue-50 text-blue-600 font-bold px-1.5 py-0.2 rounded">
              {newNotifications.length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {newNotifications.map(renderNotifCard)}
          </div>
        </div>
      )}

      {/* Earlier Notifications */}
      {!loading && !loadError && earlierNotifications.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-0.5 mt-1">
            <span className="text-xs font-bold text-slate-900">Earlier</span>
          </div>
          <div className="flex flex-col gap-2">
            {earlierNotifications.map(renderNotifCard)}
          </div>
        </div>
      )}

      {!loading && !loadError && filteredNotifications.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-400 shadow-2xs">
          No notifications found matching the selected filters.
        </div>
      )}
    </div>
  );
}

// ─── 8. Customer Profile View (With 5 Sub-Tabs) ───────────────────────────────

function CustomerProfileView({ customerId, customers, reminders: allReminders = [], onBack }) {
  const [activeProfileTab, setActiveProfileTab] = useState('overview');
  const [expandedPurchaseId, setExpandedPurchaseId] = useState(null);
  const [customerReminders, setCustomerReminders] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loadingPurchases, setLoadingPurchases] = useState(true);
  const [isAddReminderOpen, setIsAddReminderOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);

  const [reminderForm, setReminderForm] = useState({
    medicine: '', dose: '', frequency: '', startDate: 'Jan 12, 2026', endDate: 'Ongoing'
  });

  const customer = useMemo(() => {
    return customers.find((c) => c.id === customerId) || customers[0];
  }, [customerId, customers]);

  const rawCustomerId = customer ? Number(customer.id.replace('PHC-', '')) : null;

  useEffect(() => {
    if (!customer) return;
    setCustomerReminders(allReminders.filter((r) => r.customerId === customer.id));
  }, [customer, allReminders]);

  useEffect(() => {
    if (!rawCustomerId) return;
    setLoadingPurchases(true);
    fetchCustomerPurchases(rawCustomerId)
      .then((data) => setPurchases((data || []).map(mapPurchase)))
      .catch(() => setPurchases([]))
      .finally(() => setLoadingPurchases(false));
  }, [rawCustomerId]);

  const monthlySpendData = useMemo(() => {
    const buckets = {};
    purchases.forEach((p) => {
      const m = p.date ? `${p.date.slice(0, 4)}-${p.date.slice(5, 7)}` : null;
      if (!m) return;
      buckets[m] = (buckets[m] || 0) + p.amount;
    });
    return Object.keys(buckets).sort().slice(-6).map((m) => ({
      month: MONTH_LABELS[Number(m.slice(5)) - 1],
      spend: buckets[m],
    }));
  }, [purchases]);

  const recentCustomerPurchases = purchases.slice(0, 3);
  const avgPerVisit = customer && customer.purchases ? Math.round(customer.spending / customer.purchases) : 0;

  const handleSaveReminder = async (e) => {
    e?.preventDefault();
    if (!reminderForm.medicine) return;
    let product = null;
    try {
      const matches = await fetchProducts({ search: reminderForm.medicine.trim() });
      product = matches && matches[0];
    } catch { /* ignore search failure */ }
    if (rawCustomerId && product) {
      try {
        await createReminder({
          customer: rawCustomerId,
          product: product.id,
          title: `${reminderForm.medicine} — refill reminder`,
          reminder_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true,
        });
      } catch { /* keep the local record even if the API call fails */ }
    }
    if (editingReminder) {
      setCustomerReminders(prev => prev.map(r => r.id === editingReminder.id ? { ...r, ...reminderForm } : r));
      setEditingReminder(null);
    } else {
      const newId = `RMD-${Date.now()}`;
      setCustomerReminders(prev => [{
        id: newId,
        medicine: reminderForm.medicine,
        dose: reminderForm.dose || '—',
        frequency: reminderForm.frequency || 'Once daily',
        startDate: reminderForm.startDate || '—',
        endDate: reminderForm.endDate || 'Ongoing',
        status: 'Active',
        nextReminder: reminderForm.startDate || '—',
        daysLeft: 7,
        stockTag: null
      }, ...prev]);
      setIsAddReminderOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Top Identity Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Back to Customers</span>
          </button>
          <div className="flex items-center gap-2">
            <button className="h-8 px-3 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
              <Download size={13} />
              <span>Export</span>
            </button>
            <button className="h-8 px-3 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
              <Send size={13} />
              <span>Send Reminder</span>
            </button>
            <button className="h-8 px-3.5 flex items-center gap-1.5 rounded-lg bg-[#0EA5A4] text-white text-xs font-medium hover:bg-[#0C8F8E] shadow-2xs transition-colors cursor-pointer">
              <Edit2 size={13} />
              <span>Edit Profile</span>
            </button>
          </div>
        </div>

        <div className="flex items-start justify-between gap-6 flex-wrap lg:flex-nowrap">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar name={customer.name} tier={customer.tier} size="lg" />
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">{customer.name}</h1>
                <TierPill tier={customer.tier} />
                <StatusPill status={customer.status} />
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 flex-wrap">
                <span className="flex items-center gap-1 text-blue-600 font-mono font-semibold">
                  # {customer.id}
                </span>
                <span className="flex items-center gap-1">
                  <Phone size={12} /> {customer.phone}
                </span>
                <span className="flex items-center gap-1">
                  <Mail size={12} /> {customer.email}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={12} /> {customer.area}, Dhaka
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={12} /> Since {customer.joinDate}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex flex-col gap-1 min-w-[115px]">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShoppingBag size={14} />
              </div>
              <div className="text-base font-bold text-slate-900 leading-tight">{customer.purchases}</div>
              <div className="text-[11px] text-slate-400">Total Purchases</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex flex-col gap-1 min-w-[125px]">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp size={14} />
              </div>
              <div className="text-base font-bold text-slate-900 leading-tight">৳{customer.spending.toLocaleString()}</div>
              <div className="text-[11px] text-slate-400">Total Spending</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex flex-col gap-1 min-w-[115px]">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock size={14} />
              </div>
              <div className="text-sm font-bold text-slate-900 leading-tight truncate">{customer.lastPurchase}</div>
              <div className="text-[11px] text-slate-400">Last Purchase</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex flex-col gap-1 min-w-[115px]">
              <div className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                <Bell size={14} />
              </div>
              <div className="text-base font-bold text-slate-900 leading-tight">{customerReminders.filter(r => r.status === 'Active').length}</div>
              <div className="text-[11px] text-slate-400">Active Reminders</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0 border-t border-slate-100 -mx-5 -mb-5 px-5 mt-2 overflow-x-auto select-none">
          {PROFILE_TABS.map((t) => {
            const Icon = t.icon;
            const isActive = activeProfileTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveProfileTab(t.key)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-blue-600 text-blue-600 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon size={13} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Overview Tab */}
      {activeProfileTab === 'overview' && (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
            <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800">Customer Information</span>
                <button className="flex items-center gap-1 text-xs text-blue-600 font-medium hover:text-blue-700 cursor-pointer">
                  <Edit2 size={12} />
                  <span>Edit</span>
                </button>
              </div>
              <div className="p-5 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                  <div>
                    <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">FULL NAME</div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-800 font-medium truncate">
                      <User size={12} className="text-slate-400 shrink-0" />
                      <span>{customer.name}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">CUSTOMER ID</div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-800 font-medium">
                      <Hash size={12} className="text-slate-400 shrink-0" />
                      <span className="font-mono text-blue-600 font-semibold"># {customer.id}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">PHONE</div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-800 font-medium">
                      <Phone size={12} className="text-slate-400 shrink-0" />
                      <span>{customer.phone}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">EMAIL</div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-800 font-medium truncate">
                      <Mail size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">DATE OF BIRTH</div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-800 font-medium">
                      <Calendar size={12} className="text-slate-400 shrink-0" />
                      <span>{customer.dob} {customer.age ? `(Age ${customer.age})` : ''}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">GENDER</div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-800 font-medium">
                      <User size={12} className="text-slate-400 shrink-0" />
                      <span>{customer.gender}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">OCCUPATION</div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-800 font-medium">
                      <Activity size={12} className="text-slate-400 shrink-0" />
                      <span>{customer.occupation}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">NID</div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-800 font-medium">
                      <Shield size={12} className="text-slate-400 shrink-0" />
                      <span>{customer.nid}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">MEMBER SINCE</div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-800 font-medium">
                      <Star size={12} className="text-slate-400 shrink-0" />
                      <span>{customer.joinDate}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">REFERRED BY</div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-800 font-medium">
                      <ArrowLeft size={12} className="text-slate-400 shrink-0" />
                      <span>{customer.referredBy}</span>
                    </div>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100">
                  <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1">ADDRESS</div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-800">
                    <MapPin size={12} className="text-slate-400 shrink-0" />
                    <span>{customer.area}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-2xs p-5 flex flex-col gap-3">
              <span className="text-sm font-semibold text-slate-800">Important Flags</span>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-start gap-2.5 p-3 bg-red-50/80 border border-red-200 rounded-lg">
                  <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-red-700 mb-0.5">Known Allergy</div>
                    <div className="text-xs text-red-600">No allergies recorded</div>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-3 bg-amber-50/80 border border-amber-200 rounded-lg">
                  <Activity size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-amber-700 mb-0.5">Chronic Conditions</div>
                    <div className="text-xs text-amber-600">No chronic conditions on file</div>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <Info size={14} className="text-slate-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-600 leading-relaxed">
                    {customer.notes || 'No notes recorded for this customer.'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-7 flex flex-col gap-4">
            <div className="bg-white border border-slate-200 rounded-xl shadow-2xs p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-semibold text-slate-800">Monthly Spending</div>
                  <div className="text-xs text-slate-400 mt-0.5">Last 6 months</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-slate-900">৳{customer.spending.toLocaleString()}</div>
                  <div className="text-xs text-slate-400">Lifetime total</div>
                </div>
              </div>
              <div className="w-full" style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlySpendData} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0EA5A4" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#0EA5A4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} tickFormatter={(v) => `৳${v / 1000}k`} />
                    <Tooltip
                      contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                      formatter={(v) => [`৳${Number(v).toLocaleString()}`, 'Spending']}
                    />
                    <Area
                      type="monotone"
                      dataKey="spend"
                      stroke="#0EA5A4"
                      strokeWidth={2.5}
                      fill="url(#spendGrad)"
                      dot={{ r: 3, fill: '#0EA5A4', strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                  <TrendingUp size={15} />
                </div>
                <div className="text-sm font-bold text-slate-900">৳{avgPerVisit.toLocaleString()}</div>
                <div className="text-[12px] text-slate-400 mt-0.5">Avg. Spend / Visit</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                  <Package size={15} />
                </div>
                <div className="text-sm font-bold text-slate-900 truncate">{customer.frequentlyBought || '—'}</div>
                <div className="text-[12px] text-slate-400 mt-0.5">Most Bought</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
                <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center mb-2">
                  <Repeat size={15} />
                </div>
                <div className="text-sm font-bold text-slate-900">—</div>
                <div className="text-[12px] text-slate-400 mt-0.5">Frequent Visit</div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800">Recent Purchases</span>
                <span className="text-xs text-slate-400">Last 3 transactions</span>
              </div>
              <div className="divide-y divide-slate-50">
                {recentCustomerPurchases.map((p) => (
                  <div key={p.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <ShoppingBag size={14} />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-blue-600 font-mono">{p.id}</div>
                        <div className="text-[12px] text-slate-400">{p.date} · {p.items} items</div>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {p.status}
                      </span>
                      <div className="text-xs font-bold text-slate-900">৳{p.amount.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Purchase History Sub-Tab */}
      {activeProfileTab === 'purchases' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-800">Purchase History</span>
              <span className="text-xs text-slate-400 font-normal">{loadingPurchases ? '…' : `${purchases.length} transactions`}</span>
            </div>
            <button className="h-8 px-3 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer">
              <Download size={13} />
              <span>Export</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3">DATE</th>
                  <th className="px-5 py-3">RECEIPT</th>
                  <th className="px-5 py-3 text-center">ITEMS</th>
                  <th className="px-5 py-3 text-center">QTY</th>
                  <th className="px-5 py-3 text-right">AMOUNT</th>
                  <th className="px-5 py-3">PAYMENT</th>
                  <th className="px-5 py-3">STATUS</th>
                  <th className="px-5 py-3 text-center">VIEW</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {loadingPurchases ? (
                  <tr><td colSpan={8} className="px-5 py-12 text-center text-xs text-slate-400">Loading purchase history...</td></tr>
                ) : purchases.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-12 text-center text-xs text-slate-400">No purchases recorded for this customer yet.</td></tr>
                ) : purchases.map((p) => {
                  const isExpanded = expandedPurchaseId === p.id;
                  return (
                    <React.Fragment key={p.id}>
                      <tr
                        onClick={() => setExpandedPurchaseId(isExpanded ? null : p.id)}
                        className="hover:bg-slate-50/60 transition-colors cursor-pointer group"
                      >
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-slate-800">{p.date}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{p.time}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs font-semibold text-blue-600 hover:underline">
                            {p.id}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center text-slate-700 font-normal">{p.items}</td>
                        <td className="px-5 py-3.5 text-center text-slate-700 font-normal">{p.qty}</td>
                        <td className="px-5 py-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                          ৳{p.amount.toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5">
                          <PaymentMethodBadge method={p.method} />
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusPill status={p.status} />
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); setExpandedPurchaseId(isExpanded ? null : p.id); }}
                            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors mx-auto cursor-pointer"
                          >
                            <Eye size={13} />
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-blue-50/30 border-y border-blue-100">
                          <td colSpan={8} className="px-6 py-3">
                            <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide mb-1.5">
                              Items in this transaction
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {p.products.map((prod, idx) => (
                                <span key={idx} className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 flex items-center gap-1.5 shadow-2xs">
                                  <Pill size={11} className="text-blue-600" />
                                  <span>{prod}</span>
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Health Information Sub-Tab */}
      {activeProfileTab === 'health' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 shadow-2xs">
            <Shield size={15} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed text-blue-900">
              <strong className="font-semibold text-blue-950">Manually entered by authorized pharmacy staff.</strong> This information is stored solely for safe dispensing purposes. It is not a medical record and does not replace professional medical advice.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs p-10 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
              <Heart size={24} className="text-slate-300" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-700">No health records recorded</div>
              <div className="text-xs text-slate-400 mt-1">
                Blood pressure, diabetes and allergy details are not captured by the backend yet.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Medicine Reminders Sub-Tab */}
      {activeProfileTab === 'reminders' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {customerReminders.filter((r) => r.daysLeft !== null && r.daysLeft <= 3 && r.status === 'Active').length > 0 && (
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-50/70 border border-amber-200 shadow-2xs">
                <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                <span className="text-xs text-amber-800">
                  <strong className="font-semibold">Medicine Running Low:</strong>{' '}
                  {customerReminders.filter((r) => r.daysLeft !== null && r.daysLeft <= 3 && r.status === 'Active').map((r) => r.medicine).join(', ')} — refill due soon based on schedule.
                </span>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-800">Medicine Reminders</span>
                <span className="text-xs text-slate-400 font-normal">{customerReminders.length} reminders</span>
              </div>
              <button
                onClick={() => {
                  setEditingReminder(null);
                  setReminderForm({ medicine: '', dose: '', frequency: '', startDate: 'Aug 17, 2026', endDate: 'Ongoing' });
                  setIsAddReminderOpen(true);
                }}
                className="h-8 px-3 flex items-center gap-1.5 rounded-lg bg-[#0EA5A4] text-white text-xs font-medium hover:bg-[#0C8F8E] shadow-2xs transition-colors cursor-pointer"
              >
                <Plus size={13} />
                <span>Add Reminder</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="px-5 py-3">MEDICINE</th>
                    <th className="px-4 py-3">DOSE</th>
                    <th className="px-4 py-3">FREQUENCY</th>
                    <th className="px-4 py-3">START DATE</th>
                    <th className="px-4 py-3">END DATE</th>
                    <th className="px-4 py-3">STATUS</th>
                    <th className="px-4 py-3">NEXT REMINDER</th>
                    <th className="px-4 py-3 text-center">EDIT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {customerReminders.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Pill size={12} />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 text-xs">{r.medicine}</div>
                            {r.stockTag && (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${r.stockTagColor?.includes('orange') ? 'bg-orange-500' : 'bg-amber-500'}`} />
                                <span className={`text-[11px] font-medium ${r.stockTagColor?.includes('orange') ? 'text-orange-600' : 'text-amber-600'}`}>
                                  {r.stockTag}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 font-normal">{r.dose}</td>
                      <td className="px-4 py-3.5 text-slate-700 font-normal max-w-[170px] truncate">{r.frequency}</td>
                      <td className="px-4 py-3.5 text-slate-600 font-normal whitespace-nowrap">{r.startDate}</td>
                      <td className="px-4 py-3.5 text-slate-600 font-normal whitespace-nowrap">{r.endDate}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <StatusPill status={r.status} />
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {r.nextReminder !== '—' ? (
                          <div>
                            <div className="font-medium text-slate-800 text-xs">{r.nextReminder}</div>
                            {r.daysLeft !== null && (
                              <div className={`text-[11px] font-medium mt-0.5 ${r.daysLeft <= 3 ? 'text-orange-600 font-semibold' : 'text-slate-400'}`}>
                                {r.daysLeft} days left
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => {
                            setEditingReminder(r);
                            setReminderForm({
                              medicine: r.medicine, dose: r.dose, frequency: r.frequency,
                              startDate: r.startDate, endDate: r.endDate
                            });
                            setIsAddReminderOpen(true);
                          }}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors mx-auto cursor-pointer"
                        >
                          <Edit2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Receipts Sub-Tab */}
      {activeProfileTab === 'receipts' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-800">Receipts</span>
              <span className="text-xs text-slate-400 font-normal">{loadingPurchases ? '…' : `${purchases.length} receipts`}</span>
            </div>
            <button className="h-8 px-3 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer">
              <Download size={13} />
              <span>Export All</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3">RECEIPT NO.</th>
                  <th className="px-5 py-3">DATE & TIME</th>
                  <th className="px-5 py-3 text-center">ITEMS</th>
                  <th className="px-5 py-3 text-right">AMOUNT</th>
                  <th className="px-5 py-3">PAYMENT METHOD</th>
                  <th className="px-5 py-3 text-center">VIEW</th>
                  <th className="px-5 py-3 text-center">WHATSAPP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {loadingPurchases ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-xs text-slate-400">Loading receipts...</td></tr>
                ) : purchases.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-xs text-slate-400">No receipts available for this customer yet.</td></tr>
                ) : purchases.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                        {r.id}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-800">{r.date}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{r.time}</div>
                    </td>
                    <td className="px-5 py-3.5 text-center text-slate-700 font-normal">{r.items}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                      ৳{r.amount.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <PaymentMethodBadge method={r.method} />
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        title="View Receipt"
                        className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors mx-auto cursor-pointer"
                      >
                        <Eye size={13} />
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        title="Share on WhatsApp"
                        className="w-7 h-7 rounded-md flex items-center justify-center text-[#25D366] hover:bg-emerald-50 transition-colors mx-auto cursor-pointer"
                      >
                        <WhatsAppIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Profile Reminder Modal */}
      {isAddReminderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px]" onClick={() => setIsAddReminderOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[480px] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm">{editingReminder ? 'Edit Reminder' : 'Add Medicine Reminder'}</h3>
              <button onClick={() => setIsAddReminderOpen(false)} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"><X size={15} /></button>
            </div>
            <form onSubmit={handleSaveReminder}>
              <div className="p-6 flex flex-col gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Medicine Name</label>
                  <input type="text" required value={reminderForm.medicine} onChange={e => setReminderForm({ ...reminderForm, medicine: e.target.value })} placeholder="e.g. Metformin 500mg" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 bg-white" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Dose</label>
                    <input type="text" value={reminderForm.dose} onChange={e => setReminderForm({ ...reminderForm, dose: e.target.value })} placeholder="e.g. 500mg" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Frequency</label>
                    <input type="text" value={reminderForm.frequency} onChange={e => setReminderForm({ ...reminderForm, frequency: e.target.value })} placeholder="e.g. Twice daily" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 bg-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
                    <input type="text" value={reminderForm.startDate} onChange={e => setReminderForm({ ...reminderForm, startDate: e.target.value })} placeholder="Aug 17, 2026" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">End Date</label>
                    <input type="text" value={reminderForm.endDate} onChange={e => setReminderForm({ ...reminderForm, endDate: e.target.value })} placeholder="Ongoing or specific date" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 bg-white" />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
                <button type="button" onClick={() => setIsAddReminderOpen(false)} className="h-9 px-4 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">Cancel</button>
                <button type="submit" className="h-9 px-4 rounded-lg bg-[#0EA5A4] text-white text-xs font-medium hover:bg-[#0C8F8E] shadow-2xs transition-colors cursor-pointer">{editingReminder ? 'Save Changes' : 'Save Reminder'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 9. Main Exported CRM Module ──────────────────────────────────────────────

export function CRMModule({ onNavigate, initialTab = 'dashboard' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const meta = PAGE_META[activeTab] || PAGE_META.dashboard;

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [rawCustomers, rawReminders, rawSales] = await Promise.all([
        fetchCrmCustomers(),
        fetchReminders(),
        fetchSales(),
      ]);
      const summaries = await Promise.all(
        (rawCustomers || []).map((c) => fetchCustomerSummary(c.id).catch(() => null))
      );
      setCustomers((rawCustomers || []).map((c, i) => mapCrmCustomer(c, summaries[i])));
      setReminders((rawReminders || []).map(mapCrmReminder));
      setReceipts((rawSales || []).map(mapSaleReceipt));
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Unable to load CRM data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleTabChange = (key) => {
    setActiveTab(key);
    setSelectedCustomerId(null);
  };

  const handleSelectCustomer = (id) => {
    setSelectedCustomerId(id);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Submenu Tabs */}
      <div className="bg-white border-b border-slate-200 -mx-7 -mt-6 px-7 flex items-center gap-0 overflow-x-auto shrink-0 select-none">
        {SUBMENU_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key && !selectedCustomerId;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-blue-600 text-blue-600 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Page Title & Description */}
      {!selectedCustomerId && (
        <div className="shrink-0 mt-1">
          <h2 className="text-[17px] font-bold text-slate-900 tracking-tight">{meta.title}</h2>
          <p className="text-xs text-slate-500 font-normal mt-0.5">{meta.description}</p>
        </div>
      )}

      {/* Loading / Error states */}
      {!selectedCustomerId && loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-xs text-slate-400">
          <RefreshCw size={14} className="animate-spin" />
          <span>Loading CRM data...</span>
        </div>
      )}
      {!selectedCustomerId && loadError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
          <AlertTriangle size={14} className="shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {/* Tab Views Routing */}
      {selectedCustomerId ? (
        <CustomerProfileView
          customerId={selectedCustomerId}
          customers={customers}
          reminders={reminders}
          onBack={() => setSelectedCustomerId(null)}
        />
      ) : loading || loadError ? null : activeTab === 'dashboard' ? (
        <CRMDashboardView
          onNavigateTab={handleTabChange}
          onNavigate={onNavigate}
          onViewProfile={handleSelectCustomer}
          customers={customers}
          reminders={reminders}
          receipts={receipts}
        />
      ) : activeTab === 'tiers' ? (
        <CustomerTiersView
          customers={customers}
          onSelectCustomer={handleSelectCustomer}
        />
      ) : activeTab === 'reminders' ? (
        <MedicineRemindersView
          reminders={reminders}
          customers={customers}
        />
      ) : activeTab === 'health' ? (
        <HealthInformationView
          customers={customers}
          onSelectCustomer={handleSelectCustomer}
        />
      ) : activeTab === 'receipts' ? (
        <ReceiptsView
          onViewProfile={handleSelectCustomer}
          receipts={receipts}
        />
      ) : activeTab === 'notifications' ? (
        <NotificationsView />
      ) : null}
    </div>
  );
}

export default CRMModule;
