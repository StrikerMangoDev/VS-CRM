const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

async function main() {
  const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || 'file:./dev.db' });
  const prisma = new PrismaClient({ adapter });

  console.log("Seeding Org Connections...");

  await prisma.orgConnection.deleteMany();

  // Get Sales Modules
  const salesDept = await prisma.orgDepartment.findFirst({
    where: { name: 'Sales Department' }
  });

  if (!salesDept) {
    console.log('Sales Dept not found');
    return;
  }

  const modules = await prisma.orgModule.findMany({
    where: { departmentId: salesDept.id }
  });

  const master = modules.find(m => m.name === 'Sales Master Sheet');
  const part = modules.find(m => m.name === 'Part Payment Sheet');
  const full = modules.find(m => m.name === 'Full Payment Sheet');
  const issue = modules.find(m => m.name === 'Issue Table');

  if (master && part) {
    await prisma.orgConnection.create({
      data: { sourceId: master.id, destId: part.id, direction: 'ONE_WAY', syncEnabled: true }
    });
  }
  
  if (master && full) {
    await prisma.orgConnection.create({
      data: { sourceId: master.id, destId: full.id, direction: 'ONE_WAY', syncEnabled: true }
    });
  }

  if (part && full) {
    await prisma.orgConnection.create({
      data: { sourceId: part.id, destId: full.id, direction: 'ONE_WAY', syncEnabled: true }
    });
  }

  if (master && issue) {
    await prisma.orgConnection.create({
      data: { sourceId: master.id, destId: issue.id, direction: 'ONE_WAY', syncEnabled: true }
    });
  }

  console.log("Connections seeded successfully!");
  await prisma.$disconnect();
}

main().catch(console.error);
