Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const message = body.message || "";
    const history = body.history || [];

    if (!message) {
      return Response.json({ error: "No message provided" }, { status: 400, headers: corsHeaders });
    }

    const NVIDIA_KEY = Deno.env.get("NVIDIA_API_KEY") || "";

    const messages = [
      {
        role: "system",
        content: `You are J.A.R.V.I.S — Just A Rather Very Intelligent System — Tony Stark's personal AI assistant. You speak in a calm, deep, sophisticated British tone. You are highly intelligent, composed, witty, and always helpful. Refer to the user as "sir". Keep responses concise (2-4 sentences) unless asked for more detail. Current date and time: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Calcutta" })} IST`,
      },
      ...history.slice(-12),
      { role: "user", content: message },
    ];

    // Call NVIDIA NIM API (OpenAI-compatible)
    const aiResp = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${NVIDIA_KEY}`,
      },
      body: JSON.stringify({
        model: "meta/llama-3.3-70b-instruct",
        messages,
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 400,
        stream: false,
      }),
    });

    let reply = "I am here and fully operational, sir. How may I assist you?";

    if (aiResp.ok) {
      const data = await aiResp.json();
      reply = data?.choices?.[0]?.message?.content?.trim() || reply;
    } else {
      const err = await aiResp.json().catch(() => ({}));
      console.error("NVIDIA API error:", JSON.stringify(err));
      reply = `I apologize, sir. The AI core encountered an issue: ${err?.message || err?.error?.message || aiResp.status}`;
    }

    return Response.json({ reply }, { headers: corsHeaders });

  } catch (err: any) {
    console.error("Function error:", err.message);
    return Response.json({
      reply: "I apologize, sir. An unexpected error occurred. Systems are self-correcting.",
      error: err.message,
    }, { status: 500, headers: corsHeaders });
  }
});
