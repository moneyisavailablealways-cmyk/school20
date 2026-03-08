import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentName, riskLevel, riskScore, avgMarks, prevAvgMarks, marksTrend, failingSubjects, totalSubjects, attendanceRate, insights, recommendations, subjectDetails } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an academic advisor AI for a school management system in Africa. You analyze student performance data and provide actionable, empathetic, and specific predictions and recommendations.

Your responses must be:
- Specific to the student's data (reference actual numbers)
- Actionable with concrete steps
- Encouraging but honest
- Written for teachers and administrators
- Culturally sensitive to African educational contexts

Format your response as a JSON object with these fields:
- prediction: A 2-3 sentence prediction about the student's likely performance trajectory
- strengths: Array of 1-3 identified strengths
- concerns: Array of 1-3 key concerns
- interventions: Array of 3-5 specific, actionable intervention steps
- parentMessage: A brief, empathetic message suitable to share with parents`;

    const userPrompt = `Analyze this student's academic performance:

Student: ${studentName}
Risk Level: ${riskLevel} (Score: ${riskScore}/100)
Current Average: ${avgMarks}%
Previous Average: ${prevAvgMarks ?? 'N/A'}%
Performance Trend: ${marksTrend !== null ? (marksTrend > 0 ? '+' : '') + marksTrend + ' points' : 'No comparison data'}
Failing Subjects: ${failingSubjects} out of ${totalSubjects}
Attendance Rate: ${attendanceRate ?? 'N/A'}%

Current Insights: ${JSON.stringify(insights || [])}
${subjectDetails ? `Subject-level data: ${JSON.stringify(subjectDetails)}` : ''}

Provide a detailed analysis with predictions, strengths, concerns, specific interventions, and a parent-friendly message.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_analysis",
              description: "Provide structured academic risk analysis for a student",
              parameters: {
                type: "object",
                properties: {
                  prediction: { type: "string", description: "2-3 sentence prediction about performance trajectory" },
                  strengths: { type: "array", items: { type: "string" }, description: "1-3 identified strengths" },
                  concerns: { type: "array", items: { type: "string" }, description: "1-3 key concerns" },
                  interventions: { type: "array", items: { type: "string" }, description: "3-5 specific intervention steps" },
                  parentMessage: { type: "string", description: "Brief empathetic message for parents" },
                },
                required: ["prediction", "strengths", "concerns", "interventions", "parentMessage"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings → Workspace → Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const analysis = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(analysis), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: try to parse from content
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      try {
        const parsed = JSON.parse(content);
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ prediction: content, strengths: [], concerns: [], interventions: [], parentMessage: "" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    throw new Error("No valid response from AI");
  } catch (e) {
    console.error("ai-risk-insights error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
