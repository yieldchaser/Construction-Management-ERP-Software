"use client";
import { getApiHost } from "@/lib/api";
import { authHeaders } from "@/lib/siteflow";
import React, { useState, useEffect } from "react";
import { useProject } from "@/context/ProjectContext";
import { useParams } from "next/navigation";

interface Field {
  id: string;
  entity_type: string;
  field_name: string;
  field_label: string;
  field_type: string;
  is_required: boolean;
  options: string[];
  display_order: number;
  is_active: boolean;
}

interface FieldValueRow {
  field_id: string;
  entity_type: string;
  value_text: string | null;
  value_number: number | null;
  value_date: string | null;
  value_json: unknown;
}

export default function CustomFieldsPage() {
  const params = useParams();
  const companyId = params?.company_id as string;
  const { activeProjectId } = useProject();
  const projectId = activeProjectId;

  const [fields, setFields] = useState<Field[]>([]);
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [showValueModal, setShowValueModal] = useState(false);
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [message, setMessage] = useState("");
  const [values, setValues] = useState<FieldValueRow[]>([]);

  const [fieldForm, setFieldForm] = useState({
    entity_type: "project",
    field_name: "",
    field_label: "",
    field_type: "text",
    is_required: false,
    options: "",
    display_order: 0,
  });

  const [valueForm, setValueForm] = useState({
    field_id: "",
    entity_type: "project",
    entity_id: projectId || "",
    value_text: "",
    value_number: 0,
    value_date: "",
  });

  const fetchFields = async () => {
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/custom-fields/fields/${companyId}?entity_type=project`, { headers: authHeaders() });
      if (res.ok) setFields(await res.json());
    } catch (e) { console.error("Failed to load fields", e); }
  };

  const fetchValues = async (entityType?: string) => {
    const type = entityType || selectedField?.entity_type;
    if (!type || !projectId) return;
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/custom-fields/values/${type}/${projectId}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        const rows: FieldValueRow[] = Array.isArray(data) ? data : [];
        setValues((prev) => [...prev.filter((v) => v.entity_type !== type), ...rows]);
      }
    } catch (e) { console.error("Failed to load values", e); }
  };

  const formatFieldValue = (f: Field): string => {
    const v = values.find((row) => row.field_id === f.id);
    if (!v) return "Not set";
    if (f.field_type === "number") return v.value_number === null || v.value_number === undefined ? "Not set" : String(v.value_number);
    if (f.field_type === "date") return v.value_date ? new Date(v.value_date).toLocaleDateString() : "Not set";
    if (v.value_json !== null && v.value_json !== undefined) {
      if (Array.isArray(v.value_json)) return v.value_json.length ? v.value_json.join(", ") : "Not set";
      return String(v.value_json);
    }
    return v.value_text || "Not set";
  };

  useEffect(() => {
    const id = setTimeout(() => fetchFields(), 0);
    return () => clearTimeout(id);
  }, [companyId]);

  useEffect(() => {
    if (!selectedField) return;
    const id = setTimeout(() => fetchValues(selectedField.entity_type), 0);
    return () => clearTimeout(id);
  }, [selectedField]);

  useEffect(() => {
    const types = Array.from(new Set(fields.map((f) => f.entity_type)));
    const id = setTimeout(() => types.forEach((t) => fetchValues(t)), 0);
    return () => clearTimeout(id);
  }, [fields]);

  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    try {
      const body = {
        ...fieldForm,
        company_id: companyId,
        options: fieldForm.options.split(",").map((s) => s.trim()).filter(Boolean),
      };
      const res = await fetch(`${getApiHost()}/apis/v3/custom-fields/fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setMessage("Field created");
        setShowFieldModal(false);
        setFieldForm({ entity_type: "project", field_name: "", field_label: "", field_type: "text", is_required: false, options: "", display_order: 0 });
        fetchFields();
      } else {
        const err = await res.json();
        setMessage(err.detail || "Failed");
      }
    } catch (_e) { void _e; setMessage("Error"); }
  };

  const handleSetValue = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    try {
      const body: Record<string, unknown> = {
        field_id: valueForm.field_id,
        entity_type: valueForm.entity_type,
        entity_id: valueForm.entity_id,
        company_id: companyId,
        value_text: valueForm.value_text || "",
      };
      if (!(body.value_number === 0 && valueForm.value_text)) {
        body.value_number = valueForm.value_number;
      }
      const res = await fetch(`${getApiHost()}/apis/v3/custom-fields/values`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setMessage("Value saved");
        setShowValueModal(false);
        if (selectedField) fetchValues(selectedField.entity_type);
      } else {
        const err = await res.json();
        setMessage(err.detail || "Failed");
      }
    } catch (_e) { void _e; setMessage("Error"); }
  };

  const openValueModal = (field: Field) => {
    setSelectedField(field);
    setValueForm({ field_id: field.id, entity_type: field.entity_type, entity_id: projectId || "", value_text: "", value_number: 0, value_date: "" });
    setShowValueModal(true);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Custom Fields</h1>
            <p className="text-muted mt-1">Add dynamic fields to projects, tasks, bills, and more</p>
          </div>
          <button onClick={() => setShowFieldModal(true)} className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md text-sm font-semibold transition-all">
            New Field
          </button>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-md ${message.includes("success") || message.includes("saved") || message.includes("created") ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fields.length === 0 ? (
            <div className="col-span-full text-center text-muted py-12">No custom fields defined yet</div>
          ) : (
            fields.map((f) => (
              <div key={f.id} className="bg-card border border-border-custom rounded-lg p-6 hover:bg-elevated transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-foreground font-semibold">{f.field_label}</h3>
                    <p className="text-muted text-xs mt-1">{f.field_name} • {f.field_type}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${f.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-500/10 text-muted"}`}>
                    {f.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted mb-4">
                  <span className="capitalize">{f.entity_type}</span>
                  {f.is_required && <span className="text-red-400">Required</span>}
                </div>
                <div className="text-xs mb-4 truncate">
                  <span className="text-muted">Current value: </span>
                  <span className="text-foreground font-medium">{formatFieldValue(f)}</span>
                </div>
                <button onClick={() => openValueModal(f)} className="w-full px-3 py-2 bg-input hover:bg-elevated text-foreground rounded-md text-xs font-medium transition-all">
                  Set Value
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {showFieldModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-elevated border border-border-custom rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-foreground mb-4">New Custom Field</h2>
            <form onSubmit={handleCreateField} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Entity Type</label>
                <select className="w-full bg-input border border-border-custom rounded-md px-4 py-2 text-foreground" value={fieldForm.entity_type} onChange={(e) => setFieldForm({...fieldForm, entity_type: e.target.value})}>
                  <option value="project">Project</option>
                  <option value="task">Task</option>
                  <option value="bill">Bill</option>
                  <option value="invoice">Invoice</option>
                  <option value="lead">Lead</option>
                  <option value="vendor">Vendor</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Field Name</label>
                <input type="text" required className="w-full bg-input border border-border-custom rounded-md px-4 py-2 text-foreground" value={fieldForm.field_name} onChange={(e) => setFieldForm({...fieldForm, field_name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Field Label</label>
                <input type="text" required className="w-full bg-input border border-border-custom rounded-md px-4 py-2 text-foreground" value={fieldForm.field_label} onChange={(e) => setFieldForm({...fieldForm, field_label: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Type</label>
                <select className="w-full bg-input border border-border-custom rounded-md px-4 py-2 text-foreground" value={fieldForm.field_type} onChange={(e) => setFieldForm({...fieldForm, field_type: e.target.value})}>
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="select">Select</option>
                  <option value="multiselect">Multi-select</option>
                  <option value="checkbox">Checkbox</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Options (comma-separated, for select)</label>
                <input type="text" className="w-full bg-input border border-border-custom rounded-md px-4 py-2 text-foreground" value={fieldForm.options} onChange={(e) => setFieldForm({...fieldForm, options: e.target.value})} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md text-sm font-semibold">Create Field</button>
                <button type="button" onClick={() => { setShowFieldModal(false); setMessage(""); }} className="px-4 py-2 bg-elevated hover:bg-elevated/70 text-foreground rounded-md text-sm font-semibold">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showValueModal && selectedField && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-elevated border border-border-custom rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-foreground mb-4">Set Value: {selectedField.field_label}</h2>
            <form onSubmit={handleSetValue} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Entity ID</label>
                <input type="text" required className="w-full bg-input border border-border-custom rounded-md px-4 py-2 text-foreground" value={valueForm.entity_id} onChange={(e) => setValueForm({...valueForm, entity_id: e.target.value})} />
              </div>
              {selectedField.field_type === "text" && (
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Value</label>
                  <input type="text" required className="w-full bg-input border border-border-custom rounded-md px-4 py-2 text-foreground" value={valueForm.value_text} onChange={(e) => setValueForm({...valueForm, value_text: e.target.value})} />
                </div>
              )}
              {selectedField.field_type === "number" && (
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Value</label>
                  <input type="number" required className="w-full bg-input border border-border-custom rounded-md px-4 py-2 text-foreground" value={valueForm.value_number} onChange={(e) => setValueForm({...valueForm, value_number: parseFloat(e.target.value)})} />
                </div>
              )}
              {selectedField.field_type === "date" && (
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Value</label>
                  <input type="date" required className="w-full bg-input border border-border-custom rounded-md px-4 py-2 text-foreground" value={valueForm.value_date} onChange={(e) => setValueForm({...valueForm, value_date: e.target.value})} />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md text-sm font-semibold">Save Value</button>
                <button type="button" onClick={() => { setShowValueModal(false); setMessage(""); }} className="px-4 py-2 bg-elevated hover:bg-elevated/70 text-foreground rounded-md text-sm font-semibold">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
