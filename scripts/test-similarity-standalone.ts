
import fs from 'fs';
import path from 'path';

// 1. Load Environment Variables (Native, no deps)
// MUST be done before importing any file that uses process.env
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value && !process.env[key.trim()]) {
            process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
        }
    });
    console.log("Loaded .env file.");
}

async function main() {
    // 2. Dynamic Import (prevents hoisting issues)
    const { prisma } = await import('../src/lib/prisma');
    const { findSimilarRecords } = await import('../src/lib/similarity');

    console.log("Starting Similarity Test...");

    // 1. Ensure Project Exists
    const projectName = "Similarity Test Project";
    let project = await prisma.project.findUnique({ where: { name: projectName } });
    if (!project) {
        console.log("Creating test project...");
        project = await prisma.project.create({
            data: { name: projectName }
        });
    }

    // 2. Create Mock Records (if they don't exist)
    const records = [
        {
            content: "The application server is down",
            embedding: [0.9, 0.1, 0.0, 0.0, 0.0],
            tags: "IT, Outage"
        },
        {
            content: "Server outage detected in region us-east",
            embedding: [0.88, 0.12, 0.0, 0.0, 0.0],
            tags: "IT, Outage"
        },
        {
            content: "The cafeteria is serving pizza today",
            embedding: [0.0, 0.0, 0.1, 0.9, 0.0],
            tags: "General, Food"
        }
    ];

    console.log("Seeding/Checking records...");
    const createdIds = [];

    for (const r of records) {
        let record = await prisma.dataRecord.findFirst({
            where: {
                projectId: project.id,
                content: r.content
            }
        });

        if (!record) {
            record = await prisma.dataRecord.create({
                data: {
                    projectId: project.id,
                    content: r.content,
                    type: 'TASK',
                    category: 'TOP_10',
                    source: 'test-script',
                    embedding: r.embedding
                }
            });
            console.log(`Created record: "${r.content}"`);
        } else {
            createdIds.push(record.id);
            console.log(`Found existing record: "${r.content}"`);
        }
        if (!createdIds.includes(record.id)) createdIds.push(record.id);
    }

    // 3. Run Similarity Search
    const targetId = createdIds[0];
    console.log(`\nTesting similarity for: "${records[0].content}"`);
    console.log("---------------------------------------------------");

    try {
        const matches = await findSimilarRecords(targetId, 5);

        matches.forEach((match, idx) => {
            const pct = (match.similarity * 100).toFixed(1);
            console.log(`${idx + 1}. [${pct}% Match] ${match.record.content}`);
        });

    } catch (err: any) {
        console.error("Error running similarity search:", err);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(e => console.error(e));
