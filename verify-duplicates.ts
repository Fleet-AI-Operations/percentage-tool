
import 'dotenv/config'; // Explicitly load .env
import { processAndStore } from './src/lib/ingestion';
import { prisma } from './src/lib/prisma';
import { RecordType } from '@prisma/client';

console.log(`DB URL: ${process.env.DATABASE_URL?.split('@')[1] || 'UNDEFINED'}`);

async function main() {
    console.log('Starting verification...');

    const project = await prisma.project.create({
        data: { name: `Duplicate Verification Project ${Date.now()}` }
    });
    console.log(`Created project: ${project.id}`);

    const sharedId = 'duplicate-test-id-123';

    // 2. Ingest TASK with ID X
    console.log('\n--- Step 1: Ingesting TASK with ID X ---');
    const taskRecord = [{ task_id: sharedId, content: 'Task Content 1', rating: 'top 10' }];

    // processAndStore updates a job, so we MUST create a job first.

    // Helper to create job
    const createJob = async (type: RecordType) => {
        return prisma.ingestJob.create({
            data: {
                projectId: project.id,
                type: type,
                status: 'PROCESSING',
                totalRecords: 1
            }
        });
    };

    const job1 = await createJob(RecordType.TASK);
    await processAndStore(taskRecord, {
        projectId: project.id,
        type: RecordType.TASK,
        source: 'csv',
        filterKeywords: []
    }, job1.id);

    const count1 = await prisma.dataRecord.count({ where: { projectId: project.id, type: RecordType.TASK } });
    console.log(`Task Records: ${count1} (Expected 1)`);


    // 3. Ingest FEEDBACK with ID X (Should NOT be duplicate)
    console.log('\n--- Step 2: Ingesting FEEDBACK with ID X ---');
    const feedbackRecord = [{ task_id: sharedId, content: 'Feedback Content 1', rating: 'top 10' }];
    const job2 = await createJob(RecordType.FEEDBACK);

    await processAndStore(feedbackRecord, {
        projectId: project.id,
        type: RecordType.FEEDBACK,
        source: 'csv',
        filterKeywords: []
    }, job2.id);

    const count2 = await prisma.dataRecord.count({ where: { projectId: project.id, type: RecordType.FEEDBACK } });
    console.log(`Feedback Records: ${count2} (Expected 1)`);

    const job2Result = await prisma.ingestJob.findUnique({ where: { id: job2.id } });
    console.log(`Job 2 Skips: ${job2Result?.skippedCount} (Expected 0)`);


    // 4. Ingest TASK with ID X again (Should BE duplicate)
    console.log('\n--- Step 3: Ingesting TASK with ID X again ---');
    const job3 = await createJob(RecordType.TASK);

    await processAndStore(taskRecord, {
        projectId: project.id,
        type: RecordType.TASK,
        source: 'csv',
        filterKeywords: []
    }, job3.id);

    const count3 = await prisma.dataRecord.count({ where: { projectId: project.id, type: RecordType.TASK } });
    console.log(`Task Records: ${count3} (Expected 1 - still)`);

    const job3Result = await prisma.ingestJob.findUnique({ where: { id: job3.id } });
    console.log(`Job 3 Skips: ${job3Result?.skippedCount} (Expected 1)`);
    console.log(`Job 3 Skip Details:`, job3Result?.skippedDetails);

    // Cleanup
    await prisma.project.delete({ where: { id: project.id } });
    console.log('\nCleanup complete.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
