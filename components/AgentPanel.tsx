"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarIcon, CheckCircle2, Clock, Loader2, MessageSquarePlus, Rocket, Sparkles, Upload } from "lucide-react";
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";

export type Platform = "instagram" | "facebook" | "twitter" | "linkedin" | "youtube";
export type PostStatus = "ideation" | "draft" | "approved" | "scheduled" | "published";

export interface ScheduledPost {
  id: string;
  title: string;
  copy: string;
  hashtags: string[];
  imageUrl?: string;
  platforms: Platform[];
  scheduledAt?: string; // ISO string
  status: PostStatus;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  useEffect(() => {
    const json = localStorage.getItem(key);
    if (json) setValue(JSON.parse(json));
  }, [key]);
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue] as const;
}

export default function AgentPanel() {
  const [posts, setPosts] = useLocalStorage<ScheduledPost[]>("blc_posts_v1", []);
  const [brand, setBrand] = useLocalStorage("blc_brand_v1", {
    name: "Bharat Life Care",
    tone: "Empathetic, informative, trustworthy",
    audience: "Patients, families, and healthcare professionals in India",
    keywords: ["healthcare", "wellness", "diagnostics", "trust", "care"],
  });
  const [draft, setDraft] = useState<Partial<ScheduledPost>>({
    id: uid(),
    title: "",
    copy: "",
    hashtags: [],
    platforms: ["instagram", "facebook", "linkedin"],
    status: "ideation",
  });

  const [monthOffset, setMonthOffset] = useState(0);
  const monthStart = useMemo(() => startOfMonth(addMonths(new Date(), monthOffset)), [monthOffset]);
  const monthEnd = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const [generating, setGenerating] = useState(false);

  const dayPosts = (day: Date) => posts.filter(p => p.scheduledAt && isSameDay(new Date(p.scheduledAt), day));

  async function generateDraft(kind: "post" | "hashtags") {
    try {
      setGenerating(true);
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand,
          kind,
          context: {
            title: draft.title,
            copy: draft.copy,
            platforms: draft.platforms,
          }
        })
      });
      const data = await res.json();
      if (kind === "post") {
        setDraft(d => ({ ...d, title: data.title, copy: data.copy }));
      } else {
        setDraft(d => ({ ...d, hashtags: data.hashtags ?? [] }));
      }
    } catch (e) {
      console.error(e);
      alert("Generation failed. Using a smart fallback.");
      if (kind === "post") {
        setDraft(d => ({ ...d, copy: `Caring for every heartbeat. At ${brand.name}, your wellness is our priority. #Health #Care` }));
      } else {
        setDraft(d => ({ ...d, hashtags: ["#BharatLifeCare", "#Healthcare", "#Wellness", "#Diagnostics", "#PatientCare"] }));
      }
    } finally {
      setGenerating(false);
    }
  }

  function saveDraft(status: PostStatus) {
    const toSave: ScheduledPost = {
      id: draft.id ?? uid(),
      title: draft.title?.trim() || "Untitled",
      copy: draft.copy?.trim() || "",
      hashtags: draft.hashtags ?? [],
      imageUrl: draft.imageUrl,
      platforms: draft.platforms ?? ["instagram"],
      scheduledAt: draft.scheduledAt,
      status,
    };
    setPosts(prev => {
      const exists = prev.some(p => p.id === toSave.id);
      return exists ? prev.map(p => (p.id === toSave.id ? toSave : p)) : [toSave, ...prev];
    });
    setDraft({ id: uid(), title: "", copy: "", hashtags: [], platforms: draft.platforms, status: "ideation" });
  }

  function exportJson() {
    const data = JSON.stringify({ brand, posts }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bharat-life-care-social-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJson(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (parsed.brand) setBrand(parsed.brand);
        if (Array.isArray(parsed.posts)) setPosts(parsed.posts);
      } catch (e) {
        alert("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="container py-8 space-y-8">
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Content Draft</h2>
            <div className="flex items-center gap-3">
              <button className="btn-secondary" onClick={exportJson}><Upload className="h-4 w-4"/>Export</button>
              <label className="btn-secondary cursor-pointer">
                <input type="file" className="hidden" accept="application/json" onChange={(e) => e.target.files && importJson(e.target.files[0])} />
                Import
              </label>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <input
                value={draft.title || ""}
                onChange={(e) => setDraft(d => ({ ...d, title: e.target.value }))}
                placeholder="Post title"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <textarea
                value={draft.copy || ""}
                onChange={(e) => setDraft(d => ({ ...d, copy: e.target.value }))}
                placeholder="Write or generate the post copy..."
                rows={10}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                {draft.hashtags?.map((h, i) => (
                  <span key={i} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{h}</span>
                ))}
              </div>
              <div className="flex gap-3">
                <button disabled={generating} onClick={() => generateDraft("post")} className="btn">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4"/>}
                  Generate Copy
                </button>
                <button disabled={generating} onClick={() => generateDraft("hashtags")} className="btn-secondary">
                  <MessageSquarePlus className="h-4 w-4"/>
                  Suggest Hashtags
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="card p-4">
                <p className="text-xs font-medium text-slate-500 mb-2">Platforms</p>
                <div className="flex flex-wrap gap-2">
                  {["instagram","facebook","twitter","linkedin","youtube"].map(p => (
                    <button
                      key={p}
                      onClick={() => setDraft(d => ({...d, platforms: (d.platforms ?? []).includes(p as any) ? (d.platforms ?? []).filter(x => x!==p) : [...(d.platforms ?? []), p as any]}))}
                      className={`px-3 py-1 rounded-full text-xs border ${draft.platforms?.includes(p as any) ? "bg-brand text-white border-brand" : "bg-white text-slate-700 border-slate-300"}`}
                    >{p}</button>
                  ))}
                </div>
              </div>

              <div className="card p-4">
                <p className="text-xs font-medium text-slate-500 mb-2">Schedule</p>
                <input
                  type="datetime-local"
                  value={draft.scheduledAt ? format(new Date(draft.scheduledAt), "yyyy-MM-dd'T'HH:mm") : ""}
                  onChange={(e) => setDraft(d => ({...d, scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : undefined}))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => saveDraft("draft")} className="btn-secondary"><Clock className="h-4 w-4"/>Save Draft</button>
                <button onClick={() => saveDraft("approved")} className="btn-secondary"><CheckCircle2 className="h-4 w-4"/>Mark Approved</button>
                <button onClick={() => saveDraft("scheduled")} className="btn"><Rocket className="h-4 w-4"/>Schedule</button>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-5" id="workflow">
          <h2 className="font-semibold text-slate-800 mb-4">Workflow</h2>
          <ol className="space-y-3 text-sm text-slate-700">
            <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-brand"/> Ideation</li>
            <li className="flex items-center gap-2"><MessageSquarePlus className="h-4 w-4 text-brand"/> Drafting</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-brand"/> Review & Approval</li>
            <li className="flex items-center gap-2"><CalendarIcon className="h-4 w-4 text-brand"/> Scheduling</li>
            <li className="flex items-center gap-2"><Rocket className="h-4 w-4 text-brand"/> Publishing</li>
          </ol>
          <p className="mt-3 text-xs text-slate-500">Manage end-to-end: generate content, iterate drafts, approve, schedule, and publish.
          Export/Import JSON to collaborate or backup.</p>
        </div>
      </section>

      <section id="calendar" className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800">Content Calendar ? {format(monthStart, "MMMM yyyy")}</h2>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setMonthOffset(o => o-1)}>Prev</button>
            <button className="btn-secondary" onClick={() => setMonthOffset(0)}>Today</button>
            <button className="btn-secondary" onClick={() => setMonthOffset(o => o+1)}>Next</button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-3">
          {days.map(day => (
            <div key={day.toISOString()} className="rounded-lg border border-slate-200 bg-white p-2">
              <div className="text-xs font-medium text-slate-500 mb-2">{format(day, "EEE d")}</div>
              <div className="space-y-2">
                {dayPosts(day).map(p => (
                  <div key={p.id} className="rounded-md border border-slate-200 p-2 hover:bg-slate-50 cursor-pointer" onClick={() => setDraft(p)}>
                    <p className="text-xs font-semibold text-slate-700 truncate">{p.title}</p>
                    <p className="text-[10px] text-slate-500">{p.platforms.join(", ")} ? {p.status}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="assets" className="card p-5">
        <h2 className="font-semibold text-slate-800 mb-3">Brand Settings</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <div className="md:col-span-1">
            <label className="text-xs text-slate-500">Brand name</label>
            <input value={brand.name} onChange={e => setBrand({ ...brand, name: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"/>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-slate-500">Tone of voice</label>
            <input value={brand.tone} onChange={e => setBrand({ ...brand, tone: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"/>
          </div>
          <div className="md:col-span-3">
            <label className="text-xs text-slate-500">Audience</label>
            <input value={brand.audience} onChange={e => setBrand({ ...brand, audience: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"/>
          </div>
          <div className="md:col-span-3">
            <label className="text-xs text-slate-500">Keywords (comma separated)</label>
            <input
              value={brand.keywords.join(", ")}
              onChange={e => setBrand({ ...brand, keywords: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
