"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getApiHost } from "@/lib/api";

interface PaymentRequest {
  id: string;
  party_name: string;
  amount: number;
  details: string;
  status: string;
  due_date?: string;
  created_at: string;
}

export default function PaymentApprovalPage() {
  const params = useParams();
  const companyId = params.company_id as string;
  const accessToken = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";

  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState("Pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  const apiHost = getApiHost();

  const fetchData = async () => {
    if (!companyId || !accessToken) return;
    try {
      const res = await fetch(`${apiHost}/apis/v3/payment-requests/${companyId}`, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId, accessToken]);

  const handleUpdateStatus = async (requestId: string, action: "Approved" | "Rejected" | "Paid") => {
    try {
      const res = await fetch(`${apiHost}/apis/v3/payment-requests/approve/${requestId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({ status: action })
      });
      if (res.ok) {
        setToastMessage(`Payment request ${action.toLowerCase()} successfully!`);
        setTimeout(() => setToastMessage(""), 3000);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateDemoRequest = async () => {
    try {
      // 1. Fetch user ID to assign as party user
      const userRes = await fetch(`${apiHost}/apis/v3/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: "+919876543210", code: "123456" }) // mock verify to get user
      });
      let userId = "00000000-0000-0000-0000-000000000000";
      if (userRes.ok) {
        const uData = await userRes.json();
        userId = uData.user.id;
      }

      // 2. Create Payment Request
      const res = await fetch(`${apiHost}/apis/v3/payment-requests/${companyId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          party_company_user_id: userId,
          amount: 45000.0,
          details: "Steel structures delivery invoice ST-1092",
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
      });

      if (res.ok) {
        setToastMessage("Demo payment request created!");
        setTimeout(() => setToastMessage(""), 3000);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const matchesStatus = r.status.toLowerCase() === filterStatus.toLowerCase();
    const matchesSearch = r.party_name.toLowerCase().includes(searchQuery.toLowerCase()) || (r.details && r.details.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6 relative">
      {/* Header & Title */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-base font-semibold text-foreground">Payment Approvals</h1>
          <p className="text-xs text-muted mt-1">Review, authorize, or decline transactions submitted by team members.</p>
        </div>

        {/* Create Demo Request Button */}
        <button
          onClick={handleCreateDemoRequest}
          className="px-4 py-2 border border-border-custom text-foreground bg-card hover:bg-elevated rounded-md text-xs font-medium transition-all cursor-pointer"
        >
          + Create Demo Request
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6">
        <div className="flex bg-elevated border border-border-custom rounded-md p-1 shrink-0">
          {["Pending", "Approved", "Rejected"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filterStatus === status ? "bg-primary text-white shadow-sm font-medium" : "text-muted hover:text-foreground font-medium"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by party name or details..."
          className="input-field px-4 py-2 text-xs font-semibold focus:outline-none placeholder-muted w-full md:max-w-xs"
        />
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="rounded-lg border border-border-custom bg-card p-12 flex flex-col items-center justify-center text-center space-y-4">
            <span className="text-4xl">🏷️</span>
            <div>
              <h3 className="text-foreground font-semibold text-sm">No Payment Requests found</h3>
              <p className="text-muted text-xs mt-1">No requests match status "{filterStatus}". Click "+ Create Demo Request" to try the flow.</p>
            </div>
          </div>
        ) : (
          filteredRequests.map((r) => (
            <div
              key={r.id}
              className="p-6 bg-card border border-border-custom rounded-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-border-custom transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-foreground text-base">{r.party_name}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                    r.status === "Approved"
                      ? "bg-success/10 text-success"
                      : r.status === "Rejected"
                      ? "bg-danger/10 text-danger"
                      : "bg-warning/10 text-warning"
                  }`}>{r.status}</span>
                </div>
                
                <p className="text-muted text-xs max-w-xl">{r.details || "No details provided"}</p>
                
                <div className="flex gap-4 text-[10px] text-muted">
                  <span>📅 Submitted: {new Date(r.created_at).toLocaleDateString()}</span>
                  {r.due_date && (
                    <span>⏳ Due: {new Date(r.due_date).toLocaleDateString()}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t border-border-custom md:border-t-0 pt-4 md:pt-0">
                <div className="text-right">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted block">Requested Amount</span>
                  <span className="text-lg font-semibold text-foreground">₹{r.amount.toLocaleString()}</span>
                </div>

                {r.status === "Pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateStatus(r.id, "Rejected")}
                      className="px-3.5 py-1.5 border border-border-custom text-foreground text-xs font-medium rounded-md hover:bg-elevated transition-all cursor-pointer"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(r.id, "Approved")}
                      className="px-3.5 py-1.5 bg-success hover:bg-success/90 text-white text-xs font-medium rounded-md transition-all cursor-pointer"
                    >
                      Approve
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Local Toast Alert */}
      {toastMessage && (
        <div className="absolute bottom-6 right-6 bg-card border border-success/30 rounded-md px-4 py-3 text-xs text-success shadow-2xl z-50">
          <span>⚡ </span>
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
