import re

filepath = r"c:\Users\Dell\Github\Construction-Management-ERP-Software\frontend\src\app\c\[company_id]\p\[project_id]\finance\page.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Add Yash Desai transaction to INITIAL_TRANSACTIONS
target_initial_txns = "const INITIAL_TRANSACTIONS: Transaction[] = ["
replacement_initial_txns = """const INITIAL_TRANSACTIONS: Transaction[] = [
  { 
    id: "TXN-00", 
    date: "2026-07-02", 
    type: "Receipt", 
    category: "Salary Advance", 
    description: "Opening Balance Advance Paid", 
    amount: 8000, 
    party: "Yash Desai", 
    ref: "OP-BAL-001", 
    ledger: "Loans & Advances",
    status: "Approved",
    cost_code: "6.1 Staff Salary",
    settled_amount: 8000,
    balance_due: 8000
  },"""
code = code.replace(target_initial_txns, replacement_initial_txns)


# 2. Add new states for party master-detail panel & side-drawer
target_states = '  // Search & Filters\n  const [searchQuery, setSearchQuery] = useState("");'
replacement_states = """  // Search & Filters\n  const [searchQuery, setSearchQuery] = useState("");

  // Party Master-Detail & Side-drawer States
  const [selectedParty, setSelectedParty] = useState<string>("Yash Desai");
  const [showOpeningBalanceDrawer, setShowOpeningBalanceDrawer] = useState(false);
  const [openingBalanceType, setOpeningBalanceType] = useState<"pay" | "receive">("pay");
  const [openingBalanceAmt, setOpeningBalanceAmt] = useState("8000");
  const [partySearchQuery, setPartySearchQuery] = useState("");
  const [partyFilter, setPartyFilter] = useState("Active");"""
code = code.replace(target_states, replacement_states)


# 3. Replace the simple grid layout of the party tab with the master-detail split screen layout
target_party_tab = """          {/* ── PARTY LEDGERS TAB ── */}
          {tab === "party" && (
            <div className="space-y-4">
              <div className="text-xs text-muted">Party-wise running ledgers and outstanding balances.</div>
              <div className="grid gap-3 sm:grid-cols-2">
                {partyLedgers.map(p => (
                  <div key={p.party} className="bg-input border border-border-custom rounded-md p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xs font-bold text-white">{p.party}</h3>
                        <span className="text-[9px] text-muted">{p.txns.length} transactions</span>
                      </div>
                      <span className={`text-[10px] font-extrabold font-mono ${p.total_credit >= p.total_debit ? "text-emerald-400" : "text-red-400"}`}>
                        Net Due: ₹{p.net_due.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 bg-black/20 p-2.5 rounded-lg text-[10px] font-mono text-muted">
                      <div>Debits: <span className="text-red-400">₹{p.total_debit.toLocaleString("en-IN")}</span></div>
                      <div>Credits: <span className="text-emerald-400">₹{p.total_credit.toLocaleString("en-IN")}</span></div>
                    </div>
                    <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                      {p.txns.map(t => (
                        <div key={t.id} className="flex justify-between items-center text-[9px] text-muted">
                          <span>{t.date} · {t.ref}</span>
                          <span className={t.type === "Receipt" || t.type === "Credit Note" ? "text-emerald-400" : "text-red-400"}>
                            ₹{t.amount.toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}"""

replacement_party_tab = """          {/* ── PARTY LEDGERS TAB (MASTER-DETAIL SPLIT LAYOUT) ── */}
          {tab === "party" && (
            <div className="space-y-6 relative h-full flex flex-col">
              {/* Four Cards Metrics Summary Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Advance Paid */}
                <div className="bg-card border border-border-custom rounded-lg p-4 flex items-center justify-between shadow-sm relative overflow-hidden">
                  <div className="space-y-1 z-10">
                    <span className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-wider block">Advance Paid</span>
                    <strong className="text-xl font-extrabold text-foreground tracking-tight block">
                      ₹{openingBalanceType === "pay" ? parseInt(openingBalanceAmt).toLocaleString("en-IN") : "0"}
                    </strong>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 z-10">
                    ↗
                  </div>
                </div>

                {/* To Pay */}
                <div className="bg-card border border-border-custom rounded-lg p-4 flex items-center justify-between shadow-sm relative overflow-hidden">
                  <div className="space-y-1 z-10">
                    <span className="text-[10px] font-bold text-red-400/80 uppercase tracking-wider block">To Pay</span>
                    <strong className="text-xl font-extrabold text-foreground tracking-tight block">
                      ₹{openingBalanceType === "receive" ? parseInt(openingBalanceAmt).toLocaleString("en-IN") : "0"}
                    </strong>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 z-10">
                    ↑
                  </div>
                </div>

                {/* To Receive */}
                <div className="bg-card border border-border-custom rounded-lg p-4 flex items-center justify-between shadow-sm relative overflow-hidden">
                  <div className="space-y-1 z-10">
                    <span className="text-[10px] font-bold text-red-400/80 uppercase tracking-wider block">To Receive</span>
                    <strong className="text-xl font-extrabold text-foreground tracking-tight block">₹0</strong>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 z-10">
                    ↓
                  </div>
                </div>

                {/* Advance Received */}
                <div className="bg-card border border-border-custom rounded-lg p-4 flex items-center justify-between shadow-sm relative overflow-hidden">
                  <div className="space-y-1 z-10">
                    <span className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-wider block">Advance Received</span>
                    <strong className="text-xl font-extrabold text-foreground tracking-tight block">₹0</strong>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 z-10">
                    ↙
                  </div>
                </div>
              </div>

              {/* Master-Detail Split Screen Container */}
              <div className="flex flex-1 gap-6 min-h-[500px]">
                {/* Master Panel: Left Party List (1/3 Width) */}
                <div className="w-full lg:w-1/3 bg-card border border-border-custom rounded-lg flex flex-col overflow-hidden">
                  {/* Search and Filters Header */}
                  <div className="p-4 border-b border-border-custom space-y-3">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search parties..."
                        value={partySearchQuery}
                        onChange={(e) => setPartySearchQuery(e.target.value)}
                        className="w-full bg-input border border-border-custom rounded-md py-1.5 pl-8 pr-3 text-xs text-foreground placeholder-muted focus:outline-none focus:border-primary transition-all"
                      />
                      <span className="absolute left-2.5 top-2 text-muted text-xs">🔍</span>
                    </div>

                    <div className="flex gap-2">
                      <button className="flex-1 py-1 px-3 border border-border-custom hover:bg-elevated rounded text-[11px] font-medium text-foreground transition-all flex items-center justify-center gap-1">
                        <span>⏳</span> Filter
                      </button>
                      <select
                        value={partyFilter}
                        onChange={(e) => setPartyFilter(e.target.value)}
                        className="flex-1 py-1 px-2 border border-border-custom bg-card hover:bg-elevated rounded text-[11px] font-medium text-foreground focus:outline-none cursor-pointer"
                      >
                        <option>Active</option>
                        <option>Inactive</option>
                      </select>
                    </div>
                  </div>

                  {/* Party List */}
                  <div className="flex-1 overflow-y-auto divide-y divide-border-custom/40">
                    {partyLedgers
                      .filter(p => p.party.toLowerCase().includes(partySearchQuery.toLowerCase()))
                      .map(p => {
                        const isSelected = selectedParty === p.party;
                        const isYash = p.party === "Yash Desai";
                        const displayBal = isYash ? parseInt(openingBalanceAmt) : p.net_due;
                        
                        return (
                          <div
                            key={p.party}
                            onClick={() => setSelectedParty(p.party)}
                            className={`p-4 flex items-center justify-between cursor-pointer transition-all ${
                              isSelected ? "bg-primary/5 border-l-2 border-primary" : "hover:bg-elevated/40"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                                {p.party.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-foreground">{p.party}</h4>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium mt-1 inline-block">
                                  {p.party === "Yash Desai" ? "Staff" : "Vendor"}
                                </span>
                              </div>
                            </div>
                            <div className="text-right space-y-1">
                              <div className="text-xs font-bold text-foreground">
                                ₹{displayBal.toLocaleString("en-IN")}
                              </div>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider block ${
                                displayBal > 0 
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-zinc-500/10 text-muted"
                              }`}>
                                {displayBal > 0 ? "I have Advance" : "No Due"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Detail Panel: Right Details (2/3 Width) */}
                <div className="flex-1 bg-card border border-border-custom rounded-lg flex flex-col overflow-hidden relative p-6">
                  {(() => {
                    const activeP = partyLedgers.find(p => p.party === selectedParty) || partyLedgers[0];
                    if (!activeP) return <div className="text-xs text-muted">No Party Selected</div>;
                    
                    const isYash = activeP.party === "Yash Desai";
                    const netDueVal = isYash ? parseInt(openingBalanceAmt) : activeP.net_due;
                    
                    return (
                      <div className="flex flex-col h-full justify-between">
                        {/* Upper Section */}
                        <div className="space-y-6">
                          {/* Header */}
                          <div className="flex justify-between items-start border-b border-border-custom/50 pb-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                                {activeP.party.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h2 className="text-sm font-bold text-foreground">{activeP.party}</h2>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium mt-1 inline-block">
                                  {isYash ? "Staff" : "Vendor"}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <span className="text-[10px] text-muted block">Balance</span>
                                <strong className="text-sm font-bold text-foreground">
                                  ₹{netDueVal.toLocaleString("en-IN")}
                                </strong>
                              </div>
                              <button className="p-1.5 border border-border-custom rounded hover:bg-elevated text-xs">
                                📥
                              </button>
                            </div>
                          </div>

                          {/* Inner Metric Header Strip */}
                          <div className="grid grid-cols-3 gap-4 border-b border-border-custom/50 pb-5">
                            <div>
                              <span className="text-[10px] text-muted block">Opening</span>
                              <strong className="text-xs font-semibold text-foreground">
                                ₹{netDueVal.toLocaleString("en-IN")}
                              </strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-muted block">Petty Cash Balance</span>
                              <strong className="text-xs font-semibold text-foreground">
                                ₹{isYash ? "8,000" : "0"}
                              </strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-muted block">Salary Balance</span>
                              <strong className="text-xs font-semibold text-foreground">₹0</strong>
                            </div>
                          </div>

                          {/* Party Detail Options Lists */}
                          <div className="space-y-3">
                            {/* Option 1: Profile */}
                            <div className="p-4 border border-border-custom rounded-lg bg-input/50 flex justify-between items-center hover:bg-elevated/20 transition-all cursor-pointer">
                              <div className="flex items-center gap-3">
                                <span className="text-sm">👤</span>
                                <div>
                                  <h5 className="text-xs font-semibold text-foreground">Party Profile</h5>
                                  <span className="text-[10px] text-muted">{activeP.party}</span>
                                </div>
                              </div>
                              <span className="text-xs text-muted">➔</span>
                            </div>

                            {/* Option 2: Opening Balance Trigger */}
                            <div
                              onClick={() => {
                                if (isYash) {
                                  setShowOpeningBalanceDrawer(true);
                                }
                              }}
                              className="p-4 border border-border-custom rounded-lg bg-input/50 flex justify-between items-center hover:bg-elevated/20 transition-all cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-sm">💵</span>
                                <div>
                                  <h5 className="text-xs font-semibold text-foreground">Opening Balance</h5>
                                  <span className="text-[10px] text-muted">₹{netDueVal.toLocaleString("en-IN")}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-primary font-bold">Party Will Pay</span>
                                <span className="text-xs text-muted">➔</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Actions bar at bottom */}
                        <div className="flex gap-4 border-t border-border-custom/50 pt-4 mt-8">
                          <button className="flex-1 py-3 px-4 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-sm transition-all text-center">
                            + Payment In
                          </button>
                          <button className="flex-1 py-3 px-4 rounded bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-sm transition-all text-center">
                            - Payment Out
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Sliding Right-side Drawer for Opening Balance */}
              {showOpeningBalanceDrawer && (
                <>
                  {/* Backdrop */}
                  <div
                    onClick={() => setShowOpeningBalanceDrawer(false)}
                    className="fixed inset-0 bg-black/60 z-40 transition-opacity"
                  />
                  {/* Drawer Content */}
                  <div className="fixed right-0 top-0 h-full w-96 bg-card border-l border-border-custom shadow-2xl z-50 p-6 flex flex-col justify-between animate-in slide-in-from-right duration-300">
                    <div className="space-y-6">
                      {/* Header */}
                      <div className="flex justify-between items-center border-b border-border-custom pb-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowOpeningBalanceDrawer(false)}
                            className="text-muted hover:text-foreground text-sm font-semibold pr-2"
                          >
                            ✕
                          </button>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Opening Balance</h3>
                        </div>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => setShowOpeningBalanceDrawer(false)}
                            className="text-xs font-medium text-muted hover:text-foreground"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => setShowOpeningBalanceDrawer(false)}
                            className="px-3 py-1 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded"
                          >
                            Save
                          </button>
                        </div>
                      </div>

                      {/* Pay/Receive Selection Option Buttons */}
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setOpeningBalanceType("pay")}
                          className={`flex-1 py-3 px-4 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                            openingBalanceType === "pay"
                              ? "border-primary bg-primary/10 text-primary shadow-sm"
                              : "border-border-custom hover:bg-elevated text-foreground"
                          }`}
                        >
                          <span className="h-4 w-4 rounded-full border-2 border-primary flex items-center justify-center p-0.5">
                            {openingBalanceType === "pay" && <span className="h-full w-full bg-primary rounded-full" />}
                          </span>
                          Party will pay
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpeningBalanceType("receive")}
                          className={`flex-1 py-3 px-4 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                            openingBalanceType === "receive"
                              ? "border-primary bg-primary/10 text-primary shadow-sm"
                              : "border-border-custom hover:bg-elevated text-foreground"
                          }`}
                        >
                          <span className="h-4 w-4 rounded-full border border-muted flex items-center justify-center p-0.5">
                            {openingBalanceType === "receive" && <span className="h-full w-full bg-primary rounded-full" />}
                          </span>
                          Party will receive
                        </button>
                      </div>

                      {/* Input Value */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted uppercase tracking-wider">
                          Amount (₹) *
                        </label>
                        <input
                          type="number"
                          value={openingBalanceAmt}
                          onChange={(e) => setOpeningBalanceAmt(e.target.value)}
                          className="w-full bg-input border border-border-custom rounded-md p-3 text-sm font-semibold text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}"""

# Replace in code
code = code.replace(target_party_tab, replacement_party_tab)


# 4. Remove childish number font (remove font-mono from monetary/numeric elements to match premium standard fonts)
# Let's replace 'font-mono' where it occurs alongside pricing and counts
code = code.replace("font-mono text-emerald-400", "font-sans font-bold text-emerald-400")
code = code.replace("font-mono text-red-400", "font-sans font-bold text-red-400")
code = code.replace("font-mono text-white", "font-sans font-bold text-white")
code = code.replace("font-mono text-zinc-300", "font-sans text-zinc-300")
code = code.replace("font-mono text-muted", "font-sans text-muted")
code = code.replace("font-mono text-zinc-200", "font-sans text-zinc-200")
code = code.replace("text-2xl font-black text-white font-mono", "text-2xl font-black text-white font-sans")
code = code.replace("font-bold font-mono", "font-bold font-sans")
code = code.replace("font-extrabold font-mono", "font-extrabold font-sans")
code = code.replace("font-semibold font-mono", "font-semibold font-sans")
code = code.replace("divide-y divide-white/[0.03] font-mono", "divide-y divide-white/[0.03] font-sans")

with open(filepath, "w", encoding="utf-8") as f:
    f.write(code)

print("Finance Page master-detail parties layout and number font issues resolved successfully!")
