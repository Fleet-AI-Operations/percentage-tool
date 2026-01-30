/**
 * ANALYTICS ENGINE - Specialized for bulk processing and heavy-duty LLM tasks.
 */
import { prisma } from './prisma';
import { generateCompletion } from './ai';
// @ts-ignore
import pdf from 'pdf-parse/lib/pdf-parse.js';

/**
 * ENTRY POINT: startBulkAlignment
 */
export async function startBulkAlignment(projectId: string) {
    // Check if there's already an active job for this project
    const activeJob = await prisma.analyticsJob.findFirst({
        where: { projectId, status: 'PROCESSING' }
    });
    if (activeJob) return activeJob.id;

    // Identify records that need alignment analysis
    const targetCount = await prisma.dataRecord.count({
        where: { projectId, alignmentAnalysis: null }
    });

    if (targetCount === 0) return null;

    const job = await prisma.analyticsJob.create({
        data: {
            projectId,
            status: 'PROCESSING',
            totalRecords: targetCount,
            processedCount: 0
        }
    });

    // Fire and forget the background worker
    runBulkAlignment(job.id, projectId).catch(err => console.error('Bulk Alignment Error:', err));

    return job.id;
}

/**
 * BACKGROUND WORKER: runBulkAlignment
 */
async function runBulkAlignment(jobId: string, projectId: string) {
    try {
        const project = await prisma.project.findUnique({
            where: { id: projectId }
        });

        if (!project || !project.guidelines) {
            throw new Error('Project guidelines not found.');
        }

        // 1. EXTRACT GUIDELINES once per job to save resources
        let guidelinesText = '';
        const base64Data = project.guidelines.split(';base64,').pop();
        if (base64Data) {
            const buffer = Buffer.from(base64Data, 'base64');
            const parsed = await pdf(buffer);
            guidelinesText = parsed.text;
        }

        if (!guidelinesText) throw new Error('Could not parse guidelines PDF.');

        // 2. FETCH and PROCESS in sequence
        const recordsToProcess = await prisma.dataRecord.findMany({
            where: { projectId, alignmentAnalysis: null },
            orderBy: { createdAt: 'desc' }
        });

        // --- UPDATED SYSTEM PROMPT: Enforce "Engine" persona ---
        const systemPrompt = `You are an Automated Compliance Engine for Project ${project.name}. You are NOT a creative writer. Your job is to binary-match content against guidelines and output raw data followed by reasoning. You must strictly adhere to the requested output format.`;

        for (let i = 0; i < recordsToProcess.length; i++) {
            // CHECK FOR CANCELLED STATUS periodically
            const currentJob = await prisma.analyticsJob.findUnique({
                where: { id: jobId },
                select: { status: true }
            });
            if (currentJob?.status === 'CANCELLED') break;

            const record = recordsToProcess[i];

            // --- UPDATED USER PROMPT: Recency Bias + Negative Constraints ---
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

            try {
                const evaluation = await generateCompletion(prompt, systemPrompt);

                await prisma.dataRecord.update({
                    where: { id: record.id },
                    data: { alignmentAnalysis: evaluation }
                });
            } catch (err) {
                console.error(`Failed to process record ${record.id}:`, err);
                // Continue with next record even if one fails
            }

            // Update progress
            await prisma.analyticsJob.update({
                where: { id: jobId },
                data: { processedCount: i + 1 }
            });
        }

        // Final Status Update
        const finalJob = await prisma.analyticsJob.findUnique({ where: { id: jobId } });
        if (finalJob?.status !== 'CANCELLED') {
            await prisma.analyticsJob.update({
                where: { id: jobId },
                data: { status: 'COMPLETED' }
            });
        }

    } catch (error: any) {
        console.error('Bulk Job Fatal Error:', error);
        await prisma.analyticsJob.update({
            where: { id: jobId },
            data: { status: 'FAILED', error: error.message }
        });
    }
}