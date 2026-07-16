import { GoogleGenerativeAI } from '@google/generative-ai';
import { Project, AIAnalysis, Uncertainty } from '../types/project';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    if (!API_KEY) throw new Error('VITE_GEMINI_API_KEY not configured');
    genAI = new GoogleGenerativeAI(API_KEY);
  }
  return genAI;
}

interface GeminiAnalysisResult {
  summary: string;
  status: 'im_rahmen' | 'ueberschreitung' | 'warnung';
  budgetAssessment: string;
  uncertainties: { field: string; message: string; severity: 'low' | 'medium' | 'high' }[];
  topRisks: string[];
  recommendations: string[];
  confidence: number;
}

export async function analyzeProjectWithGemini(project: Project): Promise<AIAnalysis> {
  const client = getClient();
  const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const budgetUtilization = project.budgetPlan > 0
    ? ((project.budgetIst / project.budgetPlan) * 100).toFixed(1)
    : 'unbekannt';

  const openOrderTotal = (project.openOrders || []).reduce((s, o) => s + o.amount, 0);

  const prompt = `
Du bist ein Finanz-Analyst für öffentliche Institutionen. Analysiere das folgende Projekt und erstelle eine strukturierte JSON-Analyse.

WICHTIG: Du MUSST explizit angeben, wenn du dir bei einer Aussage NICHT sicher bist. Vermeide Halluzinationen. Wenn Daten fehlen oder unklar sind, kennzeichne das als Unsicherheit.

PROJEKTDATEN:
- Name: ${project.name}
- Nummer: ${project.number}
- Status: ${project.status}
- Planbudget: ${project.budgetPlan.toLocaleString('de-DE')} €
- IST-Kosten: ${project.budgetIst.toLocaleString('de-DE')} €
- Budgetauslastung: ${budgetUtilization}%
- Offene Aufträge (noch nicht gebucht): ${openOrderTotal.toLocaleString('de-DE')} €
- Erwartete Gesamtkosten: ${(project.budgetIst + openOrderTotal).toLocaleString('de-DE')} €
${project.costTypes?.length ? `- Kostenarten: ${project.costTypes.map((c) => `${c.name}: ${c.amount.toLocaleString('de-DE')}€`).join(', ')}` : ''}
${project.bookingMatches ? `
- Buchungsabgleich:
  - Vollständige Matches: ${project.bookingMatches.vollMatch}
  - Teilmatches: ${project.bookingMatches.teilMatch}
  - Klärungsbedarf: ${project.bookingMatches.klaerungsbedarf}
  - Nur Sage erwartet: ${project.bookingMatches.nurSage}
  - Aktives Risikovolumen: ${project.bookingMatches.risikovolumen.toLocaleString('de-DE')} €` : ''}

Antworte NUR mit validem JSON in diesem Format:
{
  "summary": "Kurze Zusammenfassung (2-3 Sätze) auf Deutsch",
  "status": "im_rahmen" | "ueberschreitung" | "warnung",
  "budgetAssessment": "Bewertung der Budgetsituation",
  "uncertainties": [
    {
      "field": "Feldname",
      "message": "Beschreibung der Unsicherheit",
      "severity": "low" | "medium" | "high"
    }
  ],
  "topRisks": ["Risiko 1", "Risiko 2"],
  "recommendations": ["Empfehlung 1", "Empfehlung 2"],
  "confidence": 0.0-1.0
}

Wenn du dir bei einer Zuordnung oder Aussage nicht sicher bist, füge eine entsprechende Unsicherheit hinzu. Sei konservativ und transparent.
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in Gemini response');

    const parsed: GeminiAnalysisResult = JSON.parse(jsonMatch[0]);

    return {
      summary: parsed.summary || 'Analyse abgeschlossen',
      uncertainties: (parsed.uncertainties || []).map((u) => ({
        field: u.field,
        message: u.message,
        severity: u.severity as Uncertainty['severity'],
      })),
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.7)),
      analyzedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('Gemini analysis failed:', err);
    return {
      summary: '⚠️ KI-Analyse konnte nicht durchgeführt werden. Bitte manuell prüfen.',
      uncertainties: [
        {
          field: 'KI-Analyse',
          message: err instanceof Error ? err.message : 'Unbekannter Fehler',
          severity: 'high',
        },
      ],
      confidence: 0,
      analyzedAt: new Date().toISOString(),
    };
  }
}
