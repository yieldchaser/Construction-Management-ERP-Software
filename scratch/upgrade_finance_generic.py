filepath = r"c:\Users\Dell\Github\Construction-Management-ERP-Software\frontend\src\app\c\[company_id]\p\[project_id]\finance\page.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update state definitions to dictionary and temp amount
target_states = """  // Party Master-Detail & Side-drawer States
  const [selectedParty, setSelectedParty] = useState<string>("Yash Desai");
  const [showOpeningBalanceDrawer, setShowOpeningBalanceDrawer] = useState(false);
  const [openingBalanceType, setOpeningBalanceType] = useState<"pay" | "receive">("pay");
  const [openingBalanceAmt, setOpeningBalanceAmt] = useState("8000");"""

replacement_states = """  // Party Master-Detail & Side-drawer States
  const [selectedParty, setSelectedParty] = useState<string>("Yash Desai");
  const [showOpeningBalanceDrawer, setShowOpeningBalanceDrawer] = useState(false);
  const [openingBalanceType, setOpeningBalanceType] = useState<"pay" | "receive">("pay");
  const [openingBalances, setOpeningBalances] = useState<Record<string, number>>({ "Yash Desai": 8000 });
  const [tempAmt, setTempAmt] = useState("8000");"""

code = code.replace(target_states, replacement_states)


# 2. Update KPI cards calculation
target_kpis = """                {/* Advance Paid */}
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
                </div>"""

replacement_kpis = """                {/* Advance Paid */}
                <div className="bg-card border border-border-custom rounded-lg p-4 flex items-center justify-between shadow-sm relative overflow-hidden">
                  <div className="space-y-1 z-10">
                    <span className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-wider block">Advance Paid</span>
                    <strong className="text-xl font-extrabold text-foreground tracking-tight block">
                      ₹{Object.values(openingBalances).reduce((s, v) => s + v, 0).toLocaleString("en-IN")}
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
                      ₹{(openingBalanceType === "receive" ? Object.values(openingBalances).reduce((s, v) => s + v, 0) : 0).toLocaleString("en-IN")}
                    </strong>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 z-10">
                    ↑
                  </div>
                </div>"""

code = code.replace(target_kpis, replacement_kpis)


# 3. Update party list balance lookup
target_list_lookup = """                        const isSelected = selectedParty === p.party;
                        const isYash = p.party === "Yash Desai";
                        const displayBal = isYash ? parseInt(openingBalanceAmt) : p.net_due;"""

replacement_list_lookup = """                        const isSelected = selectedParty === p.party;
                        const displayBal = openingBalances[p.party] !== undefined ? openingBalances[p.party] : p.net_due;"""

code = code.replace(target_list_lookup, replacement_list_lookup)


# 4. Update detail header balance lookup
target_detail_lookup = """                    const isYash = activeP.party === "Yash Desai";
                    const netDueVal = isYash ? parseInt(openingBalanceAmt) : activeP.net_due;"""

replacement_detail_lookup = """                    const netDueVal = openingBalances[activeP.party] !== undefined ? openingBalances[activeP.party] : activeP.net_due;"""

code = code.replace(target_detail_lookup, replacement_detail_lookup)


# 5. Update detail balance items & triggers
target_balance_cards = """                            {/* Option 2: Opening Balance Trigger */}
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
                            </div>"""

replacement_balance_cards = """                            {/* Option 2: Opening Balance Trigger */}
                            <div
                              onClick={() => {
                                setTempAmt(String(netDueVal));
                                setShowOpeningBalanceDrawer(true);
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
                                <span className="text-[10px] text-primary font-bold">
                                  {openingBalanceType === "pay" ? "Party Will Pay" : "Party Will Get"}
                                </span>
                                <span className="text-xs text-muted">➔</span>
                              </div>
                            </div>"""

code = code.replace(target_balance_cards, replacement_balance_cards)


# 6. Update Drawer amount binding and Save actions
target_drawer_buttons = """                          <button
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
                          </button>"""

replacement_drawer_buttons = """                          <button
                            onClick={() => setShowOpeningBalanceDrawer(false)}
                            className="text-xs font-medium text-muted hover:text-foreground"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              setOpeningBalances(prev => ({ ...prev, [activeP.party]: parseInt(tempAmt) || 0 }));
                              setShowOpeningBalanceDrawer(false);
                            }}
                            className="px-3 py-1 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded"
                          >
                            Save
                          </button>"""

code = code.replace(target_drawer_buttons, replacement_drawer_buttons)


# 7. Update Drawer Amount Input binding
target_drawer_input = """                        <input
                          type="number"
                          value={openingBalanceAmt}
                          onChange={(e) => setOpeningBalanceAmt(e.target.value)}"""

replacement_drawer_input = """                        <input
                          type="number"
                          value={tempAmt}
                          onChange={(e) => setTempAmt(e.target.value)}"""

code = code.replace(target_drawer_input, replacement_drawer_input)


with open(filepath, "w", encoding="utf-8") as f:
    f.write(code)

print("Upgrade to generic multi-party opening balance completed successfully!")
