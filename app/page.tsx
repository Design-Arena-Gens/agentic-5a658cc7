import AgentPanel from "@/components/AgentPanel";

export default function Page() {
  return (
    <div>
      <div className="container py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-800">Social Media Manager AI</h2>
          <p className="text-sm text-slate-600">Plan, generate, approve, and schedule content for Bharat Life Care.</p>
        </div>
      </div>
      <AgentPanel />
    </div>
  );
}
