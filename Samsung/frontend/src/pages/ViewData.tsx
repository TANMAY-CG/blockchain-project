import { useMemo, useState } from 'react';
import { adminFetchWarrantyEntryById, adminSearchWarrantiesByEmail, type WarrantyRecord } from '../api/snoviaApi';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

type Props = {
  apiBaseURL: string;
};

export function ViewData({ apiBaseURL }: Props) {
  const [email, setEmail] = useState('');
  const [items, setItems] = useState<WarrantyRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openId, setOpenId] = useState<string | null>(null);
  const [openDoc, setOpenDoc] = useState<WarrantyRecord | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const canSearch = useMemo(() => Boolean(normalizeEmail(email)), [email]);

  async function doSearch() {
    setError(null);
    setItems([]);
    setOpenId(null);
    setOpenDoc(null);
    if (!canSearch) return;
    setBusy(true);
    try {
      const data = await adminSearchWarrantiesByEmail(normalizeEmail(email));
      setItems(data);
      if (!data.length) setError('No entries found for this email.');
    } catch {
      setError('Search failed.');
    } finally {
      setBusy(false);
    }
  }

  async function openEntry(warrantyId: string) {
    setError(null);
    setOpenId(warrantyId);
    setOpenDoc(null);
    setBusy(true);
    try {
      const doc = await adminFetchWarrantyEntryById(warrantyId);
      setOpenDoc(doc);
    } catch {
      setError('Failed to open entry.');
    } finally {
      setBusy(false);
    }
  }

  const proofUrl = useMemo(() => {
    const url = openDoc?.purchase?.proofOfPurchase?.url;
    if (!url) return null;
    if (url === 'renewal') return null;
    try {
      return new URL(url, apiBaseURL).toString();
    } catch {
      return url;
    }
  }, [openDoc, apiBaseURL]);

  return (
    <div className="wrap view-data-wrap">
      <div className="card view-data-card">
        <div className="view-data-head">
          <span className="badge">Data Console</span>
          <div className="view-data-title">View Data</div>
          <div className="view-data-sub">
            Search and inspect warranty records stored in MongoDB.
          </div>
          <div className="admin-searchbar view-data-searchbar">
            <input
              className="input"
              placeholder="Enter email id (e.g. user@email.com)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              type="button"
              className={`btn-submit ${canSearch && !busy ? 'active' : ''}`}
              onClick={() => void doSearch()}
              disabled={busy}
              style={{ minWidth: 120, maxWidth: 140 }}
            >
              Search
            </button>
          </div>
          {error ? <div className="status" style={{ marginTop: 12 }}>{error}</div> : null}
        </div>

        <div className="view-data-body">
          <div className="data-grid">
            {items.map((w) => (
              <div key={w.warrantyId} className="data-card">
                <div className="data-card-top">
                  <div className="data-card-title">{w.product?.model ?? ''}</div>
                  <div className="data-card-badges">
                    <span className="pill">{w.eventType}</span>
                    <span className="pill pill-muted">v{w.versionNo}</span>
                  </div>
                </div>
                <div className="data-card-row">
                  <div className="kv">
                    <div className="k">Warranty Root</div>
                    <div className="v">{w.warrantyRootId}</div>
                  </div>
                  <div className="kv">
                    <div className="k">Warranty ID</div>
                    <div className="v">{w.warrantyId}</div>
                  </div>
                </div>
                <div className="data-card-row">
                  <div className="kv">
                    <div className="k">Customer</div>
                    <div className="v">{w.customer?.name ?? ''}</div>
                  </div>
                  <div className="kv">
                    <div className="k">Serial</div>
                    <div className="v">{w.product?.serialNumber ?? ''}</div>
                  </div>
                </div>
                <div className="data-card-row">
                  <div className="kv">
                    <div className="k">Period</div>
                    <div className="v">{w.warranty?.startDate ?? ''} → {w.warranty?.endDate ?? ''}</div>
                  </div>
                </div>
                <div className="data-card-actions">
                  <button
                    type="button"
                    className="btn-submit active"
                    style={{ minWidth: 110 }}
                    onClick={() => void openEntry(w.warrantyId)}
                    disabled={busy}
                  >
                    Open
                  </button>
                </div>
              </div>
            ))}
            {!items.length && !error ? (
              <div className="view-data-empty">
                Enter an email and search to see records.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {openId ? (
        <div className="modal modal-entry" role="dialog" aria-modal="true">
          <div className="modal-card modal-entry-card" style={{ width: 'min(980px, 100%)' }}>
            <div className="modal-head">
              <strong>Warranty Entry</strong>
              <button
                type="button"
                className="success-close-btn"
                aria-label="Close"
                onClick={() => { setOpenId(null); setOpenDoc(null); }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12" stroke="#111" strokeWidth="2" strokeLinecap="round" />
                  <path d="M18 6L6 18" stroke="#111" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="modal-body modal-entry-body">
              {!openDoc ? (
                <div style={{ color: '#6f6f6f', fontWeight: 700 }}>Loading...</div>
              ) : (
                <div className="entry-layout">
                  <div className="entry-section entry-section-strong">
                    <div className="entry-title">Customer</div>
                    <div className="entry-kv"><div className="k">Name</div><div className="v">{openDoc.customer?.name}</div></div>
                    <div className="entry-kv"><div className="k">Email</div><div className="v">{openDoc.customer?.email}</div></div>
                    <div className="entry-kv"><div className="k">Phone</div><div className="v">{openDoc.customer?.phone}</div></div>
                  </div>

                  <div className="entry-section entry-section-strong">
                    <div className="entry-title">Product</div>
                    <div className="entry-kv"><div className="k">Model</div><div className="v">{openDoc.product?.model}</div></div>
                    <div className="entry-kv"><div className="k">Serial</div><div className="v">{openDoc.product?.serialNumber}</div></div>
                    <div className="entry-kv"><div className="k">IMEI</div><div className="v">{openDoc.product?.imei}</div></div>
                    <div className="entry-kv"><div className="k">Product ID</div><div className="v">{openDoc.product?.productId ?? ''}</div></div>
                  </div>

                  <div className="entry-section entry-section-strong">
                    <div className="entry-title">Warranty</div>
                    <div className="entry-kv"><div className="k">Root ID</div><div className="v">{openDoc.warrantyRootId}</div></div>
                    <div className="entry-kv"><div className="k">Warranty ID</div><div className="v">{openDoc.warrantyId}</div></div>
                    <div className="entry-kv"><div className="k">Version</div><div className="v">{openDoc.versionNo}</div></div>
                    <div className="entry-kv"><div className="k">Event</div><div className="v">{openDoc.eventType}</div></div>
                    <div className="entry-kv"><div className="k">Start</div><div className="v">{openDoc.warranty?.startDate}</div></div>
                    <div className="entry-kv"><div className="k">End</div><div className="v">{openDoc.warranty?.endDate}</div></div>
                    <div className="entry-kv"><div className="k">Plan</div><div className="v">{openDoc.warranty?.planType}</div></div>
                    <div className="entry-kv"><div className="k">Notes</div><div className="v">{openDoc.warranty?.notes ?? ''}</div></div>
                  </div>

                  <div className="entry-section entry-section-strong">
                    <div className="entry-title">Purchase</div>
                    <div className="entry-kv"><div className="k">Store</div><div className="v">{openDoc.purchase?.storeLocation ?? ''}</div></div>
                    <div className="entry-kv">
                      <div className="k">Proof filename</div>
                      <div
                        className={`v ${proofUrl ? 'proof-file-link' : ''}`}
                        onDoubleClick={() => {
                          if (proofUrl) setPreviewImageUrl(proofUrl);
                        }}
                        title={proofUrl ? 'Double-click to open proof image' : undefined}
                      >
                        {openDoc.purchase?.proofOfPurchase?.fileName ?? ''}
                      </div>
                    </div>
                    {proofUrl ? (
                      <div className="helper-text" style={{ marginTop: 8 }}>
                        Double-click filename to open proof image.
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {previewImageUrl ? (
        <div className="modal modal-proof-preview" role="dialog" aria-modal="true">
          <div className="modal-card proof-preview-card">
            <div className="modal-head">
              <strong>Proof of Purchase</strong>
              <button
                type="button"
                className="success-close-btn"
                aria-label="Close"
                onClick={() => setPreviewImageUrl(null)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12" stroke="#111" strokeWidth="2" strokeLinecap="round" />
                  <path d="M18 6L6 18" stroke="#111" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="modal-body proof-preview-body">
              <div className="proof-image-stage">
                <div className="proof-image-glow" aria-hidden="true" />
                <img
                  src={previewImageUrl}
                  alt="Proof of purchase full view"
                  className="proof-preview-image"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

