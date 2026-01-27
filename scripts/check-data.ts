
import { prisma } from '../src/lib/prisma';

async function main() {
    console.log("Checking DB connection...");
    try {
        // 1. Simple count
        const count = await prisma.dataRecord.count();
        console.log(`Step 1 Success: Total records: ${count}`);

        // 2. Simple fetch
        const first = await prisma.dataRecord.findFirst();
        console.log(`Step 2 Success: First record ID: ${first?.id || 'None'}`);

        // 3. Embedding valid check (manual filter to be safe)
        if (count > 0) {
            const batch = await prisma.dataRecord.findMany({ take: 10 });
            const withEmbeddings = batch.filter(r => r.embedding && r.embedding.length > 0);
            console.log(`Step 3 Success: Found ${withEmbeddings.length} records with embeddings in first 10.`);

            if (withEmbeddings.length > 0) {
                console.log(`Sample embedding length: ${withEmbeddings[0].embedding.length}`);
                console.log(`Sample content: ${withEmbeddings[0].content.slice(0, 50)}`);
            }
        }

    } catch (e: any) {
        console.error("DB Error detected:");
        console.error(e.message);
        if (e.cause) console.error("Cause:", e.cause);
    }
}

main();
