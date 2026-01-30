/**
 * ALIGNMENT ANALYSIS ENGINE
 * This endpoint performs RAG-like (Retrieval-Augmented Generation) grounding
 * by extracting text from a project's Guidelines PDF and comparing it 
 * against a specific DataRecord using an LLM.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateCompletionWithUsage } from '@/lib/ai';
// @ts-ignore - pdf-parse lacks modern TS definitions but is the most stable for Node PDF scraping.
import pdf from 'pdf-parse/lib/pdf-parse.js';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { recordId, forceRegenerate } = await req.json();

        if (!recordId) {
            return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
        }

        // 1. DATA RETRIEVAL
        const record = await prisma.dataRecord.findUnique({
            where: { id: recordId },
            include: { project: true }
        });

        if (!record) {
            return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }

        // --- IMPROVED SCORE PARSER ---
        // Handles "Score: 85", "Score: 4/5", "Score: 8/10", "Score: 90/100"
        const extractAlignmentScore = (text: string): number | null => {
            // Regex captures the value (Group 1) and optional denominator (Group 2)
            // Looks for "ALIGNMENT_SCORE", "ALIGNMENT SCORE", or just "SCORE" near the start
            const match = text.match(/(?:ALIGNMENT|ALIGNMENT_SCORE)[\s_]*[:\s]*(\d+)(?:\s*\/\s*(\d+))?/i);

            if (match) {
                let score = parseInt(match[1], 10);
                const scale = match[2] ? parseInt(match[2], 10) : 100; // Default to 100 if no denominator

                // Normalize weird scales (like 1/5 or 8/10) to 0-100
                if (scale === 5) score = score * 20;
                else if (scale === 10) score = score * 10;
                else if (scale !== 100) {
                    // Fallback for weird denominators: (Score / Scale) * 100
                    score = Math.round((score / scale) * 100);
                }

                if (score >= 0 && score <= 100) return score;
            }
            return null;
        };

        // OPTIMIZATION: Return cached analysis if available
        if (record.alignmentAnalysis && !forceRegenerate) {
            const alignmentScore = extractAlignmentScore(record.alignmentAnalysis);
            return NextResponse.json({
                evaluation: record.alignmentAnalysis,
                alignmentScore,
                recordContent: record.content,
                projectName: record.project.name,
                recordType: record.type,
                metadata: record.metadata
            });
        }

        const { guidelines, name: projectName } = record.project;

        if (!guidelines) {
            return NextResponse.json({ error: 'No guidelines uploaded for this project.' }, { status: 400 });
        }

        // 2. PDF SCRAPING
        let guidelinesText = '';
        try {
            const base64Data = guidelines.split(';base64,').pop();
            if (base64Data) {
                const buffer = Buffer.from(base64Data, 'base64');
                const data = await pdf(buffer);
                guidelinesText = data.text;
            }
        } catch (err: any) {
            console.error('PDF Extraction Error:', err);
            return NextResponse.json({
                error: `Failed to extract text from guidelines PDF: ${err.message}`,
                details: err.stack
            }, { status: 500 });
        }

        if (!guidelinesText) {
            return NextResponse.json({ error: 'Guidelines PDF appears to be empty or unreadable.' }, { status: 400 });
        }

        // 3. AI EVALUATE
        // --- UPDATED SYSTEM PROMPT: Enforce "Engine" persona over "Analyst" persona ---
        const systemPrompt = `You are an Automated Compliance Engine for Project ${projectName}. You are NOT a creative writer. Your job is to binary-match content against guidelines and output raw data followed by reasoning. You must strictly adhere to the requested output format.`;

        // --- UPDATED USER PROMPT: Instructions at bottom, Negative Constraints added ---
        const prompt = `
=== REFERENCE GUIDELINES ===
${guidelinesText}
=== END OF GUIDELINES ===

=== CONTENT TO EVALUATE ===
"""
${record.content}
"""
=== END OF CONTENT ===

You must evaluate the CONTENT above against the REFERENCE GUIDELINES.

### STRICT INSTRUCTIONS:
1.  **Calculate an Alignment Score** from 0 to 100.
    * 0 = Complete violation.
    * 100 = Perfect compliance.
    * **DO NOT USE A 1-5 SCALE.** You must use 0-100 integers only.
2.  **Output Format**:
    * Start your response EXACTLY with: "ALIGNMENT_SCORE: [number]"
    * Do NOT add intro text like "Here is the report" or "AI Evaluation".
    * Do NOT format the score line with Markdown (no bold **, no headers #).

### REQUIRED RESPONSE TEMPLATE:
ALIGNMENT_SCORE: <Integer 0-100>

## Detailed Analysis
[Bulleted list of which guidelines were followed vs violated]

## Suggested Improvements
[Specific actionable changes to fix the content]
`;

        // CALL LLM
        const result = await generateCompletionWithUsage(prompt, systemPrompt);

        // Extract score
        const alignmentScore = extractAlignmentScore(result.content);

        // 4. PERSISTENCE
        await prisma.dataRecord.update({
            where: { id: recordId },
            data: { alignmentAnalysis: result.content }
        });

        return NextResponse.json({
            evaluation: result.content,
            alignmentScore,
            recordContent: record.content,
            projectName,
            recordType: record.type,
            metadata: record.metadata,
            usage: result.usage,
            provider: result.provider
        });

    } catch (error: any) {
        console.error('Comparison API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}