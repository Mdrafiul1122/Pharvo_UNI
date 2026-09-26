import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search, Plus, Minus, X, Users, Check, ShoppingCart, CheckCircle, AlertTriangle, ShieldAlert, Info, Pause,
} from 'lucide-react';
import { fetchProducts, fetchCategories } from '../services/medicine';
import { fetchCustomers } from '../services/customer';
import { checkout, checkInteractions, fetchDiscountPreview } from '../services/pos';
import { ApiError } from '../services/api';
import { formatBreakdownShort, formatEquivalents } from '../utils/units';

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', backend: 'cash' },
  { id: 'digital', label: 'bKash / Digital', backend: 'bkash' },
  { id: 'split', label: 'Split', backend: 'split' },
];

const WALK_IN = { id: null, name: 'Walk-in Customer', phone: '', is_member: false };

// Selling units: PC (single piece), Strip and Box pack pricing comes from the
// product API (`strip_price` / `box_price`). A missing price means the
// medicine cannot be sold by that unit.
const UNIT_META = {
  pc: { label: 'PC', plural: 'PCs', short: 'pc' },
  strip: { label: 'Strip', plural: 'Strips', short: 'str' },
  box: { label: 'Box', plural: 'Boxes', short: 'box' },
};

function unitPriceOf(med, unit) {
  if (unit === 'pc') return Number(med.unit_price);
  if (unit === 'strip') return med.strip_price == null ? null : Number(med.strip_price);
  if (unit === 'box') return med.box_price == null ? null : Number(med.box_price);
  return null;
}

function unitsPerUnitOf(med, unit) {
  if (unit === 'strip') return Number(med.pcs_per_strip) || null;
  if (unit === 'box') return Number(med.pcs_per_box) || null;
  return 1;
}

function stockInUnit(med, unit) {
  const stock = Number(med.stock_quantity) || 0;
  const per = unitsPerUnitOf(med, unit);
  return per ? Math.floor(stock / per) : 0;
}

function canSellUnit(med, unit) {
  return (
    stockInUnit(med, unit) > 0 &&
    unitPriceOf(med, unit) != null &&
    unitsPerUnitOf(med, unit) != null
  );
}

const INTERACTION_LEVELS = {
  caution: {
    label: 'Caution',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: 'text-amber-500',
  },
  avoid: {
    label: 'Avoid',
    badge: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: 'text-orange-500',
  },
  high_risk: {
    label: 'High Risk',
    badge: 'bg-red-100 text-red-700 border-red-200',
    icon: 'text-red-600',
  },
  contraindicated: {
    label: 'Contraindicated',
    badge: 'bg-rose-100 text-rose-700 border-rose-300',
    icon: 'text-rose-600',
  },
};



export function SalesModule() {
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState('');
  const searchTimer = useRef(null);
  const productsReqSeq = useRef(0);
  const categoriesRef = useRef([]);
  const initialSearchRun = useRef(true);
  const lastCheckedSig = useRef("");
  const interactionReqSeq = useRef(0);

  // Customer Management
  const [customer, setCustomer] = useState(WALK_IN);
  const [customers, setCustomers] = useState([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  // Cart
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState('');

  // CRM automatic discount (fetched from backend preview endpoint)
  const [crmDiscount, setCrmDiscount] = useState(0);
  const [crmRate, setCrmRate] = useState(0);
  const [crmBreakdown, setCrmBreakdown] = useState([]);
  const crmPreviewTimer = useRef(null);
  const crmPreviewSeq = useRef(0);

  // Payment
  const [payMethod, setPayMethod] = useState('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [digitalReceived, setDigitalReceived] = useState('');

  // Checkout state
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [pendingApproval, setPendingApproval] = useState(null);
  const [receipt, setReceipt] = useState(null);

  // Drug interaction warnings
  const [interactionWarnings, setInteractionWarnings] = useState([]);
  const [pendingInteractions, setPendingInteractions] = useState(null);
  const interactionTimer = useRef(null);

  // Held sale
  const [heldSale, setHeldSale] = useState(null);

  const loadProducts = useCallback(async (search = '', category = 'All') => {
    const seq = ++productsReqSeq.current;
    setProductsLoading(true);
    setProductsError('');
    try {
      const params = { search: search || undefined, is_active: 'true' };
      if (category !== 'All') {
        const match = categoriesRef.current.find((c) => c.name === category);
        if (match) params.category = match.id;
      }
      const data = await fetchProducts(params);
      if (seq !== productsReqSeq.current) return;
      setMedicines(data || []);
    } catch (err) {
      if (seq !== productsReqSeq.current) return;
      setProductsError(err instanceof ApiError ? err.message : 'Unable to load medicines.');
      setMedicines([]);
    } finally {
      if (seq === productsReqSeq.current) setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  useEffect(() => {
    fetchCategories()
      .then((data) => setCategories(data || []))
      .catch(() => setCategories([]));
    Promise.resolve().then(loadProducts);
  }, [loadProducts]);

  useEffect(() => {
    if (initialSearchRun.current) {
      initialSearchRun.current = false;
      return;
    }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      loadProducts(searchQuery, selectedCategory);
    }, 350);
    return () => clearTimeout(searchTimer.current);
  }, [searchQuery, selectedCategory, loadProducts]);

  const loadCustomers = useCallback(async (search = '') => {
    try {
      const data = await fetchCustomers(search);
      setCustomers(data || []);
    } catch {
      setCustomers([]);
    }
  }, []);

  useEffect(() => {
    if (!showCustomerModal || customers.length > 0) return;
    Promise.resolve().then(loadCustomers);
  }, [showCustomerModal, customers.length, loadCustomers]);

  // Live drug-interaction check whenever the cart changes.
  useEffect(() => {
    if (cart.length < 2) {
      lastCheckedSig.current = '';
      Promise.resolve().then(() => setInteractionWarnings([]));
      return;
    }
    const signature = cart.map(i => i.productId).sort((a, b) => a - b).join(',');
    if (signature === lastCheckedSig.current) return;
    clearTimeout(interactionTimer.current);
    interactionTimer.current = setTimeout(() => {
      const seq = ++interactionReqSeq.current;
      checkInteractions(cart.map(item => ({ product: item.productId, quantity: item.qty })))
        .then(data => {
          if (seq === interactionReqSeq.current) setInteractionWarnings(data?.interactions || []);
        })
        .catch(() => {
          if (seq === interactionReqSeq.current) setInteractionWarnings([]);
        });
    }, 500);
    return () => clearTimeout(interactionTimer.current);
  }, [cart]);

  // Live CRM discount preview whenever customer or cart changes.
  useEffect(() => {
    if (customer.id === null || cart.length === 0) {
      Promise.resolve().then(() => {
        setCrmDiscount(0);
        setCrmRate(0);
        setCrmBreakdown([]);
      });
      return;
    }
    const items = cart.map(item => ({
      product: item.productId,
      quantity: item.qty,
      unit_price: item.unitPrice,
    }));
    clearTimeout(crmPreviewTimer.current);
    crmPreviewTimer.current = setTimeout(() => {
      const seq = ++crmPreviewSeq.current;
      fetchDiscountPreview(customer.id, items)
        .then(data => {
          if (seq === crmPreviewSeq.current) {
            setCrmDiscount(Number(data.crm_discount) || 0);
            setCrmRate(Number(data.rate) || 0);
            setCrmBreakdown(data.breakdown || []);
          }
        })
        .catch(() => {
          if (seq === crmPreviewSeq.current) {
            setCrmDiscount(0);
            setCrmRate(0);
            setCrmBreakdown([]);
          }
        });
    }, 400);
    return () => clearTimeout(crmPreviewTimer.current);
  }, [customer, cart]);

  // Add medicine to cart with the selected selling unit (pc / strip / box)
  const addToCart = (med, unit = 'pc') => {
    const price = unitPriceOf(med, unit);
    if (price == null) return;
    const itemKey = `${med.id}:${unit}`;
    const available = stockInUnit(med, unit);
    setCart(prev => {
      const existing = prev.find(item => item.id === itemKey);
      if (existing) {
        if (existing.qty + 1 > available) {
          return prev.map(item =>
            item.id === itemKey
              ? { ...item, qty: Math.min(existing.qty + 1, available), total: Math.min(existing.qty + 1, available) * item.unitPrice }
              : item
          );
        }
        return prev.map(item =>
          item.id === itemKey
            ? { ...item, qty: item.qty + 1, total: (item.qty + 1) * item.unitPrice }
            : item
        );
      }
      return [
        ...prev,
        {
          id: itemKey,
          productId: med.id,
          name: med.name,
          unit,
          unitLabel: UNIT_META[unit].label,
          unitPrice: price,
          qty: 1,
          total: price,
          availableStock: available,
          barcode: med.barcode,
        },
      ];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.id === id) {
            const nextQty = Math.max(1, Math.min(item.availableStock, item.qty + delta));
            return { ...item, qty: nextQty, total: nextQty * item.unitPrice };
          }
          return item;
        })
        .filter(item => item.qty > 0)
    );
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));

  const clearCart = () => {
    setCart([]);
    setDiscount('');
    setCrmDiscount(0);
    setCrmRate(0);
    setCrmBreakdown([]);
    setCashReceived('');
    setDigitalReceived('');
    setPendingApproval(null);
    setCheckoutError('');
    setInteractionWarnings([]);
    setPendingInteractions(null);
  };

  const totalItemCount = cart.reduce((acc, item) => acc + item.qty, 0);
  const subtotal = cart.reduce((acc, item) => acc + item.total, 0);
  const manualDiscountPct = Math.min(Math.max(Number(discount) || 0, 0), 100);
  const manualDiscountAmount = Math.min(subtotal * manualDiscountPct / 100, Math.max(0, subtotal - crmDiscount));
  const grandTotal = Math.max(0, subtotal - crmDiscount - manualDiscountAmount);

  const buildPayments = () => {
    if (payMethod === 'cash') {
      return [{ method: 'cash', amount: grandTotal }];
    }
    if (payMethod === 'digital') {
      return [{ method: 'bkash', amount: grandTotal }];
    }
    const cashAmount = Number(cashReceived) || 0;
    const digitalAmount = Number(digitalReceived) || 0;
    if (cashAmount + digitalAmount !== grandTotal) {
      throw new ApiError(
        `Split payments must total ${grandTotal.toLocaleString()}. Current total is ${(cashAmount + digitalAmount).toLocaleString()}.`,
        400
      );
    }
    return [
      { method: 'cash', amount: cashAmount },
      { method: 'bkash', amount: digitalAmount },
    ];
  };

  const doCheckout = async (approveSensitive = false, approveInteractions = false) => {
    setCheckingOut(true);
    setCheckoutError('');
    try {
      const payments = buildPayments();
      const payload = {
        items: cart.map(item => ({
          product: item.productId,
          unit: item.unit,
          quantity: item.qty,
          unit_price: item.unitPrice,
        })),
        customer: customer.id,
        discount: manualDiscountAmount,
        payments,
        approve_sensitive: approveSensitive,
        approve_interactions: approveInteractions,
      };
      const result = await checkout(payload);
      if (result.requires_interaction_approval) {
        setPendingInteractions(result.interactions || []);
      } else if (result.requires_approval) {
        setPendingApproval(result);
      } else {
        setReceipt(result);
        await loadProducts(searchQuery, selectedCategory);
        setCustomer(WALK_IN);
        clearCart();
      }
    } catch (err) {
      setCheckoutError(err instanceof ApiError ? err.message : 'Unable to complete the sale.');
    } finally {
      setCheckingOut(false);
    }
  };

  const handleCompleteSale = () => {
    if (cart.length === 0) return;
    setCheckoutError('');
    if (interactionWarnings.length > 0) {
      setPendingInteractions(interactionWarnings);
      return;
    }
    doCheckout(false, false);
  };

  const handleHoldSale = () => {
    if (cart.length === 0) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setHeldSale({ customer, cart, discount, time });
    clearCart();
  };

  const resumeHeldSale = () => {
    if (!heldSale) return;
    setCustomer(heldSale.customer || WALK_IN);
    setCart(heldSale.cart || []);
    setDiscount(heldSale.discount ?? '');
    setHeldSale(null);
  };

  const filteredCustomers = useMemo(
    () => customers.filter(c => {
      if (!customerSearch) return true;
      const q = customerSearch.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.phone.includes(q);
    }),
    [customers, customerSearch]
  );

  const medicineCategories = useMemo(
    () => ['All', ...categories.map((c) => c.name)],
    [categories]
  );

  return (
    <div className="w-full flex flex-col gap-4 font-sans text-slate-800">
      {/* ─── ROW 1: SEARCH / FILTERS BAR & CUSTOMER SELECTOR BAR ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-center">
        <div className="xl:col-span-7 flex items-center gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search medicines by name, brand or barcode..."
              className="w-full pl-9 pr-4 py-2 text-xs font-normal rounded-lg border border-slate-200 outline-none focus:border-slate-400 bg-white shadow-2xs"
            />
          </div>
          <div className="relative flex-shrink-0">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 outline-none cursor-pointer shadow-2xs hover:border-slate-300"
            >
              {medicineCategories.map(c => (
                <option key={c} value={c}>{c === 'All' ? 'All' : c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="xl:col-span-5 bg-white rounded-xl border border-slate-200 p-2 px-3.5 shadow-xs flex items-center justify-between min-h-[42px]">
          {customer.id === null ? (
            <>
              <div className="flex items-center gap-2">
                <Users size={15} className="text-slate-400" />
                <span className="text-xs font-medium text-slate-900">Walk-in Customer</span>
              </div>
              <button
                onClick={() => setShowCustomerModal(true)}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                Select Customer
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-semibold text-xs flex items-center justify-center flex-shrink-0 shadow-2xs">
                  {customer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-slate-900 truncate">{customer.name}</span>
                    {customer.is_member && (
                      <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded leading-none">
                        {customer.membership_tier ? customer.membership_tier : 'Member'}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 font-normal block mt-0.5">{customer.phone}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => setShowCustomerModal(true)}
                  className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  Change
                </button>
                <button
                  onClick={() => setCustomer(WALK_IN)}
                  className="p-1 text-slate-400 hover:text-red-600 border border-slate-200 rounded-lg hover:bg-red-50 cursor-pointer"
                  title="Remove customer"
                >
                  <X size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── ROW 2: MEDICINE CATALOG TABLE & SALES PANEL ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <div className="xl:col-span-7 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col">
          <div className="overflow-x-auto max-h-[640px] overflow-y-auto scrollbar-thin">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-100 z-10">
                <tr className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-4 w-[32%]">MEDICINE</th>
                  <th className="py-3 px-3 w-[9%]">CATEGORY</th>
                  <th className="py-3 px-3 w-[22%]">PRICES (৳)</th>
                  <th className="py-3 px-3 w-[8%]">STOCK</th>
                  <th className="py-3 px-4 w-[29%] text-center">ADD UNIT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productsLoading ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-slate-400 font-normal">Loading medicines...</td>
                  </tr>
                ) : productsError ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-red-500 font-normal">{productsError}</td>
                  </tr>
                ) : medicines.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-slate-400 font-normal">
                      No medicines match the selected search or filters
                    </td>
                  </tr>
                ) : (
                  medicines.map((m) => {
                    const stock = Number(m.stock_quantity);
                    const isLowStock = stock <= Number(m.reorder_level);
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-[13px] text-slate-900 leading-snug">{m.name}</span>
                            {m.is_sensitive && (
                              <span className="text-[11px] font-medium bg-red-100 text-red-600 px-1.5 py-0.2 rounded tracking-wide">
                                RESTRICTED
                              </span>
                            )}
                          </div>
                          <div className="text-[12px] text-slate-400 font-normal mt-0.5 leading-none">{m.brand || m.barcode}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-normal whitespace-nowrap">{m.category_name || '—'}</td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5 text-[12px] leading-tight">
                            {[
                              ['PC', unitPriceOf(m, 'pc'), 'pc'],
                              ['Strip', unitPriceOf(m, 'strip'), 'strip'],
                              ['Box', unitPriceOf(m, 'box'), 'box'],
                            ].map(([label, price]) => (
                              <div key={label} className="flex items-center gap-1.5">
                                <span className="w-8 text-slate-400 font-normal">{label}</span>
                                {price != null ? (
                                  <span className="font-semibold text-slate-800 tabular-nums">
                                    {price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </span>
                                ) : (
                                  <span className="font-medium text-slate-300 select-none">N/A</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className={`py-3 px-3 font-medium whitespace-nowrap ${isLowStock ? 'text-amber-600' : 'text-slate-700'}`}>
                          <div>{formatBreakdownShort(stock, m)}</div>
                          <div className="text-[11px] text-slate-400 font-normal">{formatEquivalents(stock, m)}</div>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            {['pc', 'strip', 'box'].map(unit => {
                              const enabled = canSellUnit(m, unit);
                              const price = unitPriceOf(m, unit);
                              return (
                                <button
                                  key={unit}
                                  onClick={() => addToCart(m, unit)}
                                  disabled={!enabled}
                                  title={
                                    enabled
                                      ? `Add 1 ${UNIT_META[unit].label} · ৳${Number(price).toLocaleString()}`
                                      : price == null
                                        ? `${UNIT_META[unit].label} price not configured`
                                        : `No full ${UNIT_META[unit].label} in stock`
                                  }
                                  className="px-2 py-1.5 text-[11px] font-semibold border rounded-md transition-colors cursor-pointer shadow-2xs disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent text-blue-600 bg-blue-50/70 border-blue-200 hover:bg-blue-600 hover:text-white"
                                >
                                  Add {UNIT_META[unit].short}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between text-[12px] text-slate-400 font-normal">
            <span>{medicines.length} medicines shown</span>
            <span>RESTRICTED items require staff approval at checkout</span>
          </div>
        </div>

        <div className="xl:col-span-5 flex flex-col gap-4">
          {/* CARD 1: CURRENT SALE */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900">Current Sale</h3>
                {cart.length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-medium flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </div>
              {cart.length > 0 && (
                <button onClick={clearCart} className="text-xs font-medium text-red-500 hover:text-red-700 cursor-pointer">
                  Clear all
                </button>
              )}
            </div>

            {/* Held Sale Notification Banner */}
            {heldSale && (
              <div className="my-2.5 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-medium text-amber-800 flex items-center justify-between gap-2">
                <span className="min-w-0 flex items-center gap-1.5">
                  <Pause size={13} className="shrink-0" />
                  Sale for {heldSale.customer?.name || 'Walk-in'} with {heldSale.cart.length} item(s) held at {heldSale.time}.
                </span>
                <span className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={resumeHeldSale}
                    className="px-2 py-1 rounded bg-amber-200/70 hover:bg-amber-200 text-amber-900 font-semibold cursor-pointer"
                  >
                    Resume
                  </button>
                  <button
                    onClick={() => setHeldSale(null)}
                    className="text-amber-600 hover:text-amber-900 cursor-pointer font-medium"
                  >
                    Dismiss
                  </button>
                </span>
              </div>
            )}

            {/* Drug Interaction Warning Banner */}
            {interactionWarnings.length > 0 && (
              <div className="my-2.5 p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <ShieldAlert size={15} className="text-red-600 shrink-0" />
                  <span className="text-xs font-medium text-red-700 min-w-0">
                    {interactionWarnings.length} drug interaction warning{interactionWarnings.length > 1 ? 's' : ''} detected
                  </span>
                </div>
                <button
                  onClick={() => setPendingInteractions(interactionWarnings)}
                  className="px-2.5 py-1 text-[12px] font-semibold text-red-700 bg-red-100 hover:bg-red-200 border border-red-200 rounded-md cursor-pointer flex-shrink-0"
                >
                  Review
                </button>
              </div>
            )}

            <div className="min-h-[280px] max-h-[320px] overflow-y-auto divide-y divide-slate-100 scrollbar-thin">
              {cart.length === 0 ? (
                <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-slate-400">
                  <ShoppingCart size={38} className="text-slate-200 mb-3" strokeWidth={1.5} />
                  <p className="text-xs font-normal text-slate-400">Add medicines using Add PC / Add Strip / Add Box</p>
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[11px] font-semibold uppercase text-slate-400 border-b border-slate-100">
                      <th className="py-2.5 text-left">MEDICINE</th>
                      <th className="py-2.5 text-center">QTY</th>
                      <th className="py-2.5 text-right">UNIT PRICE</th>
                      <th className="py-2.5 text-right">TOTAL</th>
                      <th className="py-2.5 text-center w-6"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cart.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 font-medium text-slate-800 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate block max-w-[96px]">{item.name}</span>
                            <span className="text-[11px] font-semibold uppercase tracking-wide bg-blue-50 text-blue-700 border border-blue-200 rounded px-1 leading-4 flex-shrink-0">
                              {item.qty} × {item.unitLabel}
                            </span>
                          </div>
                          <span className={`text-[11px] ${item.qty > item.availableStock ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
                            {item.availableStock.toLocaleString()} {UNIT_META[item.unit].plural.toLowerCase()} in stock
                          </span>
                        </td>
                        <td className="py-2.5 px-1 text-center">
                          <div className="inline-flex items-center gap-1.5 border border-slate-200 rounded-md px-1.5 py-0.5 bg-slate-50/60">
                            <button onClick={() => updateQty(item.id, -1)} className="text-slate-400 hover:text-slate-800 cursor-pointer">
                              <Minus size={11} />
                            </button>
                            <span className="font-medium text-xs text-slate-900 min-w-[12px] text-center">{item.qty}</span>
                            <button onClick={() => updateQty(item.id, 1)} className="text-slate-400 hover:text-slate-800 cursor-pointer">
                              <Plus size={11} />
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-1 text-right text-slate-500 font-normal whitespace-nowrap">৳{item.unitPrice.toLocaleString()}</td>
                        <td className="py-2.5 px-1 text-right font-semibold text-slate-900 whitespace-nowrap">৳{item.total.toLocaleString()}</td>
                        <td className="py-2.5 pl-1 text-center">
                          <button onClick={() => removeFromCart(item.id)} className="text-slate-300 hover:text-red-600 cursor-pointer font-normal">×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* CARD 2: SALE TOTALS */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs text-slate-500 font-normal">
              <span>Subtotal ({totalItemCount} items)</span>
              <span className="font-medium text-slate-900">৳{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-normal">CRM Auto Discount</span>
              <span className={`font-medium tabular-nums ${crmDiscount > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                {crmRate > 0 ? `-${Math.round(crmRate * 100)}%` : '0%'}
              </span>
            </div>
            {crmDiscount > 0 && crmBreakdown.length > 0 && (
              <div className="text-[11px] text-slate-400 px-0.5 -mt-1">
                {crmBreakdown.filter(b => b.is_eligible).map(b => b.product_name).join(', ')}
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-normal">Manual Discount</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={discount}
                  onChange={e => setDiscount(e.target.value)}
                  placeholder="0"
                  className="w-20 px-1.5 py-0.5 text-center text-xs font-normal border border-slate-200 rounded outline-none"
                />
                <span className="text-slate-500 font-normal">%</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
              <span className="text-sm font-semibold text-slate-900">Grand Total</span>
              <span className="text-2xl font-bold text-blue-600">৳{grandTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* CARD 3: PAYMENT METHOD & FINAL ACTIONS */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">PAYMENT METHOD</span>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map(m => {
                const isSelected = payMethod === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setPayMethod(m.id)}
                    className={`py-2 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/80 text-blue-700 shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {payMethod === 'cash' && (
              <div>
                <label className="text-[12px] font-normal text-slate-500 block mb-1">Cash Received</label>
                <input
                  value={cashReceived}
                  onChange={e => setCashReceived(e.target.value)}
                  placeholder={`৳${grandTotal}`}
                  className="w-full px-3 py-2 text-xs font-normal rounded-lg border border-slate-200 outline-none bg-slate-50/50"
                />
                <p className="text-[11px] text-slate-400 mt-1">Change: ৳{Math.max(0, (Number(cashReceived) || 0) - grandTotal).toLocaleString()}</p>
              </div>
            )}

            {payMethod === 'digital' && (
              <div>
                <label className="text-[12px] font-normal text-slate-500 block mb-1">bKash Payment</label>
                <div className="flex items-center gap-2">
                  <input
                    value={digitalReceived}
                    onChange={e => setDigitalReceived(e.target.value)}
                    placeholder={`৳${grandTotal}`}
                    className="flex-1 px-3 py-2 text-xs font-normal rounded-lg border border-slate-200 outline-none bg-slate-50/50"
                  />
                </div>
              </div>
            )}

            {payMethod === 'split' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[12px] font-normal text-slate-500 block mb-1">Cash (৳)</label>
                  <input
                    value={cashReceived}
                    onChange={e => setCashReceived(e.target.value)}
                    placeholder="৳0"
                    className="w-full px-3 py-2 text-xs font-normal rounded-lg border border-slate-200 outline-none bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-normal text-slate-500 block mb-1">bKash (৳)</label>
                  <input
                    value={digitalReceived}
                    onChange={e => setDigitalReceived(e.target.value)}
                    placeholder={`৳${grandTotal}`}
                    className="w-full px-3 py-2 text-xs font-normal rounded-lg border border-slate-200 outline-none bg-slate-50/50"
                  />
                </div>
              </div>
            )}

            {checkoutError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-700 flex items-center gap-2">
                <AlertTriangle size={13} className="shrink-0" />
                <span>{checkoutError}</span>
              </div>
            )}

            <div className="grid grid-cols-12 gap-2 mt-1">
              <button
                onClick={handleHoldSale}
                disabled={cart.length === 0}
                className="col-span-3 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
              >
                Hold Sale
              </button>
              <button
                onClick={clearCart}
                disabled={cart.length === 0}
                className="col-span-3 py-2.5 rounded-lg border border-red-200 bg-rose-50/40 hover:bg-rose-100 disabled:opacity-50 text-red-600 font-medium text-xs transition-colors cursor-pointer"
              >
                Clear Cart
              </button>
              <button
                onClick={handleCompleteSale}
                disabled={cart.length === 0 || checkingOut}
                className={`col-span-6 py-2.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                  cart.length > 0 && !checkingOut
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Check size={15} />
                <span>{checkingOut ? 'Processing...' : `Complete Sale · ৳${grandTotal.toLocaleString()}`}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── SELECT CUSTOMER MODAL ─── */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <h4 className="text-sm font-semibold text-slate-900">Select Customer</h4>
              <button onClick={() => setShowCustomerModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5">
                <X size={16} />
              </button>
            </div>
            <div className="p-3 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  placeholder="Search by name or phone..."
                  className="w-full pl-9 pr-4 py-2 text-xs font-normal rounded-lg border border-slate-200 outline-none focus:border-blue-500 bg-white"
                />
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 scrollbar-thin">
              <div
                onClick={() => { setCustomer(WALK_IN); setShowCustomerModal(false); }}
                className={`flex items-center justify-between p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${customer.id === null ? 'bg-blue-50/60' : ''}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 flex-shrink-0">
                    <Users size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900">Walk-in Customer</div>
                    <span className="text-[11px] text-slate-400 font-normal block mt-0.5">No membership · no automatic discount</span>
                  </div>
                </div>
                {customer.id === null && <Check size={16} className="text-blue-600 ml-1" />}
              </div>
              {filteredCustomers.map(c => {
                const isSelected = customer.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => { setCustomer(c); setShowCustomerModal(false); }}
                    className={`flex items-center justify-between p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/60' : ''}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-semibold text-xs flex items-center justify-center flex-shrink-0">
                        {c.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 truncate">{c.name}</div>
                        <span className="text-[11px] text-slate-400 font-normal block mt-0.5">{c.phone}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {c.is_member && (
                        <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded capitalize">
                          {c.membership_tier || 'Member'}
                        </span>
                      )}
                      {isSelected && <Check size={16} className="text-blue-600 ml-1" />}
                    </div>
                  </div>
                );
              })}
              {filteredCustomers.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400">No customers found.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── SENSITIVE APPROVAL MODAL ─── */}
      {pendingApproval && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col p-6">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={26} />
            </div>
            <h4 className="text-base font-semibold text-slate-900 text-center">Sensitive Medicines</h4>
            <p className="text-xs text-slate-500 font-normal mt-1 text-center">
              This cart contains restricted medicines. Staff approval is required before completing the sale.
            </p>
            <div className="my-4 p-3 bg-slate-50 rounded-lg text-xs font-normal text-slate-700 flex flex-col gap-1.5">
              {pendingApproval.sensitive_items.map((item, i) => (
                <div key={i} className="flex justify-between">
                  <span>{item.product_name}</span>
                  <span className="font-semibold text-slate-900">x {item.quantity}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setPendingApproval(null); doCheckout(true, true); }}
                disabled={checkingOut}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs cursor-pointer shadow-sm disabled:opacity-50"
              >
                {checkingOut ? 'Processing...' : 'Approve & Complete Sale'}
              </button>
              <button
                onClick={() => setPendingApproval(null)}
                className="w-full py-2.5 border border-slate-200 text-slate-700 font-medium rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DRUG INTERACTION REVIEW MODAL ─── */}
      {pendingInteractions && pendingInteractions.length > 0 && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex items-start gap-3">
              <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">
                <ShieldAlert size={20} />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-slate-900">Drug Interaction Warning</h4>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  The following medicines in this cart have known interactions. Review before completing the sale.
                </p>
              </div>
              <button
                onClick={() => setPendingInteractions(null)}
                className="ml-auto text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 flex flex-col gap-2.5 max-h-[50vh] overflow-y-auto scrollbar-thin">
              {pendingInteractions.map((ix, i) => {
                const level = INTERACTION_LEVELS[ix.level] || INTERACTION_LEVELS.caution;
                return (
                  <div key={`${ix.interaction_id}-${i}`} className="border border-slate-200 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-900">
                        {ix.products?.map(p => p.name).join('  +  ')}
                      </span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${level.badge}`}>
                        {level.label}
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-500 font-normal mt-1">
                      {ix.description || `Known interaction between ${ix.drug_a || 'these medicines'} and ${ix.drug_b || 'these medicines'}.`}
                    </p>
                    <div className="mt-2 flex items-start gap-1.5 bg-slate-50 border border-slate-100 rounded-md p-2">
                      <Info size={12} className="text-slate-400 mt-0.5 shrink-0" />
                      <p className="text-[12px] font-normal text-slate-600 leading-snug">{ix.recommendation}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={() => { setPendingInteractions(null); doCheckout(false, true); }}
                disabled={checkingOut}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs cursor-pointer shadow-sm disabled:opacity-50"
              >
                {checkingOut ? 'Processing...' : 'I\u2019ve Reviewed — Complete Sale'}
              </button>
              <button
                onClick={() => setPendingInteractions(null)}
                className="w-full py-2.5 border border-slate-200 text-slate-700 font-medium rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── SALE COMPLETED INVOICE MODAL ─── */}
      {receipt && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col p-6">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle size={26} />
            </div>
            <h4 className="text-base font-semibold text-slate-900 text-center">Sale Completed</h4>
            <p className="text-xs text-slate-500 font-normal mt-1 text-center">Invoice #{receipt.invoice_number}</p>

            <div className="my-4 p-3 bg-slate-50 rounded-lg text-xs font-normal text-slate-700 flex flex-col gap-1 text-left">
              <div className="flex justify-between">
                <span>Customer:</span>
                <span className="font-semibold text-slate-900">{receipt.customer_name || 'Walk-in'}</span>
              </div>
              {receipt.items && (
                <div className="flex flex-col gap-0.5 py-1 border-y border-slate-200 my-1">
                  {receipt.items.map((it, i) => (
                    <div key={i} className="flex justify-between">
                      <span>{it.product_name} × {it.quantity} {(it.unit_display || 'pc').toLowerCase()}</span>
                      <span>৳{Number(it.subtotal).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium text-slate-900">৳{Number(receipt.total_amount).toLocaleString()}</span>
              </div>
              {receipt.crm_discount && Number(receipt.crm_discount) > 0 && (
                <div className="flex justify-between">
                  <span>CRM Discount:</span>
                  <span className="text-emerald-600">-৳{Number(receipt.crm_discount).toLocaleString()}</span>
                </div>
              )}
              {receipt.manual_discount && Number(receipt.manual_discount) > 0 && (
                <div className="flex justify-between">
                  <span>Manual Discount:</span>
                  <span className="text-emerald-600">-৳{Number(receipt.manual_discount).toLocaleString()}</span>
                </div>
              )}
              {(!receipt.crm_discount || Number(receipt.crm_discount) === 0) &&
               (!receipt.manual_discount || Number(receipt.manual_discount) === 0) && (
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-৳{Number(receipt.discount || 0).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="font-medium">Total Paid:</span>
                <span className="font-bold text-slate-900">৳{Number(receipt.payable_amount).toLocaleString()}</span>
              </div>
              {receipt.payments && (
                <div className="flex flex-col gap-0.5">
                  {receipt.payments.map((p, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="capitalize">{p.method_display}</span>
                      <span>৳{Number(p.amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setReceipt(null)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs cursor-pointer shadow-sm"
            >
              Start New Sale
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
