import { createClient } from "@base44/sdk";

const base44 = createClient({
  appId: process.env.BASE44_APP_ID!,
});

export default async function jarvisChat(req: Request): Promise<Response> {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    if (!message) {
      return new Response(JSON.stringify({ error: "No message provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Save conversation to DB
    try {
      await base44.asServiceRole.entities.JarvisLog.create({
        user_message: message,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      // DB logging optional — don't fail if entity doesn't exist yet
    }

    // Call AI
    const aiResp = await fetch("https://api.base44.com/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.BASE44_SERVICE_TOKEN!,
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: `You are J.A.R.V.I.S — Just A Rather Very Intelligent System — Tony Stark's AI assistant. 
You speak in a calm, sophisticated, slightly formal British tone. You are helpful, witty, and always composed.
You refer to the user as "sir" occasionally. Keep responses concise (2-4 sentences) and impactful.
You can answer questions, tell jokes, give information, help with tasks, and more.
Current time: ${new Date().toLocaleString()}`,
          },
          {
            role: "user",
            content: message,
          },
        ],
        model: "gpt-4o-mini",
        max_tokens: 300,
      }),
    });

    let reply = "I'm here and operational, sir. How may I assist you?";

    if (aiResp.ok) {
      const aiData = await aiResp.json();
      reply =
        aiData?.choices?.[0]?.message?.content ||
        aiData?.message ||
        aiData?.reply ||
        reply;
    }

    // Update log with reply
    try {
      await base44.asServiceRole.entities.JarvisLog.create({
        user_message: message,
        jarvis_reply: reply,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {}

    return new Response(JSON.stringify({ reply }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        reply:
          "I apologize, sir. I encountered an unexpected error. Systems are self-correcting.",
        error: err.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
}
