const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

async function main() {
  const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || 'file:./dev.db' });
  const prisma = new PrismaClient({ adapter });

  console.log("Seeding Organizational Structure based EXACTLY on existing CRM pages...");

  // 1. Clear existing org data for a clean seed
  await prisma.orgFieldMapping.deleteMany();
  await prisma.orgConnection.deleteMany();
  await prisma.orgModule.deleteMany();
  await prisma.orgTeam.deleteMany();
  await prisma.orgDepartment.deleteMany();

  // Create Sales Department
  const salesDept = await prisma.orgDepartment.create({
    data: {
      name: 'Sales Department',
      description: 'Main sales department managing leads and payments',
      icon: 'Briefcase',
      color: '#3b82f6',
      userMatchRule: 'Sales Department'
    }
  });

  const salesModules = [
    { name: 'Sales Master Sheet', urlPath: '/' },
    { name: 'Part Payment Sheet', urlPath: '/part-payment' },
    { name: 'Full Payment Sheet', urlPath: '/full-payment' },
    { name: 'Issue Table', urlPath: '/sales/issues' },
  ];

  for (const m of salesModules) {
    await prisma.orgModule.create({
      data: {
        departmentId: salesDept.id,
        name: m.name,
        type: 'SHEET',
        urlPath: m.urlPath
      }
    });
  }

  // Create Social Media Department
  const socialDept = await prisma.orgDepartment.create({
    data: {
      name: 'Social Media',
      description: 'Manages social media brands and leads generation',
      icon: 'Globe',
      color: '#14b8a6',
      userMatchRule: 'Social Media'
    }
  });

  const socialModules = [
    { name: 'VS', urlPath: '/social-media/vs' },
    { name: 'LVS', urlPath: '/social-media/lvs' },
    { name: 'Malyam', urlPath: '/social-media/malyam' },
    { name: 'Ai Telmate', urlPath: '/social-media/ai-telmate' },
    { name: 'Vedic code', urlPath: '/social-media/vedic-code' },
    { name: 'Occult Sage', urlPath: '/social-media/occult-sage' }
  ];

  for (const m of socialModules) {
    await prisma.orgModule.create({
      data: {
        departmentId: socialDept.id,
        name: m.name,
        type: 'SHEET',
        urlPath: m.urlPath
      }
    });
  }

  // Create Webinars Department
  const webinarDept = await prisma.orgDepartment.create({
    data: {
      name: 'Webinars',
      description: 'Manages all webinars and scheduling',
      icon: 'Video',
      color: '#f59e0b',
      userMatchRule: 'Webinars' // This doesn't strictly match a user group but works for routing
    }
  });

  await prisma.orgModule.create({
    data: {
      departmentId: webinarDept.id,
      name: 'Webinars',
      type: 'WEBINAR',
      urlPath: '/webinars'
    }
  });

  // Re-discover existing Teams based on User tables (SALES, RECOVERY, TECHNICAL)
  const distinctTeams = await prisma.user.findMany({
    where: { department: { not: 'ALL' } },
    select: { mainDepartment: true, department: true },
    distinct: ['department'],
  });

  for (const team of distinctTeams) {
    if (!team.department) continue;
    
    // Assign to Sales Department by default if mainDepartment matches
    let targetDept = salesDept.id;
    if (team.mainDepartment === 'Social Media') targetDept = socialDept.id;

    await prisma.orgTeam.create({
      data: {
        departmentId: targetDept,
        name: `${team.department.charAt(0).toUpperCase() + team.department.slice(1).toLowerCase()} Team`,
        userMatchRule: team.department
      }
    });
  }

  console.log("Real CRM structure seeded successfully!");
  await prisma.$disconnect();
}

main().catch(console.error);
