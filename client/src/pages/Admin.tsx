import React, { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Shield, Key, Plus, Trash2, Edit, AlertTriangle, ArrowLeft, Check, Lock, Database } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function AdminPage() {
  const { user, isAuthenticated } = useAuth();
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Claude API key state
  const [claudeKeyInput, setClaudeKeyInput] = useState("");
  const claudeKeyQuery = trpc.getClaudeKey.useQuery(undefined, { enabled: authed });
  const setClaudeKeyMutation = trpc.setClaudeKey.useMutation({
    onSuccess: () => {
      toast.success("Claude API key updated successfully for AI/OCR activity");
      setClaudeKeyInput("");
      claudeKeyQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  // Reset inventory state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const resetMutation = trpc.resetInventory.useMutation({
    onSuccess: () => {
      toast.success("Inventory ledger successfully reset");
      setResetModalOpen(false);
      utils.inventory.invalidate();
      utils.dashboard.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // Unit management state
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<number | null>(null);
  const [societyName, setSocietyName] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [areaSqft, setAreaSqft] = useState("");
  const [configuration, setConfiguration] = useState("");
  const [floor, setFloor] = useState("");
  const [locality, setLocality] = useState("");
  const [marketRegion, setMarketRegion] = useState("Gurgaon");
  const [zone, setZone] = useState("SPR");
  const [microZone, setMicroZone] = useState("Sector 67");
  const [status, setStatus] = useState("Available");
  const [askPriceDisplay, setAskPriceDisplay] = useState("");

  const inventoryQuery = trpc.inventory.useQuery({});
  const utils = trpc.useUtils();

  const addUnitMutation = trpc.addUnit.useMutation({
    onSuccess: () => {
      toast.success("Unit added successfully");
      setUnitModalOpen(false);
      resetUnitForm();
      utils.inventory.invalidate();
      utils.dashboard.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateUnitMutation = trpc.updateUnit.useMutation({
    onSuccess: () => {
      toast.success("Unit updated successfully");
      setUnitModalOpen(false);
      resetUnitForm();
      utils.inventory.invalidate();
      utils.dashboard.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteUnitMutation = trpc.deleteUnit.useMutation({
    onSuccess: () => {
      toast.success("Unit removed from ledger");
      utils.inventory.invalidate();
      utils.dashboard.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const adminVerifyMutation = trpc.adminVerify.useMutation({
    onSuccess: () => {
      setAuthed(true);
      toast.success("Admin access granted");
    },
    onError: () => {
      toast.error("Incorrect admin password");
    },
  });

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    adminVerifyMutation.mutate({ password });
  };

  const resetUnitForm = () => {
    setEditingUnitId(null);
    setSocietyName("");
    setUnitNumber("");
    setAreaSqft("");
    setConfiguration("");
    setFloor("");
    setLocality("");
    setMarketRegion("Gurgaon");
    setZone("SPR");
    setMicroZone("Sector 67");
    setStatus("Available");
    setAskPriceDisplay("");
  };

  const openAddModal = () => {
    resetUnitForm();
    setUnitModalOpen(true);
  };

  const openEditModal = (u: any) => {
    setEditingUnitId(u.id);
    setSocietyName(u.societyName || "");
    setUnitNumber(u.unitNumber || "");
    setAreaSqft(u.areaSqft ? String(u.areaSqft) : "");
    setConfiguration(u.configuration || "");
    setFloor(u.floor || "");
    setLocality(u.locality || "");
    setMarketRegion(u.marketRegion || "Gurgaon");
    setZone(u.zone || "SPR");
    setMicroZone(u.microZone || "Sector 67");
    setStatus(u.status || "Available");
    setAskPriceDisplay(u.askPriceDisplay || "");
    setUnitModalOpen(true);
  };

  const handleSaveUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast.error("Admin password required");
      return;
    }
    const payload = {
      societyName,
      unitNumber,
      areaSqft: areaSqft ? Number(areaSqft) : undefined,
      configuration: configuration || undefined,
      floor: floor || undefined,
      locality: locality || undefined,
      marketRegion,
      zone,
      microZone,
      status,
      askPriceDisplay: askPriceDisplay || undefined,
    };
    if (editingUnitId) {
      updateUnitMutation.mutate({ password, id: editingUnitId, unit: payload });
    } else {
      addUnitMutation.mutate({ password, unit: payload });
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#111813] text-[#f3f6ed] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#1b261f] border border-[#2f4d3c] p-8 rounded-2xl shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-[#2f4d3c]/40 text-[#c9ff3f] rounded-xl">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Admin Portal</h1>
              <p className="text-xs text-slate-400">Password-protected management console</p>
            </div>
          </div>
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <Label className="text-xs text-slate-300 font-mono uppercase">Admin Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password (e.g. admin123)"
                  className="pl-9 bg-[#111813] border-[#2f4d3c] text-white focus:border-[#c9ff3f]"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full bg-[#c9ff3f] text-[#111813] hover:bg-[#b5f02e] font-semibold py-2.5">
              Access Admin Portal
            </Button>
            <div className="pt-2 text-center">
              <a href="/" className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1.5 font-mono">
                <ArrowLeft className="h-3 w-3" /> Return to Tracker Workspace
              </a>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f6ed] text-[#18372b] p-6 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-[#2f4d3c]/15 pb-6">
          <div className="flex items-center gap-4">
            <a href="/" className="p-2 bg-[#18372b] text-[#c9ff3f] rounded-lg hover:bg-[#234b3a] transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </a>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Admin Console</h1>
              <p className="text-xs font-mono text-slate-600">// AI & OCR settings, manual unit management & inventory reset</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono px-3 py-1 bg-[#18372b] text-[#c9ff3f] rounded-full">
              Authenticated Session
            </span>
          </div>
        </div>

        {/* Section 1: Claude API Key for AI/OCR */}
        <div className="bg-white border border-[#2f4d3c]/15 p-6 rounded-2xl shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#18372b] text-[#c9ff3f] rounded-xl">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Claude API Key for AI & OCR Activity</h2>
              <p className="text-xs text-slate-600">Configure your custom Anthropic Claude API key used across all bullet extraction and document OCR requests.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 items-end bg-[#f8faf6] p-5 rounded-xl border border-[#2f4d3c]/10">
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase text-slate-700">Current Key Status</Label>
              <div className="text-sm font-mono bg-white border border-slate-200 px-3 py-2 rounded-lg flex items-center justify-between">
                <span>{claudeKeyQuery.data?.configured ? `Configured (${claudeKeyQuery.data.masked})` : "Using default system key"}</span>
                {claudeKeyQuery.data?.configured && <Check className="h-4 w-4 text-emerald-600" />}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase text-slate-700">Set New Claude API Key</Label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={claudeKeyInput}
                  onChange={(e) => setClaudeKeyInput(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  className="bg-white border-slate-300 font-mono text-sm"
                />
                <Button
                  onClick={() => {
                    if (!claudeKeyInput) return toast.error("Enter a valid API key");
                    setClaudeKeyMutation.mutate({ apiKey: claudeKeyInput, password });
                  }}
                  className="bg-[#18372b] text-white hover:bg-[#234b3a] whitespace-nowrap"
                >
                  Save Key
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Manual Unit Management */}
        <div className="bg-white border border-[#2f4d3c]/15 p-6 rounded-2xl shadow-sm space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#18372b] text-[#c9ff3f] rounded-xl">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Manual Unit Management</h2>
                <p className="text-xs text-slate-600">Add, edit, or remove individual units from the active inventory ledger.</p>
              </div>
            </div>
            <Button onClick={openAddModal} className="bg-[#18372b] text-white hover:bg-[#234b3a] gap-2">
              <Plus className="h-4 w-4" /> Add Unit Manually
            </Button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f8faf6] border-b border-slate-200 text-xs font-mono uppercase text-slate-600">
                <tr>
                  <th className="p-3">Society & Unit</th>
                  <th className="p-3">Config / Area</th>
                  <th className="p-3">Region / Zone</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Price</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventoryQuery.data?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">No active inventory units found.</td>
                  </tr>
                ) : (
                  inventoryQuery.data?.map((u: any) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <div className="font-semibold">{u.societyName}</div>
                        <div className="text-xs text-slate-500 font-mono">Unit {u.unitNumber} {u.floor ? `(Flr ${u.floor})` : ""}</div>
                      </td>
                      <td className="p-3">
                        <div>{u.configuration || "—"}</div>
                        <div className="text-xs text-slate-500 font-mono">{u.areaSqft ? `${u.areaSqft} sq.ft` : ""}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-xs font-semibold text-emerald-800">{u.marketRegion || "Gurgaon"}</div>
                        <div className="text-xs text-slate-500 font-mono">{u.zone} / {u.microZone}</div>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                          {u.status || "Available"}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-medium text-xs">{u.askPriceDisplay || "On Request"}</td>
                      <td className="p-3 text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openEditModal(u)} className="h-8 px-2 text-xs">
                          <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Remove unit ${u.unitNumber} at ${u.societyName}?`)) {
                              deleteUnitMutation.mutate({ password, id: u.id });
                            }
                          }}
                          className="h-8 px-2 text-xs text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Inventory Reset / Removal */}
        <div className="bg-red-50 border border-red-200 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600 text-white rounded-xl">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-red-900">Danger Zone: Full Inventory Reset</h2>
              <p className="text-xs text-red-700">Permanently clear all snapshot history, change events, and active inventory units.</p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setResetModalOpen(true)} variant="destructive" className="bg-red-600 hover:bg-red-700 text-xs font-mono uppercase tracking-wider">
              Reset entire inventory ledger
            </Button>
          </div>
        </div>
      </div>

      {/* Unit Add/Edit Modal */}
      <Dialog open={unitModalOpen} onOpenChange={setUnitModalOpen}>
        <DialogContent className="max-w-xl bg-white text-[#18372b] border border-slate-200">
          <DialogHeader>
            <DialogTitle>{editingUnitId ? "Edit Inventory Unit" : "Add Inventory Unit Manually"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveUnit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-mono uppercase">Society Name *</Label>
                <Input value={societyName} onChange={(e) => setSocietyName(e.target.value)} placeholder="e.g. DLF Magnolias" required className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-mono uppercase">Unit Number *</Label>
                <Input value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} placeholder="e.g. A-1202" required className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-mono uppercase">Area (sq.ft)</Label>
                <Input type="number" value={areaSqft} onChange={(e) => setAreaSqft(e.target.value)} placeholder="3200" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-mono uppercase">Config</Label>
                <Input value={configuration} onChange={(e) => setConfiguration(e.target.value)} placeholder="4 BHK" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-mono uppercase">Floor</Label>
                <Input value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="12" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-mono uppercase">Market Region</Label>
                <Input value={marketRegion} onChange={(e) => setMarketRegion(e.target.value)} placeholder="Gurgaon" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-mono uppercase">Zone / Corridor</Label>
                <Input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="SPR" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-mono uppercase">Micro Zone</Label>
                <Input value={microZone} onChange={(e) => setMicroZone(e.target.value)} placeholder="Sector 67" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-mono uppercase">Status</Label>
                <Input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Available" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-mono uppercase">Ask Price Display</Label>
                <Input value={askPriceDisplay} onChange={(e) => setAskPriceDisplay(e.target.value)} placeholder="₹ 6.5 Cr" className="mt-1" />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setUnitModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#18372b] text-white hover:bg-[#234b3a]">Save Unit</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Modal */}
      <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <DialogContent className="max-w-md bg-white text-[#18372b]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Confirm Inventory Reset
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-slate-600">This action will permanently delete all inventory snapshots, active units, and change logs. Enter the admin password to confirm.</p>
            <div>
              <Label className="text-xs font-mono uppercase">Admin Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetModalOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                resetMutation.mutate({ password });
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Permanently Reset Ledger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
