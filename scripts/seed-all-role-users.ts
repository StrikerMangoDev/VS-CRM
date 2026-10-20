import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log('Seeding dummy accounts for all roles...');

  const hashedPassword = await bcrypt.hash('123456', 10);

  const demoUsers = [
    // 1. Super Admin
    {
      email: 'admin@vscrm.com',
      name: 'Admin User',
      role: 'ADMIN',
      department: 'ALL',
      mainDepartment: 'Sales Department',
    },
    // 2. Department Manager
    {
      email: 'manager@vscrm.com',
      name: 'Manager User',
      role: 'MANAGER',
      department: 'ALL',
      mainDepartment: 'Social Media',
    },
    // 3. Sales Team Leader
    {
      email: 'sales-tl@vscrm.com',
      name: 'Sales TL',
      role: 'TL',
      department: 'ALL',
      mainDepartment: 'Sales Department',
    },
    // 4. Social Media Team Leader
    {
      email: 'social-tl@vscrm.com',
      name: 'Social Media TL',
      role: 'TL',
      department: 'Editing Team',
      mainDepartment: 'Social Media',
    },
    // 5. Sales Executive
    {
      email: 'sales@vscrm.com',
      name: 'Sales Executive',
      role: 'EXEC',
      department: 'SALES',
      mainDepartment: 'Sales Department',
    },
    // 6. Recovery Executive
    {
      email: 'recovery@vscrm.com',
      name: 'Recovery Executive',
      role: 'EXEC',
      department: 'RECOVERY',
      mainDepartment: 'Sales Department',
    },
    // 7. Technical Executive
    {
      email: 'tech@vscrm.com',
      name: 'Technical Executive',
      role: 'EXEC',
      department: 'TECHNICAL',
      subTeam: 'TECH',
      mainDepartment: 'Sales Department',
    },
    // 8. Video Editor
    {
      email: 'editor@vscrm.com',
      name: 'Video Editor',
      role: 'EXEC',
      department: 'Editing Team',
      mainDepartment: 'Social Media',
    },
    // 9. Graphic Designer
    {
      email: 'graphics@vscrm.com',
      name: 'Graphic Designer',
      role: 'EXEC',
      department: 'Graphics Team',
      mainDepartment: 'Social Media',
    },
    // 10. Content Poster
    {
      email: 'posting@vscrm.com',
      name: 'Posting Executive',
      role: 'EXEC',
      department: 'Posting Team',
      mainDepartment: 'Social Media',
    },
    // 11. Other Team / Tasks
    {
      email: 'other@vscrm.com',
      name: 'Task Executive',
      role: 'EXEC',
      department: 'Other Team',
      mainDepartment: 'Social Media',
    }
  ];

  for (const u of demoUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        department: u.department,
        mainDepartment: u.mainDepartment,
        subTeam: (u as any).subTeam || null,
        password: hashedPassword,
        isActive: true,
      },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        department: u.department,
        mainDepartment: u.mainDepartment,
        subTeam: (u as any).subTeam || null,
        password: hashedPassword,
        isActive: true,
      },
    });
    console.log(`✓ Seeded ${u.role} (${u.department}): ${u.email}`);
  }

  // Also ensure existing named demo users have password '123456'
  const existingUsers = [
    'Jyoti@user.com', 'shaista@user.com', 'khushboo@user.com',
    'nupur@user.com', 'vikash@user.com', 'garvit@mangotreetech.com',
    'neha@user.com', 'akshat@user.com', 'vishaka@user.com',
    'anu@user.com', 'samsher@user'
  ];

  for (const email of existingUsers) {
    await prisma.user.updateMany({
      where: { email },
      data: { password: hashedPassword, isActive: true }
    });
  }

  console.log('All dummy logins for all roles successfully seeded!');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
