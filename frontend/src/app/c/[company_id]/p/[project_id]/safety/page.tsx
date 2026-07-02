'use client';
import { getApiHost } from '@/lib/api';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

const API = `${getApiHost()}/apis/v3`;

// ─── Types ────────────────────────────────────────────────────────────────────
interface Incident {
  id: string;
  incident_type: string;
  severity: string;
  description: string;
  location?: string;
  injured_person?: string;
  lost_time_days: number;
  status: string;
  root_cause?: string;
  corrective_action?: string;
  reported_by: string;
  reported_at: string;
  closed_at?: string;
}

interface SafetyStats {
  total_incidents: number;
  open_incidents: number;
  closed_incidents: number;
  lti_count: number;
  total_lost_days: number;
  ltif: number;
  type_breakdown: Record<string, number>;
  severity_breakdown: Record<string, number>;
}

interface ToolboxTalk {
  id: string;
  topic: string;
  conducted_by: string;
  conducted_at: string;
  attendee_count: number;
  notes?: string;
}

interface PPECheck {
  id: string;
  checked_by: string;
  check_date: string;
  total_workers: number;
  compliant_workers: number;
  compliance_pct: number;
  non_compliant_items: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const SEVERITY_COLOR: Record<string, string> = {
  Critical: 'rgba(220,38,38,0.15)',
  High:     'rgba(234,88,12,0.15)',
  Medium:   'rgba(202,138,4,0.15)',
  Low:      'rgba(22,163,74,0.15)',
};
const SEVERITY_BORDER: Record<string, string> = {
  Critical: '#dc2626',
  High:     '#ea580c',
  Medium:   '#ca8a04',
  Low:      '#16a34a',
};
const TYPE_COLOR: Record<string, string> = {
  'Near Miss': '#7C5CFF',
  'First Aid': '#0ea5e9',
  LTI:         '#f59e0b',
  Fatal:       '#dc2626',
};

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Donut Chart ─────────────────────────────────────────────────────────────
function DonutGauge({ pct }: { pct: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 90 ? '#16a34a' : pct >= 70 ? '#ca8a04' : '#dc2626';
  return (
    <svg width={140} height={140} viewBox="0 0 140 140">
      <circle cx={70} cy={70} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={16} />
      <circle
        cx={70} cy={70} r={r} fill="none" stroke={color} strokeWidth={16}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 70 70)" style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      <text x={70} y={66} textAnchor="middle" fill="#fff" fontSize={22} fontWeight={700}>{pct}%</text>
      <text x={70} y={84} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={11}>Compliant</text>
    </svg>
  );
}

// ─── Simple Bar ───────────────────────────────────────────────────────────────
function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{label}</span>
        <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{value}</span>
      </div>
      <div style={{ height: 7, borderRadius: 4, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

const MOCK_INCIDENTS: Incident[] = [
  { id: "INC-001", incident_type: "Near Miss", severity: "High", description: "Worker slipped on wet concrete surface near scaffolding on Floor 2. No injury sustained, safety harness prevented fall.", location: "Floor 2 — Grid C-D Scaffolding", injured_person: "", lost_time_days: 0, status: "closed", root_cause: "Inadequate anti-slip matting on wet surface.", corrective_action: "Anti-slip strips installed on all scaffold planks.", reported_by: "Ramesh Kumar (Safety Officer)", reported_at: "2026-06-24T09:15:00Z", closed_at: "2026-06-25T16:00:00Z" },
  { id: "INC-002", incident_type: "First Aid", severity: "Low", description: "Minor hand laceration from steel bar sharp edge during rebar bending. First aid administered. Worker resumed duty after 1 hour.", location: "Rebar Yard — Ground Level", injured_person: "Mohan Lal (Mason Helper)", lost_time_days: 0, status: "closed", root_cause: "No gloves worn during bar bending.", corrective_action: "Mandatory glove check during PPE muster roll.", reported_by: "Ramesh Kumar (Safety Officer)", reported_at: "2026-06-18T11:30:00Z", closed_at: "2026-06-18T16:00:00Z" },
  { id: "INC-003", incident_type: "Near Miss", severity: "Medium", description: "Material lifted by crane swung and came within 1m of another worker. No contact. Crane operator retrained.", location: "Material Hoist — East Face", injured_person: "", lost_time_days: 0, status: "open", root_cause: "", corrective_action: "", reported_by: "Meera Nair (HSE Manager)", reported_at: "2026-07-01T14:00:00Z" },
];

const MOCK_STATS: SafetyStats = {
  total_incidents: 3,
  open_incidents: 1,
  closed_incidents: 2,
  lti_count: 0,
  total_lost_days: 0,
  ltif: 0.0,
  type_breakdown: { "Near Miss": 2, "First Aid": 1 },
  severity_breakdown: { "High": 1, "Medium": 1, "Low": 1 },
};

const MOCK_TOOLBOX_TALKS: ToolboxTalk[] = [
  { id: "TBT-001", topic: "Working at Height — Scaffolding Safety & Harness Use (IS 3696)", conducted_by: "Meera Nair (HSE Manager)", conducted_at: "2026-07-01T07:30:00Z", attendee_count: 28, notes: "Demonstrated correct harness fitting. All workers signed attendance. Photos taken." },
  { id: "TBT-002", topic: "RCC Concrete Pour Safety — Vibrator Handling & Slip Prevention", conducted_by: "Ramesh Kumar (Safety Officer)", conducted_at: "2026-06-28T07:00:00Z", attendee_count: 22, notes: "Covered correct vibrator operation distance and anti-slip precautions on freshly poured slabs." },
];

const MOCK_PPE_CHECKS: PPECheck[] = [
  { id: "PPE-001", checked_by: "Ramesh Kumar (Safety Officer)", check_date: "2026-07-01", total_workers: 35, compliant_workers: 31, compliance_pct: 89, non_compliant_items: ["No safety vest (2 workers)", "Improper helmet fit (2 workers)"] },
  { id: "PPE-002", checked_by: "Meera Nair (HSE Manager)", check_date: "2026-06-28", total_workers: 28, compliant_workers: 26, compliance_pct: 93, non_compliant_items: ["No safety boots (1 worker)", "Missing gloves (1 worker)"] },
];

export default function SafetyPage() {
  const { company_id, project_id } = useParams() as { company_id: string; project_id: string };
  const [tab, setTab] = useState(0);

  // Data
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<SafetyStats | null>(null);
  const [talks, setTalks] = useState<ToolboxTalk[]>([]);
  const [ppeChecks, setPpeChecks] = useState<PPECheck[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState<string | null>(null);
  const [showTalkModal, setShowTalkModal] = useState(false);
  const [showPPEModal, setShowPPEModal] = useState(false);

  // Forms
  const [incidentForm, setIncidentForm] = useState({
    incident_type: 'Near Miss', severity: 'Low', description: '',
    location: '', injured_person: '', lost_time_days: 0, reported_by: '',
    reported_at: new Date().toISOString().slice(0, 16),
  });
  const [closeForm, setCloseForm] = useState({ root_cause: '', corrective_action: '' });
  const [talkForm, setTalkForm] = useState({
    topic: '', conducted_by: '', conducted_at: new Date().toISOString().slice(0, 16),
    attendee_count: 0, notes: '',
  });
  const [ppeForm, setPpeForm] = useState({
    checked_by: '', check_date: new Date().toISOString().slice(0, 10),
    total_workers: 0, compliant_workers: 0, non_compliant_items: '',
  });

  const [msg, setMsg] = useState('');

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  // Fetch all data
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [incR, statsR, talkR, ppeR] = await Promise.all([
        fetch(`${API}/safety/incidents/${project_id}`),
        fetch(`${API}/safety/stats/${project_id}?total_manhours=50000`),
        fetch(`${API}/safety/toolbox-talks/${project_id}`),
        fetch(`${API}/safety/ppe-checks/${project_id}`),
      ]);
      const incData = incR.ok ? await incR.json() : [];
      const statsData = statsR.ok ? await statsR.json() : null;
      const talkData = talkR.ok ? await talkR.json() : [];
      const ppeData = ppeR.ok ? await ppeR.json() : [];
      // Use API data if available, else mock
      setIncidents(incData.length > 0 ? incData : MOCK_INCIDENTS);
      setStats(statsData ?? MOCK_STATS);
      setTalks(talkData.length > 0 ? talkData : MOCK_TOOLBOX_TALKS);
      setPpeChecks(ppeData.length > 0 ? ppeData : MOCK_PPE_CHECKS);
    } catch {
      setIncidents(MOCK_INCIDENTS);
      setStats(MOCK_STATS);
      setTalks(MOCK_TOOLBOX_TALKS);
      setPpeChecks(MOCK_PPE_CHECKS);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [project_id]);

  // Submit incident
  const submitIncident = async () => {
    const r = await fetch(`${API}/safety/incidents`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...incidentForm, project_id }),
    });
    if (r.ok) { flash('Incident reported.'); setShowIncidentModal(false); fetchAll(); }
    else flash(`Error: ${(await r.json()).detail}`);
  };

  // Close incident
  const submitClose = async () => {
    if (!showCloseModal) return;
    const r = await fetch(`${API}/safety/incidents/${showCloseModal}/close`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(closeForm),
    });
    if (r.ok) { flash('Incident closed.'); setShowCloseModal(null); fetchAll(); }
    else flash(`Error: ${(await r.json()).detail}`);
  };

  // Submit toolbox talk
  const submitTalk = async () => {
    const r = await fetch(`${API}/safety/toolbox-talks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...talkForm, project_id }),
    });
    if (r.ok) { flash('Talk logged.'); setShowTalkModal(false); fetchAll(); }
    else flash(`Error: ${(await r.json()).detail}`);
  };

  // Submit PPE check
  const submitPPE = async () => {
    const items = ppeForm.non_compliant_items.split(',').map(s => s.trim()).filter(Boolean);
    const r = await fetch(`${API}/safety/ppe-checks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...ppeForm, project_id, non_compliant_items: items }),
    });
    if (r.ok) { flash('PPE check recorded.'); setShowPPEModal(false); fetchAll(); }
    else flash(`Error: ${(await r.json()).detail}`);
  };

  // Overall compliance %
  const overallPPE = ppeChecks.length > 0
    ? Math.round(ppeChecks.reduce((a, c) => a + c.compliance_pct, 0) / ppeChecks.length)
    : 0;

  // ─── Tabs ──────────────────────────────────────────────────────────────────
  const tabs = ['🚨 Incident Board', '📊 LTIF & Stats', '🗣️ Toolbox Talks', '🦺 PPE Compliance'];

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)',
    color: '#fff', fontSize: 14, boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = { display: 'block', marginBottom: 6, fontSize: 13, color: 'rgba(255,255,255,0.6)' };
  const fieldStyle: React.CSSProperties = { marginBottom: 14 };

  return (
    <div style={{ minHeight: '100vh', background: '#0E0C15', color: '#fff', fontFamily: 'Inter, sans-serif', padding: '32px 40px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(232,24,76,0.15)', border: '1px solid rgba(232,24,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🦺</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>HSE / Safety Management</h1>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>OSHA-aligned incident tracking, toolbox talks & PPE compliance</p>
          </div>
        </div>
      </div>

      {/* Flash */}
      {msg && (
        <div style={{ padding: '10px 18px', borderRadius: 8, background: 'rgba(124,92,255,0.15)', border: '1px solid rgba(124,92,255,0.4)', marginBottom: 20, fontSize: 14 }}>{msg}</div>
      )}

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4 }}>
        {tabs.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            flex: 1, padding: '10px 0', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: tab === i ? 'rgba(232,24,76,0.15)' : 'transparent',
            color: tab === i ? '#E8184C' : 'rgba(255,255,255,0.5)',
            borderBottom: tab === i ? '2px solid #E8184C' : '2px solid transparent',
            transition: 'all 0.2s',
          }}>{t}</button>
        ))}
      </div>

      {/* ─── Tab 0: Incident Board ────────────────────────────────────────── */}
      {tab === 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Incident Board</h2>
            <button onClick={() => setShowIncidentModal(true)} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#E8184C', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Report Incident</button>
          </div>

          {loading ? <p style={{ color: 'rgba(255,255,255,0.4)' }}>Loading…</p> : incidents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🛡️</div>
              <p>No incidents logged. Stay safe!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
              {incidents.map(inc => (
                <div key={inc.id} style={{
                  borderRadius: 14, padding: 20, border: `1px solid ${SEVERITY_BORDER[inc.severity] || '#444'}`,
                  background: SEVERITY_COLOR[inc.severity] || 'rgba(255,255,255,0.04)',
                  position: 'relative', transition: 'transform 0.2s',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: TYPE_COLOR[inc.incident_type] || '#555', color: '#fff', marginRight: 8 }}>{inc.incident_type}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: SEVERITY_COLOR[inc.severity], border: `1px solid ${SEVERITY_BORDER[inc.severity]}`, color: SEVERITY_BORDER[inc.severity] }}>{inc.severity}</span>
                    </div>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: inc.status === 'closed' ? 'rgba(22,163,74,0.15)' : 'rgba(234,88,12,0.15)', color: inc.status === 'closed' ? '#16a34a' : '#ea580c', border: `1px solid ${inc.status === 'closed' ? '#16a34a' : '#ea580c'}`, fontWeight: 600 }}>{inc.status.toUpperCase()}</span>
                  </div>
                  <p style={{ margin: '0 0 8px', fontSize: 14, lineHeight: 1.5, color: 'rgba(255,255,255,0.85)' }}>{inc.description}</p>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
                    {inc.location && <div>📍 {inc.location}</div>}
                    {inc.injured_person && <div>🤕 {inc.injured_person}</div>}
                    {inc.lost_time_days > 0 && <div>⏱️ {inc.lost_time_days} lost day{inc.lost_time_days > 1 ? 's' : ''}</div>}
                    <div>👤 {inc.reported_by} · {fmtDate(inc.reported_at)}</div>
                  </div>
                  {inc.root_cause && (
                    <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                      <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Root Cause: </strong>{inc.root_cause}
                    </div>
                  )}
                  {inc.status !== 'closed' && (
                    <button onClick={() => { setShowCloseModal(inc.id); setCloseForm({ root_cause: '', corrective_action: '' }); }}
                      style={{ marginTop: 12, padding: '7px 16px', borderRadius: 7, border: '1px solid rgba(22,163,74,0.4)', background: 'rgba(22,163,74,0.1)', color: '#16a34a', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      ✓ Close Incident
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Tab 1: LTIF & Stats ──────────────────────────────────────────── */}
      {tab === 1 && (
        <div>
          <h2 style={{ margin: '0 0 20px', fontSize: 17, fontWeight: 600 }}>LTIF & Safety Statistics</h2>
          {!stats ? <p style={{ color: 'rgba(255,255,255,0.4)' }}>Loading…</p> : (
            <>
              {/* KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
                {[
                  { label: 'Total Incidents', value: stats.total_incidents, icon: '🚨', color: '#E8184C' },
                  { label: 'Open', value: stats.open_incidents, icon: '🔴', color: '#ea580c' },
                  { label: 'Closed', value: stats.closed_incidents, icon: '✅', color: '#16a34a' },
                  { label: 'LTI Count', value: stats.lti_count, icon: '🏥', color: '#f59e0b' },
                  { label: 'Lost Days', value: stats.total_lost_days, icon: '📅', color: '#7C5CFF' },
                  { label: 'LTIF Rate', value: stats.ltif, icon: '📈', color: '#0ea5e9' },
                ].map((k, i) => (
                  <div key={i} style={{ padding: '18px 20px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{k.icon}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: k.color }}>{k.value}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>{k.label}</div>
                  </div>
                ))}
              </div>

              {/* Type & Severity Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={{ padding: 20, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>BY INCIDENT TYPE</h3>
                  {Object.entries(stats.type_breakdown).map(([type, count]) => (
                    <MiniBar key={type} label={type} value={count} max={stats.total_incidents} color={TYPE_COLOR[type] || '#7C5CFF'} />
                  ))}
                  {Object.keys(stats.type_breakdown).length === 0 && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>No data yet.</p>}
                </div>
                <div style={{ padding: 20, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>BY SEVERITY</h3>
                  {Object.entries(stats.severity_breakdown).map(([sev, count]) => (
                    <MiniBar key={sev} label={sev} value={count} max={stats.total_incidents} color={SEVERITY_BORDER[sev] || '#7C5CFF'} />
                  ))}
                  {Object.keys(stats.severity_breakdown).length === 0 && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>No data yet.</p>}
                </div>
              </div>

              {/* LTIF Formula */}
              <div style={{ marginTop: 20, padding: '14px 20px', borderRadius: 12, background: 'rgba(124,92,255,0.08)', border: '1px solid rgba(124,92,255,0.2)', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                ℹ️ <strong style={{ color: '#7C5CFF' }}>LTIF Formula:</strong> (Number of LTIs × 200,000) ÷ Total Manhours Worked · Calculated on 50,000 manhours basis.
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── Tab 2: Toolbox Talks ─────────────────────────────────────────── */}
      {tab === 2 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Toolbox Talks</h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{talks.length} session{talks.length !== 1 ? 's' : ''} conducted</p>
            </div>
            <button onClick={() => setShowTalkModal(true)} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#7C5CFF', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Add Talk</button>
          </div>
          {talks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🗣️</div>
              <p>No toolbox talks logged yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {talks.map(t => (
                <div key={t.id} style={{ padding: '16px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(124,92,255,0.15)', border: '1px solid rgba(124,92,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🗣️</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{t.topic}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Conducted by {t.conducted_by} · {fmtDate(t.conducted_at)}</div>
                    {t.notes && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{t.notes}</div>}
                  </div>
                  <div style={{ textAlign: 'center', padding: '10px 18px', borderRadius: 10, background: 'rgba(124,92,255,0.1)', border: '1px solid rgba(124,92,255,0.2)' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#7C5CFF' }}>{t.attendee_count}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Attendees</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Tab 3: PPE Compliance ────────────────────────────────────────── */}
      {tab === 3 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>PPE Compliance</h2>
            <button onClick={() => setShowPPEModal(true)} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#0ea5e9', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Record Check</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, alignItems: 'start' }}>
            {/* Donut */}
            <div style={{ padding: 24, borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
              <DonutGauge pct={overallPPE} />
              <p style={{ margin: '10px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Overall Compliance<br />(average of all checks)</p>
            </div>
            {/* Check list */}
            <div>
              {ppeChecks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🦺</div>
                  <p>No PPE checks recorded yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {ppeChecks.map(c => {
                    const nc_color = c.compliance_pct >= 90 ? '#16a34a' : c.compliance_pct >= 70 ? '#ca8a04' : '#dc2626';
                    return (
                      <div key={c.id} style={{ padding: '16px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>Checked by {c.checked_by}</div>
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{fmtDate(c.check_date)} · {c.total_workers} workers</div>
                          </div>
                          <div style={{ fontSize: 26, fontWeight: 800, color: nc_color }}>{c.compliance_pct}%</div>
                        </div>
                        <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: c.non_compliant_items.length > 0 ? 10 : 0 }}>
                          <div style={{ height: '100%', width: `${c.compliance_pct}%`, background: nc_color, borderRadius: 4, transition: 'width 0.6s ease' }} />
                        </div>
                        {c.non_compliant_items.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {c.non_compliant_items.map((item, i) => (
                              <span key={i} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', color: '#fca5a5' }}>{item}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Report Incident ───────────────────────────────────────── */}
      {showIncidentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#171520', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520, border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 17 }}>Report Safety Incident</h3>
            <div style={fieldStyle}>
              <label style={labelStyle}>Incident Type</label>
              <select value={incidentForm.incident_type} onChange={e => setIncidentForm({ ...incidentForm, incident_type: e.target.value })} style={inputStyle}>
                {['Near Miss', 'First Aid', 'LTI', 'Fatal'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Severity</label>
              <select value={incidentForm.severity} onChange={e => setIncidentForm({ ...incidentForm, severity: e.target.value })} style={inputStyle}>
                {['Low', 'Medium', 'High', 'Critical'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Description *</label>
              <textarea value={incidentForm.description} onChange={e => setIncidentForm({ ...incidentForm, description: e.target.value })} style={{ ...inputStyle, height: 80, resize: 'vertical' }} placeholder="Describe the incident…" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Location</label>
                <input value={incidentForm.location} onChange={e => setIncidentForm({ ...incidentForm, location: e.target.value })} style={inputStyle} placeholder="Block A, 2nd Floor" />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Injured Person</label>
                <input value={incidentForm.injured_person} onChange={e => setIncidentForm({ ...incidentForm, injured_person: e.target.value })} style={inputStyle} placeholder="Name (if any)" />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Lost Time Days</label>
                <input type="number" min={0} value={incidentForm.lost_time_days} onChange={e => setIncidentForm({ ...incidentForm, lost_time_days: +e.target.value })} style={inputStyle} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Reported By *</label>
                <input value={incidentForm.reported_by} onChange={e => setIncidentForm({ ...incidentForm, reported_by: e.target.value })} style={inputStyle} placeholder="Supervisor / HSE Officer" />
              </div>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Date & Time *</label>
              <input type="datetime-local" value={incidentForm.reported_at} onChange={e => setIncidentForm({ ...incidentForm, reported_at: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 6 }}>
              <button onClick={() => setShowIncidentModal(false)} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={submitIncident} style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: '#E8184C', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Report</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Close Incident ────────────────────────────────────────── */}
      {showCloseModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#171520', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 17 }}>Close Incident</h3>
            <div style={fieldStyle}>
              <label style={labelStyle}>Root Cause *</label>
              <textarea value={closeForm.root_cause} onChange={e => setCloseForm({ ...closeForm, root_cause: e.target.value })} style={{ ...inputStyle, height: 80, resize: 'vertical' }} placeholder="Identified root cause of the incident…" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Corrective Action *</label>
              <textarea value={closeForm.corrective_action} onChange={e => setCloseForm({ ...closeForm, corrective_action: e.target.value })} style={{ ...inputStyle, height: 80, resize: 'vertical' }} placeholder="Actions taken to prevent recurrence…" />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCloseModal(null)} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={submitClose} style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Close Incident</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Toolbox Talk ──────────────────────────────────────────── */}
      {showTalkModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#171520', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 17 }}>Log Toolbox Talk</h3>
            <div style={fieldStyle}>
              <label style={labelStyle}>Topic *</label>
              <input value={talkForm.topic} onChange={e => setTalkForm({ ...talkForm, topic: e.target.value })} style={inputStyle} placeholder="e.g. Working at Height — Scaffolding Safety" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Conducted By *</label>
                <input value={talkForm.conducted_by} onChange={e => setTalkForm({ ...talkForm, conducted_by: e.target.value })} style={inputStyle} placeholder="HSE Manager" />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Attendees</label>
                <input type="number" min={0} value={talkForm.attendee_count} onChange={e => setTalkForm({ ...talkForm, attendee_count: +e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Date & Time *</label>
              <input type="datetime-local" value={talkForm.conducted_at} onChange={e => setTalkForm({ ...talkForm, conducted_at: e.target.value })} style={inputStyle} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Notes</label>
              <textarea value={talkForm.notes} onChange={e => setTalkForm({ ...talkForm, notes: e.target.value })} style={{ ...inputStyle, height: 70, resize: 'vertical' }} placeholder="Any additional notes…" />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowTalkModal(false)} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={submitTalk} style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: '#7C5CFF', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Log Talk</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: PPE Check ─────────────────────────────────────────────── */}
      {showPPEModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#171520', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 17 }}>Record PPE Compliance Check</h3>
            <div style={fieldStyle}>
              <label style={labelStyle}>Checked By *</label>
              <input value={ppeForm.checked_by} onChange={e => setPpeForm({ ...ppeForm, checked_by: e.target.value })} style={inputStyle} placeholder="Site Engineer / HSE Officer" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Check Date *</label>
              <input type="date" value={ppeForm.check_date} onChange={e => setPpeForm({ ...ppeForm, check_date: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Total Workers</label>
                <input type="number" min={0} value={ppeForm.total_workers} onChange={e => setPpeForm({ ...ppeForm, total_workers: +e.target.value })} style={inputStyle} />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Compliant Workers</label>
                <input type="number" min={0} value={ppeForm.compliant_workers} onChange={e => setPpeForm({ ...ppeForm, compliant_workers: +e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Non-Compliant Items (comma-separated)</label>
              <input value={ppeForm.non_compliant_items} onChange={e => setPpeForm({ ...ppeForm, non_compliant_items: e.target.value })} style={inputStyle} placeholder="No helmet, No safety vest, No boots" />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowPPEModal(false)} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={submitPPE} style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: '#0ea5e9', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Record</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
