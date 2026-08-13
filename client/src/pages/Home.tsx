import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { ArrowUpRight, BarChart3, Check, ChevronRight, CircleAlert, Download, FileImage, FileSpreadsheet, FileText, Filter, History, Home as HomeIcon, Loader2, LogOut, Menu as MenuIcon, Minus, Plus, Search, Shield, Sparkles, TrendingDown, TrendingUp, UploadCloud, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { upload } from "@vercel/blob/client";
import { startLogin } from "@/const";
import { downloadInventorySection, downloadWorkbook } from "@/lib/inventoryExport";
import { isSupportedUploadMime, uploadAcceptAttribute, type SupportedUploadMime } from "@/lib/ocrUpload";

type FilePayload = { name: string; mimeType: SupportedUploadMime; url: string };
const formatPrice = (value: unknown, display?: string | null) => display || (value ? `₹${Number(value).toLocaleString("en-IN")}` : "—");
const formatDate = (date: unknown) => date ? new Date(date as string).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";

export default function Home() {
  const { user, loading, logout } = useAuth();
  const [tab, setTab] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [marketRegion, setMarketRegion] = useState("all");
  const [zone, setZone] = useState("all");
  const [microZone, setMicroZone] = useState("all");
  const [sort, setSort] = useState<"updated" | "price" | "area">("updated");
  const [files, setFiles] = useState<FilePayload[]>([]);
  const [review, setReview] = useState<any | null>(null);
  const [dragging, setDragging] = useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const dashboard = trpc.dashboard.useQuery(undefined, { enabled: !!user });
  const inventory = trpc.inventory.useQuery({ search, marketRegion, zone, microZone, sort }, { enabled: !!user });
  const inventoryFacets = trpc.inventoryFacets.useQuery(undefined, { enabled: !!user });
  const sourced = trpc.sourced.useQuery(undefined, { enabled: !!user && tab === "sourced" });
  const sold = trpc.sold.useQuery(undefined, { enabled: !!user && tab === "sold" });
  const history = trpc.history.useQuery(undefined, { enabled: !!user && tab === "history" });

  const extract = trpc.extract.useMutation({
    onSuccess: data => { setReview(data); toast.success("Report files analyzed successfully"); },
    onError: e => toast.error(e.message)
  });

  const confirm = trpc.confirm.useMutation({
    onSuccess: () => {
      toast.success("Snapshot confirmed and committed to ledger");
      setReview(null);
      setFiles([]);
      dashboard.refetch();
      inventory.refetch();
      setTab("dashboard");
    },
    onError: e => toast.error(e.message)
  });



  const activeUnits = inventory.data ?? [];
  const trend = dashboard.data?.trend ?? [];
  const zoneSummary = useMemo(() => {
    const groups = new Map<string, { region: string; zone: string; count: number }>();
    activeUnits.forEach((unit: any) => {
      const region = unit.marketRegion || "Unassigned region";
      const zoneName = unit.zone || "Unassigned zone";
      const key = `${region}::${zoneName}`;
      const current = groups.get(key) || { region, zone: zoneName, count: 0 };
      current.count += 1;
      groups.set(key, current);
    });
    return Array.from(groups.values()).sort((a, b) => b.count - a.count);
  }, [activeUnits]);

  const downloadOverview = () => downloadWorkbook("openhouse-overview.xlsx", [
    { name: "Overview", rows: [{ Metric: "Active inventory", Value: dashboard.data?.active ?? 0 }, { Metric: "New / sourced", Value: dashboard.data?.sourced ?? 0 }, { Metric: "Sold / removed", Value: dashboard.data?.sold ?? 0 }, { Metric: "Price changes", Value: dashboard.data?.priceChanges ?? 0 }, { Metric: "Net inventory shift", Value: dashboard.data?.net ?? 0 }] },
    { name: "Snapshot trend", rows: trend.map(point => ({ Date: point.date, "Active units": point.count })) },
  ]);

  const downloadHistory = () => downloadWorkbook("openhouse-ledger-history.xlsx", [
    { name: "Ledger history", rows: (history.data ?? []).map((snapshot: any) => ({ Date: formatDate(snapshot.snapshotDate), Units: snapshot.unitCount, "Source files": snapshot.sourceFileCount, Completeness: `${snapshot.completenessScore}%`, Warning: snapshot.warningMessage || "" })) },
  ]);

  const downloadReview = () => review && downloadInventorySection("openhouse-review.xlsx", "OCR review", review.units ?? []);

  const addFiles = async (list: FileList | File[]) => {
    const next: FilePayload[] = [];
    for (const file of Array.from(list)) {
      if (!isSupportedUploadMime(file.type)) { toast.error(`${file.name}: use a PDF, PNG, JPG, WEBP, or GIF file`); continue; }
      try {
        // Upload straight from the browser to Blob storage -- large
        // screenshots/PDFs never pass through our own server, so there's no
        // request-body size limit to hit (Vercel functions cap those at 4.5MB).
        const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/blob-upload" });
        next.push({ name: file.name, mimeType: file.type as SupportedUploadMime, url: blob.url });
      } catch {
        toast.error(`${file.name}: upload failed`);
      }
    }
    setFiles(prev => [...prev, ...next]);
  };

  const handleExtract = () => {
    if (!files.length) return toast.error("Select at least one PDF or report image");
    extract.mutate({ files });
  };

  const eventCounts = useMemo(() => {
    const list = review?.changes ?? [];
    return {
      sourced: list.filter((x: any) => x.type === "sourced").length,
      sold: list.filter((x: any) => x.type === "potentially_sold").length,
      updated: list.filter((x: any) => x.type === "updated" || x.type === "price_changed").length
    };
  }, [review]);

  const confirmReview = () => {
    if (!review) return;
    confirm.mutate({
      snapshotDate: new Date().toISOString(),
      sourceFileCount: review.assets.length,
      completenessScore: review.completenessScore,
      warning: review.warning,
      assets: review.assets,
      units: review.units,
      changes: review.changes
    });
  };

  // Unauthenticated Framer-inspired Landing View
  if (!user && !loading) {
    return (
      <div className="min-h-screen biogax-page biogax-landing bg-[#f3f6ed] text-[#18372b] selection:bg-[#d9fb68]/40 selection:text-[#18372b]">
        <div className="mntn-shell">
          <header className="mntn-topbar">
            <a href="/" className="mntn-brand" aria-label="Openhouse home">
              OPENHOUSE <span className="text-[#c9ff3f]">//</span> TRACKER
            </a>
            <nav className="mntn-nav-links">
              <a href="#features">Overview</a>
              <a href="#methodology">How it works</a>
              <a href="#methodology">NCR zones</a>
            </nav>
            <div className="mntn-topbar-actions">
              <Button onClick={() => startLogin()} className="mntn-button">
                Get started
              </Button>
              <button
                className="mntn-mobile-menu-toggle"
                type="button"
                aria-expanded={mobileMenuOpen}
                aria-controls="landing-mobile-nav"
                onClick={() => setMobileMenuOpen(open => !open)}
              >
                <MenuIcon size={14} /> Menu
              </button>
            </div>
          </header>
          {mobileMenuOpen && (
            <nav id="landing-mobile-nav" className="mntn-mobile-nav" aria-label="Mobile navigation">
              <a href="#features" onClick={() => setMobileMenuOpen(false)}>Home</a>
              <a href="#methodology" onClick={() => setMobileMenuOpen(false)}>Workflow</a>
              <a href="#about" onClick={() => setMobileMenuOpen(false)}>About</a>
              <button type="button" className="text-left text-[#c9ff3f]" onClick={() => startLogin()}>Sign in to tracker</button>
            </nav>
          )}

          <section className="mntn-hero">
            <div>
              <span className="eyebrow">Property operations / 2026</span>
              <h1>Property intelligence <em>for modern teams.</em></h1>
              <p>
                A calm workspace for the people who need to know what changed. Turn daily bulletins into a clear, searchable inventory across every NCR corridor.
              </p>
              <div className="flex flex-wrap gap-3 items-center">
                <Button onClick={() => startLogin()} className="mntn-button">
                  Start tracking <ChevronRight size={16} />
                </Button>
                <a href="#features" className="mntn-button-outline">
                  View workflow
                </a>
              </div>
            </div>
            <div className="mntn-section-media">
              <div className="p-8 text-center">
                <span className="eyebrow">Daily property brief / 001</span>
                <h3 className="font-serif text-2xl font-medium mb-2">No report yet</h3>
                <p className="text-sm text-slate-400">Your next bulletin becomes the source of truth for every unit, price, zone, and status.</p>
                <div className="mt-6 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.16em] text-[#c9ff3f]"><span>Awaiting upload</span><Sparkles size={14} /></div>
              </div>
            </div>
          </section>

          {/* Section 01 */}
          <section id="features" className="mntn-section-block">
            <div className="mntn-large-number">01</div>
            <div className="mntn-section-content">
              <span className="eyebrow">About the workspace</span>
              <h2>See the whole property picture.</h2>
              <p>
                Openhouse turns a stack of report screenshots into a readable daily record. New units, quiet removals, price changes, and NCR geographies are surfaced before anything is committed to the permanent ledger.
              </p>
              <Button onClick={() => startLogin()} className="mntn-button-outline">
                Enter the workspace <ChevronRight size={15} />
              </Button>
            </div>
            <div className="mntn-section-media">
              <div className="p-8 text-center">
                <BarChart3 className="mx-auto text-[#c9ff3f] mb-4" size={48} />
                <span className="text-xs uppercase tracking-widest text-slate-400">Automated Daily Parsing</span>
              </div>
            </div>
          </section>

          {/* Section 02 */}
          <section className="mntn-section-block reverse">
            <div className="mntn-large-number">02</div>
            <div className="mntn-section-content">
              <span className="eyebrow">02 / OCR intake</span>
              <h2>Every bulletin gets a second look.</h2>
              <p>
                Upload a PDF or a full image set. The review layer groups extracted units, flags missing fields, and keeps the human decision in the loop before the ledger moves.
              </p>
              <Button onClick={() => startLogin()} className="mntn-button-outline">
                See the review flow <ChevronRight size={15} />
              </Button>
            </div>
            <div className="mntn-section-media">
              <div className="p-8 text-center">
                <UploadCloud className="mx-auto text-[#c9ff3f] mb-4" size={48} />
                <span className="text-xs uppercase tracking-widest text-slate-400">PDF + Image Bulletin Intake</span>
              </div>
            </div>
          </section>

          {/* Section 03 */}
          <section id="methodology" className="mntn-section-block">
            <div className="mntn-large-number">03</div>
            <div className="mntn-section-content">
              <span className="eyebrow">03 / The regional ledger</span>
              <h2>Keep every NCR zone in view.</h2>
              <p>
                Confirmed snapshots become a calm, searchable history of the market. Filter Gurgaon, Noida, Ghaziabad, and new corridors as your business grows, then export the exact view you need.
              </p>
              <Button onClick={() => startLogin()} className="mntn-button">
                Open the ledger <ChevronRight size={15} />
              </Button>
            </div>
            <div className="mntn-section-media">
              <div className="p-8 text-center">
                <History className="mx-auto text-[#c9ff3f] mb-4" size={48} />
                <span className="text-xs uppercase tracking-widest text-slate-400">Historical Ledger Integrity</span>
              </div>
            </div>
          </section>

          <footer className="mt-24 pt-12 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-slate-400">
            <div>
              <span className="font-serif font-bold text-white tracking-widest">OPENHOUSE / BIOGAX</span>
              <p className="mt-2">Make every property bulletin easier to read, review, and act on.</p>
            </div>
            <div className="flex gap-8">
              <a href="#features" className="hover:text-white transition-colors">Intelligence</a>
              <a href="#methodology" className="hover:text-white transition-colors">Methodology</a>
              <a href="#about" className="hover:text-white transition-colors">About</a>
            </div>
            <p className="text-xs">Copyright 2026 Openhouse. Inventory intelligence for modern teams.</p>
          </footer>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">
        <Loader2 className="animate-spin text-[#c9ff3f]" size={36} />
      </div>
    );
  }

  // Authenticated Framer-inspired Tracker Workspace
  return (
    <div className="min-h-screen biogax-page biogax-workspace bg-[#f3f6ed] text-[#18372b] selection:bg-[#d9fb68]/40 selection:text-[#18372b]">
      <div className="mntn-shell">
        <header className="mntn-topbar">
          <div className="flex items-center gap-6">
            <a href="/" className="mntn-brand">
              OPENHOUSE <span className="text-[#c9ff3f]">//</span> TRACKER
            </a>
            <span className="hidden md:inline text-xs font-mono text-[#c9ff3f] tracking-widest uppercase">
              // Live inventory workspace
            </span>
          </div>
          <div className="mntn-auth-actions flex items-center gap-4">
            <div className="text-xs font-mono text-slate-400 hidden sm:block">
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </div>
            <a href="/admin" className="mntn-button-outline text-xs py-2 px-3 inline-flex items-center gap-1.5 font-mono">
              <Shield size={13} className="text-[#c9ff3f]" /> Admin Panel
            </a>
            <Button onClick={() => setTab("upload")} className="mntn-button text-xs py-2 px-4">
              <UploadCloud size={14} /> <span className="hidden sm:inline">Upload report</span><span className="sm:hidden">Upload</span>
            </Button>
            
            {/* User Profile & Sign Out Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 bg-[#0d0d0d] border border-white/20 p-1.5 rounded-full hover:border-[#c9ff3f] transition-colors focus:outline-none">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-[#050505] text-[#c9ff3f] font-medium text-xs">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#0d0d0d] border border-white/20 text-white w-48">
                <div className="px-3 py-2 border-b border-white/10">
                  <p className="text-sm font-medium truncate">{user?.name || "User"}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email || ""}</p>
                </div>
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-400 focus:text-red-300 focus:bg-red-950/40 mt-1">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <Tabs value={tab} onValueChange={setTab} className="mt-8">
          <div className="mntn-tabs-list">
            <button role="tab" aria-selected={tab === "dashboard"} data-state={tab === "dashboard" ? "active" : "inactive"} onClick={() => setTab("dashboard")} className="mntn-tab-trigger">
              <BarChart3 size={15} /> Overview
            </button>
            <button role="tab" aria-selected={tab === "inventory"} data-state={tab === "inventory" ? "active" : "inactive"} onClick={() => setTab("inventory")} className="mntn-tab-trigger">
              <HomeIcon size={15} /> Inventory ({inventory.data?.length ?? 0})
            </button>
            <button role="tab" aria-selected={tab === "sourced"} data-state={tab === "sourced" ? "active" : "inactive"} onClick={() => setTab("sourced")} className="mntn-tab-trigger">
              <Plus size={15} /> Sourced
            </button>
            <button role="tab" aria-selected={tab === "sold"} data-state={tab === "sold" ? "active" : "inactive"} onClick={() => setTab("sold")} className="mntn-tab-trigger">
              <Minus size={15} /> Sold
            </button>
            <button role="tab" aria-selected={tab === "history"} data-state={tab === "history" ? "active" : "inactive"} onClick={() => setTab("history")} className="mntn-tab-trigger">
              <History size={15} /> Ledger History
            </button>
            <button role="tab" aria-selected={tab === "upload"} data-state={tab === "upload" ? "active" : "inactive"} onClick={() => setTab("upload")} className="mntn-tab-trigger">
              <UploadCloud size={15} /> Upload & OCR
            </button>
          </div>

          <TabsContent value="dashboard" className="space-y-12">
            <div className="mntn-hero !py-12">
              <div>
                <span className="eyebrow">The Morning Edition</span>
                <h1>Property inventory, <em>in view.</em></h1>
                <p>A clear daily view of what is active, what just arrived, and what quietly left the inventory ledger today.</p>
                <Button onClick={() => setTab("upload")} className="mntn-button">
                  Upload new bulletin <ChevronRight size={15} />
                </Button>
              </div>
              <div className="mntn-metrics">
                <div className="mntn-metric-card gold">
                  <span className="eyebrow !text-[#c9ff3f]">Active Inventory</span>
                  <div className="mntn-metric-value">{dashboard.data?.active ?? 0}</div>
                  <p className="mntn-metric-detail">active units in latest snapshot</p>
                </div>
                <div className="mntn-metric-card green">
                  <span className="eyebrow !text-emerald-400">New / Sourced</span>
                  <div className="mntn-metric-value">{dashboard.data?.sourced ?? 0}</div>
                  <p className="mntn-metric-detail">units first seen today</p>
                </div>
                <div className="mntn-metric-card rose">
                  <span className="eyebrow !text-rose-400">Sold / Removed</span>
                  <div className="mntn-metric-value">{dashboard.data?.sold ?? 0}</div>
                  <p className="mntn-metric-detail">absent from latest report</p>
                </div>
                <div className="mntn-metric-card">
                  <span className="eyebrow">Price Changes</span>
                  <div className="mntn-metric-value">{dashboard.data?.priceChanges ?? 0}</div>
                  <p className="mntn-metric-detail">{dashboard.data?.net ?? 0} net inventory shift</p>
                </div>
              </div>
            </div>

            {/* Trend section */}
            <div className="border-t border-white/10 pt-10">
              <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6">
                <div>
                  <span className="eyebrow">Snapshot History</span>
                  <h2 className="font-serif text-3xl font-medium mt-1">Inventory movement over time</h2>
                </div>
                <Button variant="outline" onClick={downloadOverview} className="mntn-button-outline text-xs"><FileSpreadsheet size={14} /> Download overview</Button>
              </div>
              <div className="bg-[#0d0d0d] border border-white/10 p-8 h-72 flex items-end">
                {trend.length ? (
                  <div className="w-full flex items-end justify-between gap-4 h-52 px-4">
                    {trend.map((point, i) => (
                      <div key={`${point.date}-${i}`} className="flex-1 h-full flex flex-col justify-end items-center gap-2">
                        <span className="text-xs font-mono text-white">{point.count}</span>
                        <div className="w-full bg-slate-800 h-full flex items-end">
                          <div className="w-full bg-[#c9ff3f] transition-all" style={{ height: `${Math.max(15, (point.count / Math.max(...trend.map(t => t.count), 1)) * 100)}%` }} />
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 truncate max-w-[60px]">{point.date}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mntn-empty-state w-full h-full flex items-center justify-center text-slate-400 gap-2 text-sm font-mono">
                    <Sparkles size={16} /> <span>First snapshot needed before movement can be charted.</span>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6">
            <div className="flex flex-col gap-5 py-6 border-b border-white/10">
              <div className="flex flex-col xl:flex-row justify-between xl:items-end gap-4">
                <div>
                  <span className="eyebrow">Active Book / NCR zones</span>
                  <h2 className="font-serif text-3xl font-medium mt-1">Full inventory ledger</h2>
                  <p className="text-sm text-slate-400 mt-2 max-w-2xl">Filter the whole book by broad market, corridor, or micro-zone. New geography labels can be introduced by OCR without changing the taxonomy.</p>
                </div>
                <Button variant="outline" onClick={() => downloadInventorySection("openhouse-inventory.xlsx", "Inventory", activeUnits)} className="mntn-button-outline text-xs"><FileSpreadsheet size={14} /> Download filtered inventory</Button>
              </div>
              <div className="flex flex-col lg:flex-row gap-3">
                <div className="flex items-center gap-3 border border-white/20 px-3 py-2 bg-[#0d0d0d] flex-1 min-w-0">
                  <Search size={16} className="text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search society, unit, zone..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="bg-transparent border-0 outline-none text-sm text-white placeholder:text-slate-500 w-full"
                  />
                </div>
                <select aria-label="Filter by market region" value={marketRegion} onChange={e => { setMarketRegion(e.target.value); setZone("all"); setMicroZone("all"); }} className="mntn-filter-select">
                  <option value="all">All NCR markets</option>
                  {(inventoryFacets.data?.marketRegions ?? []).map(region => <option key={region} value={region}>{region}</option>)}
                </select>
                <select aria-label="Filter by zone" value={zone} onChange={e => { setZone(e.target.value); setMicroZone("all"); }} className="mntn-filter-select">
                  <option value="all">All corridors / zones</option>
                  {(inventoryFacets.data?.zones ?? []).map(zoneName => <option key={zoneName} value={zoneName}>{zoneName}</option>)}
                </select>
                <select aria-label="Filter by micro-zone" value={microZone} onChange={e => setMicroZone(e.target.value)} className="mntn-filter-select">
                  <option value="all">All micro-zones</option>
                  {(inventoryFacets.data?.microZones ?? []).map(micro => <option key={micro} value={micro}>{micro}</option>)}
                </select>
                <select aria-label="Sort inventory" value={sort} onChange={e => setSort(e.target.value as any)} className="mntn-filter-select">
                  <option value="updated">Recent</option>
                  <option value="price">Price</option>
                  <option value="area">Area</option>
                </select>
                <Filter size={15} className="text-slate-400 self-center hidden lg:block" />
              </div>
            </div>

            <ZoneBreakdown groups={zoneSummary} selectedRegion={marketRegion} selectedZone={zone} onSelect={(nextRegion, nextZone) => { setMarketRegion(nextRegion); setZone(nextZone); setMicroZone("all"); }} />
            <DataTable rows={activeUnits} kind="inventory" />
          </TabsContent>

          <TabsContent value="sourced" className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 py-6 border-b border-white/10">
              <div>
                <span className="eyebrow">First Appearance</span>
                <h2 className="font-serif text-3xl font-medium mt-1">Newly sourced units</h2>
              </div>
              <Button variant="outline" onClick={() => downloadInventorySection("openhouse-sourced.xlsx", "Sourced", sourced.data?.map((r: any) => r.unit) ?? [])} className="mntn-button-outline text-xs"><FileSpreadsheet size={14} /> Download sourced</Button>
            </div>
            <DataTable rows={sourced.data?.map((r: any) => r.unit) ?? []} kind="sourced" />
          </TabsContent>

          <TabsContent value="sold" className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 py-6 border-b border-white/10">
              <div>
                <span className="eyebrow">Removed from Book</span>
                <h2 className="font-serif text-3xl font-medium mt-1">Sold or withdrawn units</h2>
              </div>
              <Button variant="outline" onClick={() => downloadInventorySection("openhouse-sold.xlsx", "Sold", sold.data?.map((r: any) => r.unit) ?? [])} className="mntn-button-outline text-xs"><FileSpreadsheet size={14} /> Download sold</Button>
            </div>
            <DataTable rows={sold.data?.map((r: any) => r.unit) ?? []} kind="sold" />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 py-6 border-b border-white/10">
              <div>
                <span className="eyebrow">The Ledger</span>
                <h2 className="font-serif text-3xl font-medium mt-1">Confirmed daily snapshots</h2>
              </div>
              <Button variant="outline" onClick={downloadHistory} className="mntn-button-outline text-xs"><FileSpreadsheet size={14} /> Download history</Button>
            </div>
            <div className="space-y-4">
              {history.data?.length ? (
                history.data.map((s: any) => <HistoryRow key={s.id} snapshot={s} />)
              ) : (
                <div className="py-20 text-center text-slate-400">
                  <p className="font-serif text-xl text-white mb-2">No history yet</p>
                  <p className="text-sm">Confirmed snapshots will appear here with complete OCR audit trails.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 py-6 border-b border-white/10">
              <div>
                <span className="eyebrow">New Snapshot / OCR intake</span>
                <h2 className="font-serif text-3xl font-medium mt-1">Upload report PDFs or images</h2>
                <p className="text-sm text-slate-400 mt-2 max-w-xl">Drop a PDF bulletin or a batch of screenshots. OCR extracts units, prices, and any visible NCR geography labels for review before committing.</p>
              </div>
              {review && <Button variant="outline" onClick={downloadReview} className="mntn-button-outline text-xs"><FileSpreadsheet size={14} /> Download review</Button>}
            </div>

            {review ? (
              <ReviewPanel
                review={review}
                counts={eventCounts}
                onConfirm={confirmReview}
                confirming={confirm.isPending}
                onReset={() => setReview(null)}
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div
                  className={`mntn-dropzone ${dragging ? "dragging" : ""}`}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); e.dataTransfer.files && addFiles(e.dataTransfer.files); }}
                >
                  <input
                    id="file-upload"
                    type="file"
                    accept={uploadAcceptAttribute}
                    multiple
                    className="hidden"
                    onChange={e => e.target.files && addFiles(e.target.files)}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="w-16 h-16 rounded-full border border-white/30 flex items-center justify-center mx-auto mb-4 text-[#c9ff3f]">
                      <UploadCloud size={28} />
                    </div>
                    <h3 className="font-serif text-2xl font-medium mb-2">Drop reports here</h3>
                    <p className="text-sm text-slate-400 mb-4">or click to browse PDFs and local report images</p>
                    <span className="eyebrow">PDF / PNG / JPG / WEBP / GIF · MULTIPLE FILES ACCEPTED</span>
                  </label>
                </div>

                <div className="bg-[#0d0d0d] border border-white/10 p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="font-serif text-xl font-medium mb-4">Selected files ({files.length})</h3>
                    {files.length ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                        {files.map((file, i) => (
                          <div key={`${file.name}-${i}`} className="flex items-center justify-between p-3 bg-[#050505] border border-white/10 text-xs">
                            <div className="flex items-center gap-2 truncate">
                              {file.mimeType === "application/pdf" ? <FileText size={15} className="text-[#c9ff3f] shrink-0" /> : <FileImage size={15} className="text-[#c9ff3f] shrink-0" />}
                              <span className="truncate">{file.name}</span>
                            </div>
                            <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-slate-400 hover:text-white">
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">No files chosen yet. Select a PDF or image bulletin to begin OCR extraction.</p>
                    )}
                  </div>

                  <Button
                    onClick={handleExtract}
                    disabled={!files.length || extract.isPending}
                    className="mntn-button w-full justify-center mt-6"
                  >
                    {extract.isPending ? (
                      <>
                        <Loader2 className="animate-spin" size={16} /> Analyzing report files...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} /> Run OCR & review changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>


      </div>
    </div>
  );
}

function ZoneBreakdown({ groups, selectedRegion, selectedZone, onSelect }: { groups: Array<{ region: string; zone: string; count: number }>; selectedRegion: string; selectedZone: string; onSelect: (region: string, zone: string) => void }) {
  return (
    <section className="mntn-zone-breakdown" aria-label="Inventory by NCR zone">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3 mb-4">
        <div>
          <span className="eyebrow">Market split</span>
          <h3 className="font-serif text-2xl font-medium mt-1">Inventory by NCR zone</h3>
        </div>
        <span className="text-xs font-mono text-slate-500">{groups.reduce((sum, group) => sum + group.count, 0)} visible units</span>
      </div>
      {groups.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {groups.map(group => {
            const isSelected = selectedRegion === group.region && selectedZone === group.zone;
            return (
              <button key={`${group.region}-${group.zone}`} onClick={() => onSelect(isSelected ? "all" : group.region, isSelected ? "all" : group.zone)} className={`mntn-zone-card text-left ${isSelected ? "is-selected" : ""}`}>
                <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#c9ff3f]">{group.region}</span>
                <span className="mt-2 block text-sm text-white">{group.zone}</span>
                <span className="mt-3 block text-2xl font-semibold tracking-[-0.06em]">{group.count}</span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">units</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mntn-empty-state py-8 text-sm font-mono text-slate-400">Zone labels will appear after the first confirmed snapshot.</div>
      )}
    </section>
  );
}

function DataTable({ rows, kind }: { rows: any[]; kind: string }) {
  return (
    <div className="mntn-table-card">
      <div className="mntn-table-head">
        <span>Society / Unit</span>
        <span>Area</span>
        <span>Configuration</span>
        <span>Status</span>
        <span>Ask Price</span>
        <span>{kind === "inventory" ? "Last Updated" : "Date"}</span>
      </div>
      {rows.length ? (
        rows.map((u, i) => (
          <div key={`${u.unitKey ?? u.id}-${i}`} className="mntn-table-row">
            <div>
              <strong>{u.societyName}</strong>
              <span className="block text-xs">{u.unitNumber}{u.floor ? ` · floor ${u.floor}` : ""}</span>
            </div>
            <span>{u.areaSqft ? `${u.areaSqft} sqft` : "—"}</span>
            <span>{u.configuration || "—"}</span>
            <span><Badge variant="secondary" className="bg-white/10 text-white font-normal border-0 text-xs">{u.status || (kind === "sourced" ? "Newly Sourced" : "Active")}</Badge></span>
            <span className="mntn-price">{formatPrice(u.askPriceValue, u.askPriceDisplay)}</span>
            <span>{formatDate(kind === "sourced" ? u.firstSourcedAt : kind === "sold" ? u.lastSeenAt : u.lastSeenAt)}</span>
          </div>
        ))
      ) : (
        <div className="py-20 text-center text-slate-400">
          <p className="font-serif text-xl text-white mb-2">No {kind} units found</p>
          <p className="text-sm">This category will populate as daily bulletins are confirmed.</p>
        </div>
      )}
    </div>
  );
}

function HistoryRow({ snapshot }: { snapshot: any }) {
  const assets = trpc.snapshotAssets.useQuery({ snapshotId: snapshot.id });
  return (
    <div className="bg-[#0d0d0d] border border-white/10 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
      <div>
        <span className="eyebrow">Snapshot</span>
        <h4 className="font-serif text-xl font-medium mt-1">{formatDate(snapshot.snapshotDate)}</h4>
        <p className="text-xs text-slate-400 mt-1">{snapshot.unitCount} units confirmed · {snapshot.sourceFileCount} source screenshots · {snapshot.completenessScore}% completeness</p>
      </div>
      <div>
        {snapshot.warningMessage ? (
          <span className="text-xs text-amber-400 flex items-center gap-1.5 font-mono"><CircleAlert size={14} /> Review noted</span>
        ) : (
          <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-mono"><Check size={14} /> Clean confirmation</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {assets.data?.map((a: any) => (
          <a key={a.id} href={a.storageUrl} target="_blank" rel="noreferrer" className="text-xs text-[#c9ff3f] hover:underline flex items-center gap-1 bg-[#050505] px-3 py-1.5 border border-white/10">
            <FileImage size={13} /> {a.fileName}
          </a>
        ))}
      </div>
    </div>
  );
}

function ReviewPanel({ review, counts, onConfirm, confirming, onReset }: { review: any; counts: any; onConfirm: () => void; confirming: boolean; onReset: () => void }) {
  return (
    <div className="bg-[#0d0d0d] border border-white/10 p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="eyebrow">OCR Extraction Ready</span>
          <h3 className="font-serif text-3xl font-medium mt-1">Review before committing</h3>
          <p className="text-sm text-slate-400 mt-1">{review.units.length} unique units extracted from {review.processedImageCount ?? review.assets.length} screenshots.</p>
        </div>
        <div className="w-20 h-20 rounded-full border-2 border-[#c9ff3f] flex flex-col items-center justify-center text-[#c9ff3f]">
          <strong className="font-serif text-2xl">{review.completenessScore}%</strong>
          <span className="text-[9px] uppercase tracking-widest font-mono">Complete</span>
        </div>
      </div>

      {review.warning && (
        <Alert className="bg-amber-950/40 border-amber-500/50 text-amber-200">
          <CircleAlert size={16} className="text-amber-400" />
          <div className="ml-2">
            <AlertTitle className="font-serif font-medium">Completeness warning</AlertTitle>
            <AlertDescription className="text-xs text-amber-300">{review.warning}</AlertDescription>
          </div>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-y border-white/10 py-6">
        <div className="bg-[#050505] p-4 border border-white/10 flex items-center gap-4">
          <div className="text-emerald-400"><Plus size={20} /></div>
          <div>
            <div className="font-serif text-2xl">{counts.sourced}</div>
            <div className="text-xs text-slate-400 uppercase tracking-widest font-mono">Sourced units</div>
          </div>
        </div>
        <div className="bg-[#050505] p-4 border border-white/10 flex items-center gap-4">
          <div className="text-rose-400"><TrendingDown size={20} /></div>
          <div>
            <div className="font-serif text-2xl">{counts.sold}</div>
            <div className="text-xs text-slate-400 uppercase tracking-widest font-mono">Potentially sold</div>
          </div>
        </div>
        <div className="bg-[#050505] p-4 border border-white/10 flex items-center gap-4">
          <div className="text-[#c9ff3f]"><TrendingUp size={20} /></div>
          <div>
            <div className="font-serif text-2xl">{counts.updated}</div>
            <div className="text-xs text-slate-400 uppercase tracking-widest font-mono">Price / Unit updates</div>
          </div>
        </div>
      </div>

      <div className="mntn-table-card">
        <div className="mntn-table-head">
          <span>Unit</span>
          <span>Area</span>
          <span>Type</span>
          <span>Floor</span>
          <span>Status</span>
          <span>Price</span>
        </div>
        {review.units.slice(0, 10).map((u: any, i: number) => (
          <div key={`${u.unitNumber}-${u.societyName}-${i}`} className="mntn-table-row">
            <div>
              <strong>{u.societyName}</strong>
              <span className="block text-xs">{u.unitNumber}</span>
            </div>
            <span>{u.areaSqft || "—"}</span>
            <span>{u.configuration || "—"}</span>
            <span>{u.floor || "—"}</span>
            <span><Badge variant="secondary" className="bg-white/10 text-white font-normal border-0 text-xs">{u.status || "Active"}</Badge></span>
            <span className="mntn-price">{formatPrice(u.askPriceValue, u.askPriceDisplay)}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-4 pt-4">
        <Button variant="outline" onClick={onReset} className="border-white/20 text-white hover:bg-white/10">
          Discard review
        </Button>
        <Button onClick={onConfirm} disabled={confirming} className="mntn-button">
          {confirming ? <><Loader2 className="animate-spin" size={16} /> Committing...</> : <><Check size={16} /> Confirm snapshot</>}
        </Button>
      </div>
    </div>
  );
}
