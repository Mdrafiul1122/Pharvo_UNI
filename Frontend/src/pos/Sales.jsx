import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import './pos.css';
import { fetchProducts, fetchCategories } from '../services/medicine';
import { fetchCustomers } from '../services/customer';
import { checkout, checkInteractions, fetchDiscountPreview } from '../services/pos';
import { ApiError } from '../services/api';
import { stockInUnit, unitPriceOf, UNIT_META } from './units';
import CatalogSearch from './components/CatalogSearch';
import CatalogTable from './components/CatalogTable';
import CartPanel from './components/CartPanel';
import { CustomerBar, CustomerModal } from './components/CustomerPicker';
import TotalsCard from './components/TotalsCard';
import PaymentCard from './components/PaymentCard';
import InteractionReviewModal from './components/InteractionReviewModal';
import ReceiptModal from './components/ReceiptModal';

const WALK_IN = { id: null, name: 'Walk-in Customer', phone: '', is_member: false };

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

  // Escape closes any open modal.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setShowCustomerModal(false);
      setPendingInteractions(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

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

  const selectCustomer = (c) => {
    setCustomer(c || WALK_IN);
    setShowCustomerModal(false);
  };

  return (
    <div className="pos-scope pos-workspace-root w-full max-w-[1680px] mx-auto flex flex-col font-sans min-h-[calc(100vh-64px)]" style={{ gap: 16 }}>
      {/* ─── POS HEADER (sticky, 56px) ─── */}
      <div className="pos-header flex flex-wrap items-center gap-2.5 px-4 pt-4">
        <div className="min-w-0 mr-1 flex-shrink-0">
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--pos-ink)", letterSpacing: "-0.01em", lineHeight: 1.2 }}>POS / Sales</h2>
          <p style={{ fontSize: 12, color: "var(--pos-ink-muted)", lineHeight: 1.3, marginTop: 2 }}>Point of sale</p>
        </div>
        <CatalogSearch
          value={searchQuery}
          onChange={setSearchQuery}
          categories={medicineCategories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
      </div>

      {/* ─── WORKSPACE (8-col catalog + 4-col sticky cart) ─── */}
      <div className="pos-workspace-grid grid grid-cols-1 xl:grid-cols-12 gap-4 px-4 pb-4 flex-1 items-start">
        <div className="xl:col-span-8 min-w-0 flex flex-col pos-catalog-col">
          <CatalogTable
            medicines={medicines}
            loading={productsLoading}
            error={productsError}
            countLabel={`${medicines.length} medicines shown`}
            onAdd={addToCart}
          />
        </div>

        <div className="xl:col-span-4 flex flex-col min-w-0 pos-right-col scrollbar-thin" style={{ gap: 12 }}>
          <CartPanel
            cart={cart}
            heldSale={heldSale}
            interactionWarnings={interactionWarnings}
            onQty={updateQty}
            onRemove={removeFromCart}
            onClear={clearCart}
            onResumeHeld={resumeHeldSale}
            onDismissHeld={() => setHeldSale(null)}
            onReviewInteractions={() => setPendingInteractions(interactionWarnings)}
          />
          <CustomerBar
            customer={customer}
            onOpen={() => setShowCustomerModal(true)}
            onClear={() => setCustomer(WALK_IN)}
          />
          <TotalsCard
            totalItemCount={totalItemCount}
            subtotal={subtotal}
            crmDiscount={crmDiscount}
            crmRate={crmRate}
            crmBreakdown={crmBreakdown}
            crmCustomerName={customer.id !== null ? customer.name : ""}
            discount={discount}
            onDiscountChange={setDiscount}
            manualDiscountAmount={manualDiscountAmount}
            grandTotal={grandTotal}
          />
          <PaymentCard
            payMethod={payMethod}
            onPayMethod={setPayMethod}
            cashReceived={cashReceived}
            onCashReceived={setCashReceived}
            digitalReceived={digitalReceived}
            onDigitalReceived={setDigitalReceived}
            grandTotal={grandTotal}
            checkoutError={checkoutError}
            cartEmpty={cart.length === 0}
            checkingOut={checkingOut}
            onHold={handleHoldSale}
            onClear={clearCart}
            onComplete={handleCompleteSale}
          />
        </div>
      </div>

      <CustomerModal
        open={showCustomerModal}
        customer={customer}
        customers={filteredCustomers}
        customerSearch={customerSearch}
        onSearch={setCustomerSearch}
        onSelect={selectCustomer}
        onClose={() => setShowCustomerModal(false)}
        onClear={() => selectCustomer(null)}
      />
      <InteractionReviewModal
        warnings={pendingInteractions}
        checkingOut={checkingOut}
        onConfirm={() => { setPendingInteractions(null); doCheckout(false, true); }}
        onClose={() => setPendingInteractions(null)}
      />
      <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}

export default SalesModule;
