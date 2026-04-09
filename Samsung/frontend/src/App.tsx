import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import axios from 'axios';
import './App.css';
import { BarcodeScanner } from './components/BarcodeScanner';
import { DatePicker } from './components/DatePicker';
import { fetchProductById, fetchWarrantyById, registerWarranty, renewWarranty, uploadProofOfPurchase, type Product, type ProofUploadResponse, type RegisterWarrantyPayload, type WarrantyRecord } from './api/snoviaApi';
import { AdminGate } from './pages/AdminGate';
import { ViewData } from './pages/ViewData';
const placeholderProductImageSrc =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22230%22 height=%22160%22 viewBox=%220 0 230 160%22%3E%3Crect x=%220%22 y=%220%22 width=%22230%22 height=%22160%22 rx=%2212%22 fill=%22%23f2f2f2%22 stroke=%22%23e1e1e1%22/%3E%3Cpath d=%22M70 100 L90 80 L110 100 L130 85 L160 100%22 fill=%22none%22 stroke=%22%23999%22 stroke-width=%223%22 stroke-linecap=%22round%22 stroke-linejoin=%22round/%3E%3Ctext x=%2250%25%22 y=%2278%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22Arial%22 font-size=%2218%22 fill=%22%23b0b0b0%22%3ENo%20Product%3C/text%3E%3C/svg%3E';

type WarrantyType = 'Classic 1-Year' | 'Extended - 3 Years';
type RenewalScope = 'Smart Screen Care' | 'Smart Battery Care' | 'Smart Full Device Care';
type RenewalTerm = 'Renew 1-Year' | 'Renew 2-Years';

type FormState = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  storeLocation: string;
  purchaseDate: string;
  startDate: string;
  endDate: string;
  warrantyType: WarrantyType;
  notes: string;
};

type RenewalFormState = {
  warrantyId: string;
  renewalScope: RenewalScope;
  renewalTerm: RenewalTerm;
  startDate: string;
  endDate: string;
  notes: string;
};

type RenewalConfirmState = {
  warrantyId: string;
  startDate: string;
  endDate: string;
};

function toIsoDate(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function addYearsISO(startDateISO: string, years: number) {
  const d = new Date(startDateISO);
  const y = d.getFullYear() + years;
  const m = d.getMonth();
  const day = d.getDate();
  const candidate = new Date(y, m, day);
  // handle Feb 29 -> Feb 28/Mar 1; keep last day-of-month semantics
  if (candidate.getMonth() !== m) {
    // roll back to last day of previous month
    return new Date(y, m + 1, 0).toISOString().slice(0, 10);
  }
  return candidate.toISOString().slice(0, 10);
}

function App() {
  const [productId, setProductId] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [proof, setProof] = useState<ProofUploadResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [imgFallback, setImgFallback] = useState(false);
  const notesRef = useRef<HTMLTextAreaElement | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successWarrantyId, setSuccessWarrantyId] = useState('');
  const [successWarrantyRootId, setSuccessWarrantyRootId] = useState('');
  const [successVersionNo, setSuccessVersionNo] = useState<number | null>(null);
  const [successTitle, setSuccessTitle] = useState('warranty registered successfully');
  const [renewConfirmOpen, setRenewConfirmOpen] = useState(false);
  const [renewConfirmData, setRenewConfirmData] = useState<RenewalConfirmState | null>(null);

  type Route = 'register' | 'renew';
  const [route, setRoute] = useState<Route>(() =>
    window.location.pathname.startsWith('/renew') ? 'renew' : 'register'
  );

  type Page = 'admin-gate' | 'workspace';
  const [page, setPage] = useState<Page>(() => (window.location.pathname.startsWith('/admin-gate') ? 'admin-gate' : 'workspace'));
  const [isAuthed, setIsAuthed] = useState<boolean>(() => window.localStorage.getItem('snovia_admin_authed') === '1');
  type WorkspaceTab = 'register' | 'renew' | 'view';
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>(() =>
    window.location.pathname.startsWith('/renew') ? 'renew' : window.location.pathname.startsWith('/view-data') ? 'view' : 'register'
  );

  const [form, setForm] = useState<FormState>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    storeLocation: '',
    purchaseDate: '',
    startDate: '',
    endDate: '',
    warrantyType: 'Classic 1-Year',
    notes: '',
  });
  const [renewForm, setRenewForm] = useState<RenewalFormState>({
    warrantyId: '',
    renewalScope: 'Smart Screen Care',
    renewalTerm: 'Renew 1-Year',
    startDate: '',
    endDate: '',
    notes: '',
  });
  const [renewSource, setRenewSource] = useState<WarrantyRecord | null>(null);

  const productImageSrc =
    product && product.model && !imgFallback
      ? `/product-images/${encodeURIComponent(product.model)}.jpg`
      : placeholderProductImageSrc;

  useEffect(() => {
    setImgFallback(false);
  }, [product?.productId]);

  useEffect(() => {
    const onPop = () => {
      const p = window.location.pathname;
      setPage(p.startsWith('/admin-gate') ? 'admin-gate' : 'workspace');
      setWorkspaceTab(p.startsWith('/renew') ? 'renew' : p.startsWith('/view-data') ? 'view' : 'register');
      setRoute(p.startsWith('/renew') ? 'renew' : 'register');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const canSubmit = useMemo(() => {
    const customerOk = form.customerName.trim() && form.customerPhone.trim() && isEmailValid(form.customerEmail);
    const productOk = Boolean(productId.trim() && product);
    const warrantyOk = form.purchaseDate && form.startDate && form.endDate;
    return Boolean(customerOk && productOk && warrantyOk);
  }, [form, product, productId]);

  const canSubmitRenew = useMemo(() => {
    const renewalOk = renewForm.warrantyId.trim();
    return Boolean(renewSource && renewalOk);
  }, [renewForm, renewSource]);

  // Auto-resize the Notes textarea as user types (no internal scroll).
  useEffect(() => {
    const el = notesRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [form.notes, renewForm.notes, route]);

  function goRegister() {
    window.history.pushState({}, '', '/');
    setRoute('register');
    setWorkspaceTab('register');
  }

  function goRenew() {
    window.history.pushState({}, '', '/renew');
    setRoute('renew');
    setWorkspaceTab('renew');
  }

  function goView() {
    window.history.pushState({}, '', '/view-data');
    setWorkspaceTab('view');
  }

  function goAdminGate() {
    window.history.pushState({}, '', '/admin-gate');
    setPage('admin-gate');
  }

  function onAuthed() {
    window.localStorage.setItem('snovia_admin_authed', '1');
    setIsAuthed(true);
    window.history.pushState({}, '', '/');
    setPage('workspace');
    setWorkspaceTab('register');
    setRoute('register');
  }

  const apiBaseURL =
    import.meta.env.VITE_API_BASE_URL ?? 'https://blockchain-project-1-afql.onrender.com';

  useEffect(() => {
    if (!isAuthed && page !== 'admin-gate') {
      goAdminGate();
    }
  }, [isAuthed, page]);

  function isPhoneValid(phone: string) {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 8;
  }

  function isEmailValid(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  function getSubmitValidationError() {
    if (!form.customerName.trim()) return 'Customer Name is required';
    if (!isPhoneValid(form.customerPhone)) return 'Invalid phone number';
    if (!form.customerEmail.trim()) return 'Email Address is required';
    if (!isEmailValid(form.customerEmail)) return 'Invalid email address';
    if (!productId.trim() || !product) return 'Product not selected';

    if (!form.purchaseDate) return 'Date of Purchase is required';
    if (!proof) return 'Proof of Purchase is required';
    if (!form.startDate) return 'Warranty Start Date is required';
    if (!form.endDate) return 'Warranty Expiration Date is required';

    return null;
  }

  function getRenewSubmitValidationError() {
    if (!renewForm.warrantyId.trim()) return 'Warranty ID is required';
    if (!renewSource) return 'Warranty record not found';
    return null;
  }

  async function lookupWarrantyById(id: string) {
    setStatus(null);
    setIsBusy(true);
    try {
      const normalized = id.trim().toUpperCase();
      const data = await fetchWarrantyById(normalized);
      setRenewSource(data);
      setRenewForm((p) => ({ ...p, warrantyId: normalized }));
      setProduct({
        productId: data.product.productId ?? '',
        model: data.product.model,
        serialNumber: data.product.serialNumber,
        imei: data.product.imei,
      });
      setProductId(data.product.productId ?? '');
    } catch {
      setRenewSource(null);
      setProduct(null);
      setProductId('');
      setStatus('Invalid warranty ID entered');
    } finally {
      setIsBusy(false);
    }
  }

  async function lookupProduct(id: string) {
    setStatus(null);
    setIsBusy(true);
    try {
      const productId = id.trim();
      console.log('Fetching product:', productId);
      const p = await fetchProductById(productId.trim());
      setProduct(p);
      setProductId(productId);
      // Success message intentionally not shown; only show loud errors.
      setStatus(null);
    } catch {
      setProduct(null);
      setStatus('invalid product ID entered');
    } finally {
      setIsBusy(false);
    }
  }

  function resetProductFields() {
    setProduct(null);
    setProductId('');
    setStatus(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (isBusy) return;

    const err = getSubmitValidationError();
    if (err) {
      setStatus(err);
      return;
    }

    setIsBusy(true);
    try {
      const planType: RegisterWarrantyPayload['warranty']['planType'] =
        form.warrantyType === 'Classic 1-Year' ? 'STANDARD' : 'EXTENDED';

      const payload: RegisterWarrantyPayload = {
        customer: {
          name: form.customerName.trim(),
          phone: form.customerPhone.trim(),
          email: form.customerEmail.trim(),
        },
        product: {
          productId: productId.trim() || undefined,
          model: product?.model ?? '',
          serialNumber: product?.serialNumber ?? '',
          imei: product?.imei ?? '',
        },
        purchase: {
          storeLocation: form.storeLocation.trim() || undefined,
          proofOfPurchase: proof ?? undefined,
        },
        warranty: {
          purchaseDate: toIsoDate(form.purchaseDate),
          startDate: toIsoDate(form.startDate),
          endDate: toIsoDate(form.endDate),
          planType,
          notes: form.notes.trim() || undefined,
        },
      };

      console.log('[onSubmit] before registerWarranty', new Date().toISOString());

      const res = await registerWarranty(payload);

      // Show success popup (no red status box)
      setSuccessTitle('warranty registered successfully');
      setSuccessWarrantyId(res.id);
      setSuccessWarrantyRootId(res.warrantyRootId);
      setSuccessVersionNo(res.versionNo);
      setSuccessOpen(true);
      setStatus(null);

      // Clear the form immediately for the next entry
      resetProductFields();
      setProof(null);
      setScannerOpen(false);
      setForm({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        storeLocation: '',
        purchaseDate: '',
        startDate: '',
        endDate: '',
        warrantyType: 'Classic 1-Year',
        notes: '',
      });
    } catch {
      setStatus('Failed to register warranty.');
    } finally {
      setIsBusy(false);
    }
  }

  async function onRenewSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (isBusy) return;

    const err = getRenewSubmitValidationError();
    if (err) {
      setStatus(err);
      return;
    }

    await submitRenewal(false);
  }

  async function submitRenewal(forceExtend: boolean) {
    setIsBusy(true);
    try {
      const years: 1 | 2 = renewForm.renewalTerm === 'Renew 1-Year' ? 1 : 2;
      const res = await renewWarranty({
        warrantyId: renewForm.warrantyId.trim(),
        renewalTermYears: years,
        renewalScope: renewForm.renewalScope,
        notes: renewForm.notes.trim() || undefined,
        forceExtend,
      });

      setRenewConfirmOpen(false);
      setRenewConfirmData(null);
      setSuccessTitle('warranty renewed successfully');
      setSuccessWarrantyId(res.id);
      setSuccessWarrantyRootId(res.warrantyRootId);
      setSuccessVersionNo(res.versionNo);
      setSuccessOpen(true);
      setStatus(null);

      resetProductFields();
      setRenewForm({
        warrantyId: '',
        renewalScope: 'Smart Screen Care',
        renewalTerm: 'Renew 1-Year',
        startDate: '',
        endDate: '',
        notes: '',
      });
      setRenewSource(null);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409 && error.response.data?.needsConfirmation) {
        const active = error.response.data.activeWarranty as RenewalConfirmState;
        setRenewConfirmData(active);
        setRenewConfirmOpen(true);
        setStatus(null);
      } else {
        setStatus('Failed to renew warranty.');
      }
    } finally {
      setIsBusy(false);
    }
  }

  async function onPickFile(file: File) {
    setStatus(null);
    setIsBusy(true);
    try {
      const uploaded = await uploadProofOfPurchase(file);
      setProof(uploaded);
      // Success message intentionally not shown; only show loud errors.
      setStatus(null);
    } catch {
      setStatus('Upload failed. Please upload an image file (JPG/PNG).');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className={`page ${page === 'admin-gate' || !isAuthed ? 'page-auth' : ''}`}>
      <div className="topbar">
        <div className="brand">SNOVIA</div>
        {page === 'workspace' && isAuthed ? (
          <div className="topnav" role="navigation" aria-label="Warranty navigation">
            <button
              type="button"
              className={`topnav-item ${workspaceTab === 'register' ? 'active' : ''}`}
              onClick={goRegister}
            >
              Register Warranty
            </button>
            <button
              type="button"
              className={`topnav-item ${workspaceTab === 'renew' ? 'active' : ''}`}
              onClick={goRenew}
            >
              Renew Warranty
            </button>
            <button
              type="button"
              className={`topnav-item ${workspaceTab === 'view' ? 'active' : ''}`}
              onClick={goView}
            >
              View Data
            </button>
          </div>
        ) : (
          <div />
        )}
        <div className="topbar-right">
          {isAuthed ? (
            <button
              type="button"
              className="btn-logout"
              onClick={() => {
                window.localStorage.removeItem('snovia_admin_authed');
                setIsAuthed(false);
                setPage('admin-gate');
                window.history.pushState({}, '', '/admin-gate');
              }}
            >
              Logout
            </button>
          ) : null}
        </div>
      </div>

      {page === 'admin-gate' || !isAuthed ? (
        <AdminGate onAuthed={onAuthed} />
      ) : workspaceTab === 'view' ? (
        <ViewData apiBaseURL={apiBaseURL} />
      ) : route === 'renew' ? (
        <div className="wrap">
          <div className="card">
            <form onSubmit={onRenewSubmit}>
              <div className="card-grid">
                <aside className="left">
                  <div
                    className="product-hero"
                  >
                    <img
                      src={productImageSrc}
                      alt=""
                      onError={() => setImgFallback(true)}
                    />
                    <div className="product-title">{product?.model ?? ''}</div>
                  </div>

                  <div className="left-section">
                    <h3>Product Details</h3>
                    <div className="field">
                      <label>Enter Warranty Root ID (or Warranty ID)</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          className="input"
                          value={renewForm.warrantyId}
                          placeholder="WROOT-12345678"
                          onChange={(e) => {
                            const next = e.target.value;
                            setRenewForm((p) => ({ ...p, warrantyId: next }));
                            setRenewSource(null);
                            setRenewConfirmOpen(false);
                            setRenewConfirmData(null);
                            setProduct(null);
                            setProductId('');
                            setStatus(null);
                          }}
                          onBlur={() => {
                            const id = renewForm.warrantyId.trim();
                            if (id) void lookupWarrantyById(id);
                          }}
                        />
                        <button
                          type="button"
                          className="btn-submit"
                          style={{ minWidth: 70, height: 34, padding: '0 12px' }}
                          onClick={() => {
                            if (renewForm.warrantyId.trim()) void lookupWarrantyById(renewForm.warrantyId);
                          }}
                        >
                          Fetch
                        </button>
                      </div>
                    </div>
                    <div className="field">
                      <label>Model:</label>
                      <input className="input" value={product?.model ?? ''} readOnly />
                    </div>
                    <div className="field">
                      <label>Serial Number:</label>
                      <input className="input" value={product?.serialNumber ?? ''} readOnly />
                    </div>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label>IMEI Number:</label>
                      <input className="input" value={product?.imei ?? ''} readOnly />
                    </div>
                  </div>
                </aside>

                <main className="right">
                  <div className="two-cols">
                    <section>
                      <div className="section-title">Customer Information</div>
                      <div className="row">
                        <input className="input" placeholder="Customer Name:" value={renewSource?.customer.name ?? ''} readOnly />
                        <input className="input" placeholder="Contact Number:" value={renewSource?.customer.phone ?? ''} readOnly />
                        <input
                          className="input"
                          type="email"
                          placeholder="Enter customer email"
                          value={renewSource?.customer.email ?? ''}
                          readOnly
                        />
                      </div>
                    </section>

                    <section>
                      <div className="section-title">Smart Renewal Scope</div>
                      <div className="row">
                        <select
                          className="select"
                          value={renewForm.renewalScope}
                          onChange={(e) => setRenewForm((p) => ({ ...p, renewalScope: e.target.value as RenewalScope }))}
                        >
                          <option value="Smart Screen Care">Smart Screen Care</option>
                          <option value="Smart Battery Care">Smart Battery Care</option>
                          <option value="Smart Full Device Care">Smart Full Device Care</option>
                        </select>
                        <select
                          className="select"
                          value={renewForm.renewalTerm}
                          onChange={(e) => {
                            const term = e.target.value as RenewalTerm;
                            setRenewForm((p) => ({ ...p, renewalTerm: term }));
                          }}
                        >
                          <option value="Renew 1-Year">Renew 1-Year</option>
                          <option value="Renew 2-Years">Renew 2-Years</option>
                        </select>
                      </div>
                    </section>

                    <section className="wide period">
                      <div className="section-title">Renewal Period</div>
                      <div className="period-grid" style={{ marginTop: 10 }}>
                        <input
                          className="input"
                          placeholder="Renewal Start Date (auto)"
                          value={renewConfirmData ? `After ${renewConfirmData.endDate}` : 'Auto-calculated on renewal'}
                          readOnly
                        />
                        <input
                          className="input"
                          placeholder="Renewal Expiration Date (auto)"
                          value={renewConfirmData ? 'Based on selected renewal term' : 'Auto-calculated on renewal'}
                          readOnly
                        />
                      </div>
                    </section>

                    <section className="wide notes">
                      <div className="section-title">Notes</div>
                      <textarea
                        ref={notesRef}
                        className="textarea"
                        value={renewForm.notes}
                        onChange={(e) => setRenewForm((p) => ({ ...p, notes: e.target.value }))}
                      />
                      {status ? <div className="status">{status}</div> : null}
                    </section>
                  </div>
                </main>
              </div>

              <div className="footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => {
                    setStatus(null);
                    setIsBusy(false);
                    resetProductFields();
                    setRenewForm({
                      warrantyId: '',
                      renewalScope: 'Smart Screen Care',
                      renewalTerm: 'Renew 1-Year',
                      startDate: '',
                      endDate: '',
                      notes: '',
                    });
                    setRenewSource(null);
                    setRenewConfirmOpen(false);
                    setRenewConfirmData(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className={`btn-submit ${canSubmitRenew && !isBusy ? 'active' : ''}`}
                  type="submit"
                  disabled={isBusy}
                >
                  Submit Renewal
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="wrap">
          <div className="card">
          <form onSubmit={onSubmit}>
            <div className="card-grid">
              <aside className="left">
                <div
                  className="product-hero"
                  role="button"
                  tabIndex={0}
                  onClick={() => setScannerOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setScannerOpen(true);
                  }}
                >
                  <img
                    src={productImageSrc}
                    alt=""
                    onError={() => setImgFallback(true)}
                  />
                  <div className="product-title">{product?.model ?? ''}</div>
                </div>

                <div className="left-section">
                  <h3>Product Details</h3>
                  <div className="field">
                    <label>Enter Product ID or Scan Barcode</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        className="input"
                        value={productId}
                        placeholder="P001"
                        onChange={(e) => {
                          const raw = e.target.value;
                          const next = raw;
                          setProductId(next);
                          setProduct(null);
                          setStatus(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void lookupProduct(productId);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn-submit"
                        style={{ minWidth: 70, height: 34, padding: '0 12px' }}
                        onClick={() => void lookupProduct(productId)}
                      >
                        Scan
                      </button>
                    </div>
                  </div>
                  <div className="field">
                    <label>Model:</label>
                    <input className="input" value={product?.model ?? ''} readOnly />
                  </div>
                  <div className="field">
                    <label>Serial Number:</label>
                    <input className="input" value={product?.serialNumber ?? ''} readOnly />
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>IMEI Number:</label>
                    <input className="input" value={product?.imei ?? ''} readOnly />
                  </div>
                </div>
              </aside>

              <main className="right">
                <div className="two-cols">
                  <section>
                    <div className="section-title">Customer Information</div>
                    <div className="row">
                      <input className="input" placeholder="Customer Name:" value={form.customerName} onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))} />
                      <input className="input" placeholder="Contact Number:" value={form.customerPhone} onChange={(e) => setForm((p) => ({ ...p, customerPhone: e.target.value }))} />
                      <input
                        className="input"
                        type="email"
                        placeholder="Enter customer email"
                        value={form.customerEmail}
                        onChange={(e) => setForm((p) => ({ ...p, customerEmail: e.target.value }))}
                      />
                    </div>
                  </section>

                  <section>
                    <div className="section-title">Purchase Details</div>
                    <div className="row">
                      <input className="input" placeholder="Store Location:" value={form.storeLocation} onChange={(e) => setForm((p) => ({ ...p, storeLocation: e.target.value }))} />
                      <DatePicker
                        value={form.purchaseDate}
                        placeholder="Date of Purchase"
                        onChange={(iso) => setForm((p) => ({ ...p, purchaseDate: iso }))}
                      />

                      <div className="purchase-proof">
                        <input className="input" placeholder="Proof of Purchase:" readOnly value={proof?.fileName ?? ''} />
                        <button
                          className="upload-btn"
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isBusy}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M12 16V4" stroke="#111" strokeWidth="2" strokeLinecap="round" />
                            <path d="M8 8l4-4 4 4" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M4 20h16" stroke="#111" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                          <span>Upload</span>
                        </button>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void onPickFile(f);
                          e.currentTarget.value = '';
                        }}
                      />
                    </div>
                  </section>

                  <section className="wide period">
                    <div className="section-title">Warranty Period</div>
                    <select
                      className="select"
                      value={form.warrantyType}
                      onChange={(e) => {
                        const wt = e.target.value as WarrantyType;
                        setForm((p) => {
                          const years = wt === 'Classic 1-Year' ? 1 : 3;
                          const end = p.startDate ? addYearsISO(p.startDate, years) : '';
                          return { ...p, warrantyType: wt, endDate: end };
                        });
                      }}
                    >
                      <option value="Classic 1-Year">Classic 1-Year</option>
                      <option value="Extended - 3 Years">Extended - 3 Years</option>
                    </select>

                    <div className="period-grid" style={{ marginTop: 10 }}>
                      <DatePicker
                        value={form.startDate}
                        placeholder="Warranty Start Date"
                        onChange={(start) => {
                          setForm((p) => {
                            const years = p.warrantyType === 'Classic 1-Year' ? 1 : 3;
                            const end = start ? addYearsISO(start, years) : '';
                            return { ...p, startDate: start, endDate: end };
                          });
                        }}
                      />
                      <input
                        className="input"
                        placeholder="Warranty Expiration Date"
                        value={form.endDate}
                        readOnly
                      />
                    </div>
                  </section>

                  <section className="wide notes">
                    <div className="section-title">Notes</div>
                    <textarea
                      ref={notesRef}
                      className="textarea"
                      value={form.notes}
                      onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    />
                    {status ? <div className="status">{status}</div> : null}
                  </section>
                </div>
              </main>
            </div>

            <div className="footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  setStatus(null);
                  setIsBusy(false);
                  resetProductFields();
                  setProof(null);
                  setForm({
                    customerName: '',
                    customerPhone: '',
                    customerEmail: '',
                    storeLocation: '',
                    purchaseDate: '',
                    startDate: '',
                    endDate: '',
                    warrantyType: 'Classic 1-Year',
                    notes: '',
                  });
                }}
              >
                Cancel
              </button>
              <button
                className={`btn-submit ${canSubmit && !isBusy ? 'active' : ''}`}
                type="submit"
                disabled={isBusy}
              >
                Submit Warranty
              </button>
            </div>
          </form>
          </div>
        </div>
      )}

      {route === 'register' && scannerOpen ? (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-head">
              <strong>Scan Product Barcode</strong>
              <button className="btn-cancel" type="button" onClick={() => setScannerOpen(false)}>
                Cancel
              </button>
            </div>
            <div className="modal-body">
              <BarcodeScanner
                onDetected={(id) => {
                  setProductId(id);
                  void lookupProduct(id);
                  setScannerOpen(false);
                }}
              />
              <div className="modal-actions">
                <input
                  className="input"
                  placeholder="Enter Product ID (e.g. P001)"
                  value={productId}
                  onChange={(e) => {
                    const next = e.target.value;
                    setProductId(next);
                    setProduct(null);
                    setStatus(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void lookupProduct(productId);
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn-submit modal-action-primary"
                  disabled={!productId.trim() || isBusy}
                  onClick={() => {
                    void lookupProduct(productId);
                    setScannerOpen(false);
                  }}
                >
                  Use productId
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {route === 'renew' && renewConfirmOpen ? (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-head">
              <strong>Active Warranty Found</strong>
            </div>
            <div className="modal-body">
              <div className="success-modal-line" style={{ marginBottom: 8 }}>
                There is an active warranty for this email + serial number.
              </div>
              <div className="success-modal-line" style={{ marginBottom: 4 }}>
                Active Warranty ID: <b>{renewConfirmData?.warrantyId ?? ''}</b>
              </div>
              <div className="success-modal-line" style={{ marginBottom: 14 }}>
                Current Period: <b>{renewConfirmData?.startDate ?? ''}</b> to <b>{renewConfirmData?.endDate ?? ''}</b>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-submit modal-action-primary"
                  onClick={() => {
                    void submitRenewal(true);
                  }}
                  disabled={isBusy}
                >
                  Yes, renew and extend
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => {
                    setRenewConfirmOpen(false);
                    setRenewConfirmData(null);
                  }}
                >
                  No
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {successOpen ? (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal-card success-modal-card">
            <div className="success-modal-head">
              <div className="success-modal-title">{successTitle}</div>
              <button
                type="button"
                className="success-close-btn"
                aria-label="Close"
                onClick={() => setSuccessOpen(false)}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12" stroke="#111" strokeWidth="2" strokeLinecap="round" />
                  <path d="M18 6L6 18" stroke="#111" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="success-modal-body">
              <div className="success-modal-line">
                Warranty ID: <b>{successWarrantyId}</b>
              </div>
              <div className="success-modal-line" style={{ marginTop: 8 }}>
                Warranty Root ID: <b>{successWarrantyRootId}</b>
              </div>
              <div className="success-modal-line" style={{ marginTop: 8 }}>
                Version: <b>{successVersionNo ?? ''}</b>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
