const { PrismaClient } = require('@prisma/client');
const Database = require('better-sqlite3');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

const sqlite = new Database('dev.db');
const adapter = new PrismaBetterSqlite3(sqlite);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding Organizational Structure based on existing CRM data...");

  // 1. Clear existing org data for a clean seed
  await prisma.orgFieldMapping.deleteMany();
  await prisma.orgConnection.deleteMany();
  await prisma.orgModule.deleteMany();
  await prisma.orgTeam.deleteMany();
  await prisma.orgDepartment.deleteMany();

  // 2. Discover existing mainDepartments from the User table
  const distinctDepartments = await prisma.user.findMany({
    select: { mainDepartment: true },
    distinct: ['mainDepartment'],
  });

  const validMainDepartments = distinctDepartments
    .map(d => d.mainDepartment)
    .filter(d => d && d.trim() !== '');

  for (const deptName of validMainDepartments) {
    console.log(`Processing Department: ${deptName}`);
    
    const adminUser = await prisma.user.findFirst({
      where: { mainDepartment: deptName, role: 'ADMIN' }
    });

    // Create the Department Config
    const dept = await prisma.orgDepartment.create({
      data: {
        name: deptName,
        description: `Manage the organizational structure and data flow for ${deptName}`,
        icon: deptName.includes('Sales') ? 'Briefcase' : 'Building2',
        color: deptName.includes('Sales') ? '#3b82f6' : '#8b5cf6',
        userMatchRule: deptName,
        managerId: adminUser?.id
      }
    });

    // Discover Teams within this department
    const distinctTeams = await prisma.user.findMany({
      where: { mainDepartment: deptName, department: { not: 'ALL' } },
      select: { department: true },
      distinct: ['department'],
    });

    for (const team of distinctTeams) {
      if (!team.department) continue;
      
      const tl = await prisma.user.findFirst({
        where: { mainDepartment: deptName, department: team.department, role: 'TL' }
      });

      await prisma.orgTeam.create({
        data: {
          departmentId: dept.id,
          name: `${team.department.charAt(0).toUpperCase() + team.department.slice(1).toLowerCase()} Team`,
          leaderId: tl?.id,
          userMatchRule: team.department
        }
      });
    }

    // Only build the complex workflow map for Sales Department as requested by the user
    if (deptName === 'Sales Department') {
      const modulesData = [
        { name: 'Meta Ads', type: 'DATA_INPUT', urlPath: null, internalId: 'm_meta' },
        { name: 'Google Ads', type: 'DATA_INPUT', urlPath: null, internalId: 'm_google' },
        { name: 'Website', type: 'DATA_INPUT', urlPath: null, internalId: 'm_website' },
        
        { name: 'Lead Collection', type: 'DATA_PROCESSING', urlPath: null, internalId: 'm_collection' },
        { name: 'Lead Master Sheet', type: 'SHEET', urlPath: '/', internalId: 'm_master' },
        { name: 'NeoDove / Calling', type: 'EXTERNAL_SYSTEM', urlPath: null, internalId: 'm_neodove' },
        { name: 'WhatsApp Engagement', type: 'COMMUNICATION', urlPath: null, internalId: 'm_whatsapp' },
        { name: 'Webinar System', type: 'WEBINAR', urlPath: '/webinars', internalId: 'm_webinar' },
        
        { name: 'Pre-Webinar Queue', type: 'QUEUE', urlPath: null, internalId: 'm_pre_webinar' },
        { name: 'Sales Follow-up', type: 'SHEET', urlPath: '/part-payment', internalId: 'm_sales' },
        { name: 'Remaining Payment (Recovery)', type: 'SHEET', urlPath: '/recovery', internalId: 'm_recovery' },
        
        { name: 'Payment Log', type: 'TRANSACTION', urlPath: '/full-payment', internalId: 'm_payment' },
        
        { name: 'Customer Journey', type: 'DATA_PROCESSING', urlPath: null, internalId: 'm_customer' },
        { name: 'Course / Consultancy', type: 'OUTPUT', urlPath: null, internalId: 'm_course' },
      ];

      const createdModules = {};
      for (const m of modulesData) {
        const created = await prisma.orgModule.create({
          data: {
            departmentId: dept.id,
            name: m.name,
            type: m.type,
            urlPath: m.urlPath
          }
        });
        createdModules[m.internalId] = created.id;
      }

      // Create workflow connections matching the exact flow requested
      const connectionsData = [
        { source: 'm_meta', dest: 'm_collection' },
        { source: 'm_google', dest: 'm_collection' },
        { source: 'm_website', dest: 'm_collection' },
        
        { source: 'm_collection', dest: 'm_master' },
        { source: 'm_master', dest: 'm_neodove' },
        { source: 'm_neodove', dest: 'm_whatsapp' },
        { source: 'm_whatsapp', dest: 'm_webinar' },
        
        { source: 'm_webinar', dest: 'm_pre_webinar' },
        { source: 'm_webinar', dest: 'm_sales' },
        { source: 'm_webinar', dest: 'm_recovery' },
        
        { source: 'm_pre_webinar', dest: 'm_sales' },
        
        { source: 'm_sales', dest: 'm_payment' },
        { source: 'm_recovery', dest: 'm_payment' },
        
        { source: 'm_payment', dest: 'm_customer' },
        { source: 'm_customer', dest: 'm_course' },
      ];

      for (const conn of connectionsData) {
        await prisma.orgConnection.create({
          data: {
            sourceId: createdModules[conn.source],
            destId: createdModules[conn.dest],
            direction: 'ONE_WAY',
            syncEnabled: true
          }
        });
      }
      
      console.log('Created comprehensive operational flow for Sales Department.');
    }
  }

  console.log("Seeding complete!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
