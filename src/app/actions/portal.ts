'use server'
import { requireModuleAccess } from '@/lib/auth';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function addDynamicRecord(moduleId: string, departmentId: string, payload: Record<string,string>) {
  await requireModuleAccess(moduleId, departmentId);

  try {
    // We store the dynamic payload in the 'customData' JSON field of the Lead model,
    // and set the currentModuleId so it appears in the right sheet.
    
    // We require a 'name' field by default for the Lead model, if not provided we use a generic name
    const genericName = payload.name || payload.Name || payload.customer_name || 'Dynamic Record';
    const genericPhone = payload.phone || payload.Phone || payload.phone_number || payload.mobileNumber || '';

    await prisma.lead.create({
      data: {
        uniqueId: `DYN-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: genericName,
        mobileNumber: genericPhone,
        paymentStatus: 'NO_PAYMENT',
        currentModuleId: moduleId,
        customData: JSON.stringify(payload)
      }
    });

    revalidatePath(`/portal/${departmentId}/${moduleId}`);
    return { success: true };
  } catch (error) {
    return { error: (error instanceof Error ? error.message : String(error)) };
  }
}
