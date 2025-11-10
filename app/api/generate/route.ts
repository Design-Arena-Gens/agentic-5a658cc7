import { NextRequest } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { brand, kind, context } = body ?? {};

  const system = `You are a seasoned healthcare brand social media strategist for ${brand?.name ?? "a healthcare org"}. Tone: ${brand?.tone ?? "trustworthy"}. Audience: ${brand?.audience ?? "patients and families in India"}. Keywords: ${(brand?.keywords ?? []).join(", ")}. Keep content culturally sensitive to India.`;

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    // Fallback heuristic content
    if (kind === "hashtags") {
      return new Response(JSON.stringify({ hashtags: ["#BharatLifeCare", "#Healthcare", "#Wellness", "#Diagnostics", "#PatientCare"] }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    const title = context?.title || "Your Health, Our Priority";
    const copy = `At ${brand?.name ?? "our care centers"}, we combine compassion with advanced diagnostics to support your family's wellness journey. Book your checkup today. #Care #Trust`;
    return new Response(JSON.stringify({ title, copy }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  try {
    const prompt = kind === "hashtags"
      ? `Suggest 8-12 concise, non-repetitive, Indian audience-friendly hashtags for a post about: "${context?.title ?? "healthcare"}". Avoid banned or misleading tags. Return as a JSON array of strings.`
      : `Write a concise, high-engagement social media post (70-120 words) for ${brand?.name}. Platforms: ${(context?.platforms ?? []).join(", ")}. Title: ${context?.title ?? "Health & Wellness"}. Include a natural CTA. Avoid medical claims. Return plain text body; no markdown.`;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.8,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!resp.ok) {
      const text = await resp.text();
      return new Response(JSON.stringify({ error: "upstream_error", detail: text }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    if (kind === "hashtags") {
      try {
        const tags = JSON.parse(content);
        return new Response(JSON.stringify({ hashtags: Array.isArray(tags) ? tags.slice(0, 12) : [] }), { status: 200, headers: { "Content-Type": "application/json" } });
      } catch {
        const tags = content
          .split(/[#\n,]/)
          .map((s: string) => s.trim())
          .filter(Boolean)
          .slice(0, 12)
          .map((t: string) => (t.startsWith("#") ? t : `#${t}`));
        return new Response(JSON.stringify({ hashtags: tags }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
    }

    const title = context?.title || "Campaign Post";
    const copy = content.trim();
    return new Response(JSON.stringify({ title, copy }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: "generation_failed", message: e?.message || "unknown" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
