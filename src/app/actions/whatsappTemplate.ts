'use server'
import { requireSales,requireLeadAccess } from '@/lib/auth'
import { getSessionCookie } from '@/lib/auth'


import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

function safeRevalidate(path: string) {
  try {
    revalidatePath(path)
  } catch {
    // Ignore in non-request contexts
  }
}

async function checkCanManageTemplates(): Promise<{ allowed: boolean; error?: string }> {
  try {
    const sessionCookie = (await getSessionCookie())
    if (!sessionCookie) {
      return { allowed: false, error: 'Unauthorized: No active session.' }
    }
    const user = sessionCookie.user
    const isAdmin = user.role === 'ADMIN'
    const isManager = user.role === 'MANAGER'
    const isTL = user.role === 'TL'
    const isSocialMedia = user.mainDepartment === 'Social Media' || ['Editing Team', 'Graphics Team', 'Posting Team', 'Other Team'].includes(user.department)
    const isSalesDept = !isSocialMedia && (user.department === 'SALES' || user.mainDepartment === 'Sales Department')

    // Only Sales TL, Manager, and Admin can create, edit, or delete templates
    // Under no circumstances can Social Media department users manage this!
    if (!isSocialMedia && (isAdmin || ((isManager || isTL) && isSalesDept))) {
      return { allowed: true }
    }

    return { allowed: false, error: 'Access denied: Only Sales Department TL, Manager, and Admin can manage WhatsApp templates.' }
  } catch {
    return { allowed: false, error: 'Authorization check failed.' }
  }
}

const DEFAULT_TEMPLATES = [
  {
    name: 'Welcome Message',
    message: 'Namaste {name}! Welcome to VS CRM Masterclass. We are excited to have you join us for {webinarId}. Let us know if you have any questions!'
  },
  {
    name: 'Payment Reminder',
    message: 'Hello {name}, this is a gentle reminder regarding your pending payment for webinar {webinarId}. Please complete it at your earliest convenience to secure your seat.'
  },
  {
    name: 'Follow Up Call',
    message: 'Hello {name}, I tried calling you regarding your webinar enrollment {webinarId}. Please let me know when you would be available for a quick discussion.'
  },
  {
    name: 'Full Payment Confirmation',
    message: 'Congratulations {name}! Your payment has been received successfully for webinar {webinarId}. Welcome aboard!'
  }
];

export async function getWhatsAppTemplatesAction() {
  await requireSales();

  try {
    let templates = await prisma.whatsAppTemplate.findMany({
      orderBy: { createdAt: 'asc' }
    });

    // Seed defaults if empty
    if (templates.length === 0) {
      for (const t of DEFAULT_TEMPLATES) {
        await prisma.whatsAppTemplate.create({
          data: t
        });
      }
      templates = await prisma.whatsAppTemplate.findMany({
        orderBy: { createdAt: 'asc' }
      });
    }

    return { success: true, templates };
  } catch (error) {
    console.error('Error fetching WhatsApp templates:', error);
    return { success: false, error: (error instanceof Error ? error.message : String(error)), templates: [] };
  }
}

export async function createWhatsAppTemplateAction(name: string, message: string) {
  try {
    const auth = await checkCanManageTemplates();
    if (!auth.allowed) {
      return { success: false, error: auth.error || 'Access denied' };
    }

    const trimmedName = name.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName) {
      return { success: false, error: 'Template name cannot be empty.' };
    }
    if (!trimmedMessage) {
      return { success: false, error: 'Template message cannot be empty.' };
    }

    const existing = await prisma.whatsAppTemplate.findUnique({
      where: { name: trimmedName }
    });

    if (existing) {
      return { success: false, error: 'A template with this name already exists.' };
    }

    const template = await prisma.whatsAppTemplate.create({
      data: {
        name: trimmedName,
        message: trimmedMessage
      }
    });

    safeRevalidate('/settings/whatsapp-templates');
    safeRevalidate('/sales');
    safeRevalidate('/recovery');

    return { success: true, template };
  } catch (error) {
    console.error('Error creating WhatsApp template:', error);
    return { success: false, error: (error instanceof Error ? error.message : String(error)) };
  }
}

export async function updateWhatsAppTemplateAction(id: string, name: string, message: string) {
  try {
    const auth = await checkCanManageTemplates();
    if (!auth.allowed) {
      return { success: false, error: auth.error || 'Access denied' };
    }

    const trimmedName = name.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName) {
      return { success: false, error: 'Template name cannot be empty.' };
    }
    if (!trimmedMessage) {
      return { success: false, error: 'Template message cannot be empty.' };
    }

    const template = await prisma.whatsAppTemplate.update({
      where: { id },
      data: {
        name: trimmedName,
        message: trimmedMessage
      }
    });

    safeRevalidate('/settings/whatsapp-templates');
    safeRevalidate('/sales');

    return { success: true, template };
  } catch (error) {
    console.error('Error updating WhatsApp template:', error);
    return { success: false, error: (error instanceof Error ? error.message : String(error)) };
  }
}

export async function deleteWhatsAppTemplateAction(id: string) {
  try {
    const auth = await checkCanManageTemplates();
    if (!auth.allowed) {
      return { success: false, error: auth.error || 'Access denied' };
    }

    await prisma.whatsAppTemplate.delete({
      where: { id }
    });

    safeRevalidate('/settings/whatsapp-templates');
    safeRevalidate('/sales');

    return { success: true };
  } catch (error) {
    console.error('Error deleting WhatsApp template:', error);
    return { success: false, error: (error instanceof Error ? error.message : String(error)) };
  }
}

export async function updateLeadWhatsAppTemplateAction(leadId: string, templateName: string, markSent = false) {
  await requireLeadAccess(leadId);

  try {
    const updateData: import('@prisma/client').Prisma.LeadUncheckedUpdateInput = {
      whatsappTemplate: templateName || null
    };

    if (markSent) {
      updateData.whatsappSentAt = new Date();
    }

    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: updateData
    });

    safeRevalidate('/sales');
    safeRevalidate('/recovery');

    return { success: true, lead: updated };
  } catch (error) {
    console.error('Error updating lead whatsapp template:', error);
    return { success: false, error: (error instanceof Error ? error.message : String(error)) };
  }
}
