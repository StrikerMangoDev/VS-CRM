import { getSessionCookie } from '@/lib/auth';
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import "./globals.css";
import { prisma } from '@/lib/prisma';
import { ConfirmProvider } from '@/providers/ConfirmProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { Toaster } from 'react-hot-toast';


const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VS CRM - Lead Management System",
  description: "A premium lead management system for educational courses.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessionCookie = (await getSessionCookie());
  let user = null;
  try {
    user = (sessionCookie && sessionCookie.value) ? sessionCookie.user : null;
  } catch {
    user = null;
  }

  if (!user) {
    return (
      <html lang="en" className={`${inter.variable}`} suppressHydrationWarning>
        <body suppressHydrationWarning>
          <ThemeProvider attribute="data-theme" defaultTheme="dark">
            {children}
          </ThemeProvider>
        </body>
      </html>
    );
  }

  const isAdmin = user.role === 'ADMIN';

  const hour = new Date().getHours();
  let greeting = "Good evening";
  if (hour < 12) greeting = "Good morning";
  else if (hour < 18) greeting = "Good afternoon";

  const techCounts = { dailyPaid: 0, welcomeCall: 0, access: 0 };
  if (user.department === 'TECHNICAL' || isAdmin) {
    const dailyPaidCount = await prisma.lead.count({
      where: { totalPayment: { gt: 0 }, whatsappJoined: false }
    });
    
    const accessCount = await prisma.lead.count({
      where: { totalPayment: { gte: 8000 }, lmsAccessGranted: false }
    });
    
    const welcomeCallCount = await prisma.lead.count({
      where: { paymentStatus: 'FULL_PAYMENT', enrollmentCompleted: false }
    });

    techCounts.dailyPaid = dailyPaidCount;
    techCounts.access = accessCount;
    techCounts.welcomeCall = welcomeCallCount;
  }

  const departments = await prisma.orgDepartment.findMany({
    include: {
      modules: {
        orderBy: { createdAt: 'asc' }
      },
      teams: {
        include: {
          permittedModules: true
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  return (
    <html lang="en" className={`${inter.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider attribute="data-theme" defaultTheme="dark">
          <Toaster position="bottom-right" />
          <ConfirmProvider>
            <div className="layout">
              <Sidebar user={user} isAdmin={isAdmin} greeting={greeting} techCounts={techCounts} departments={departments} />
              <main className="main-content">
                {children}
              </main>
            </div>
          </ConfirmProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

