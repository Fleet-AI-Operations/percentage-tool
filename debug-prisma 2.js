const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const models = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'));
console.log('Available models:', models);
if (models.includes('ingestJob')) {
    console.log('SUCCESS: ingestJob found');
} else {
    console.log('FAILURE: ingestJob NOT found');
}
prisma.$disconnect();
process.exit(0);
