'use server'
import { requireSales,requireLeadAccess,requireIssueAccess } from '@/lib/auth'
import { getSessionCookie } from '@/lib/auth'


import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function initiateCallAction(leadId: string) {
  await requireLeadAccess(leadId);

  try {
    await cookies();
    const sessionCookie = (await getSessionCookie())?.value
    if (!sessionCookie) return { error: 'Not authenticated' }

    let auth;
    try {
      auth = JSON.parse(sessionCookie);
    } catch {
      return { error: 'Invalid token' }
    }

    // Fetch the current user to get their mobile number
    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: { mobileNumber: true }
    })

    if (!user || !user.mobileNumber) {
      return { error: 'Your mobile number is not configured in your profile. Please add it to make calls.' }
    }

    // Fetch the lead to get their phone number
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { mobileNumber: true }
    })

    if (!lead || !lead.mobileNumber) {
      return { error: 'Lead does not have a valid phone number.' }
    }

    const smartfloToken = process.env.SMARTFLO_API_TOKEN;
    if (!smartfloToken) {
      return { error: 'Smartflo API integration is not configured. Missing SMARTFLO_API_TOKEN.' }
    }

    const apiUrl = 'https://api-smartflo.tatateleservices.com/v1/click_to_call';

    const callerIds = [
      '917969081999',
      '917969081998',
      '917969081997',
      '917969081996',
      '917969081995',
      '917969081994',
      '917969081993',
      '917969081992',
      '917969081991'
    ];
    
    const agentNo = user.mobileNumber;
    
    // Dynamically add 0 to the 10-digit customer number
    const cleanCustomerNumber = lead.mobileNumber.replace(/\D/g, ''); // strip any formatting like +
    const customerLast10 = cleanCustomerNumber.length >= 10 ? cleanCustomerNumber.slice(-10) : cleanCustomerNumber;
    const destNo = `0${customerLast10}`;
    const callerId = callerIds[Math.floor(Math.random() * callerIds.length)];

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${smartfloToken}`
      },
      body: JSON.stringify({
        agent_number: agentNo,
        destination_number: destNo,
        caller_id: callerId
      })
    });

    const debugMsg = `(Agent: ${agentNo} | Dest: ${destNo} | CLI: ${callerId})`;

    if (!response.ok) {
      let errorMessage = 'Failed to initiate call';
      let rawData = '';
      try {
        const errorData = await response.json();
        rawData = JSON.stringify(errorData);
        errorMessage = errorData.message || rawData;
      } catch {
        // Fallback if not JSON
      }
      return { error: `Smartflo API Error: ${errorMessage} \n ${debugMsg} \n Raw Response: ${rawData}` }
    }

    const data = await response.json();
    const rawDataStr = JSON.stringify(data);

    // Check if the API returned a failure even with 200 OK
    if (data.status === 'error' || data.success === false) {
      return { error: `Call failed: ${data.message} \n ${debugMsg} \n Raw Response: ${rawDataStr}` }
    }

    return { success: true, message: `Call initiated! \n ${debugMsg} \n Raw Response: ${rawDataStr}`, ref_id: data.ref_id || data.call_id || data.id }

  } catch (error) {
    return { error: `Failed to initiate call: ${(error instanceof Error ? error.message : String(error))}` }
  }
}

export async function checkCallStatusAction() {
  await requireSales();

  try {
    await cookies();
    const sessionCookie = (await getSessionCookie())?.value;
    if (!sessionCookie) return { active: true };

    let user;
    try {
      user = JSON.parse(sessionCookie);
    } catch {
      return { active: true };
    }

    const smartfloToken = process.env.SMARTFLO_API_TOKEN;
    if (!smartfloToken) return { error: 'Missing SMARTFLO_API_TOKEN' };

    const response = await fetch('https://api-smartflo.tatateleservices.com/v1/live_calls', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${smartfloToken}`
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      return { active: true };
    }

    const data = await response.json();
    
    if (Array.isArray(data)) {
      const { prisma } = await import('@/lib/prisma');
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { mobileNumber: true }
      });
      
      const agent_number = dbUser?.mobileNumber;
      if (!agent_number) return { active: true };

      const agent10 = agent_number.length > 10 ? agent_number.slice(-10) : agent_number;
      const isCallActive = data.some((call) => JSON.stringify(call).includes(agent10));
      return { active: isCallActive };
    }
    
    return { active: true };
  } catch {
    return { active: true };
  }
}

export async function saveCallLogAction(data: {
  leadId: string,
  refId: string,
  duration: number
}) {
  await requireLeadAccess(data.leadId);

  try {
    await cookies();
    const sessionCookie = (await getSessionCookie())?.value;
    if (!sessionCookie) return { error: 'Not authenticated' };

    let user;
    try {
      user = JSON.parse(sessionCookie);
    } catch {
      return { error: 'Invalid token' };
    }

    const { prisma } = await import('@/lib/prisma');
    
    const existing = await prisma.callRecord.findUnique({ where: { smartfloRefId: data.refId } });
    if (existing && (existing.userId !== user.id || existing.leadId !== data.leadId)) return { error: 'Forbidden' };
    if (!Number.isInteger(data.duration) || data.duration < 0 || data.duration > 86400) return { error: 'Invalid duration' };
    // UPSERT so we don't accidentally create duplicates if polled multiple times
    const callRecord = await prisma.callRecord.upsert({
      where: { smartfloRefId: data.refId },
      update: {
        duration: data.duration,
        status: 'COMPLETED'
      },
      create: {
        smartfloRefId: data.refId,
        leadId: data.leadId,
        userId: user.id,
        duration: data.duration,
        status: 'COMPLETED'
      }
    });

    const callStatus = data.duration > 0 ? 'CALL_CONNECTED' : 'CALL_NOT_CONNECTED';
    await prisma.lead.update({
      where: { id: data.leadId },
      data: {
        callStatus,
        updatedAt: new Date()
      }
    });

    return { success: true, callRecord };
  } catch (error) {
    return { error: (error instanceof Error ? error.message : String(error)) };
  }
}

export async function fetchCallRecordingAction(refId: string) {
  const actor = await requireSales(); const call = await prisma.callRecord.findUnique({ where: { smartfloRefId: refId } }); if (!call) throw new Error("Call not found"); await requireLeadAccess(call.leadId); if (actor.role === "EXEC" && call.userId !== actor.id) throw new Error("Forbidden");

  try {
    const smartfloToken = process.env.SMARTFLO_API_TOKEN;
    if (!smartfloToken) return { error: 'Missing SMARTFLO_API_TOKEN' };

    const response = await fetch(`https://api-smartflo.tatateleservices.com/v1/call/records?ref_id=${refId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${smartfloToken}`
      },
      cache: 'no-store'
    });

    if (!response.ok) return { error: 'Failed to fetch recording from Smartflo' };

    const data = await response.json();
    
    // Tata Smartflo CDR usually returns an array of records or a paginated object. 
    // Format might be data.results, data.data, or data itself. Let's handle all.
    const records: {call_id?:string;ref_id?:string;uuid?:string;recording_url?:string}[] = Array.isArray(data) ? data : (data.results || data.data || []);
    const match = records.find((r) => r.call_id === refId || r.ref_id === refId || r.uuid === refId);
    
    if (match && match.recording_url) {
      const { prisma } = await import('@/lib/prisma');
      await prisma.callRecord.update({
        where: { smartfloRefId: refId },
        data: { recordingUrl: match.recording_url }
      });
      return { success: true, url: match.recording_url };
    }

    return { error: 'Recording is not ready yet. Try again in a few minutes.' };
  } catch (error) {
    return { error: (error instanceof Error ? error.message : String(error)) };
  }
}

export async function initiateIssueCallAction(issueId: string) {
  await requireIssueAccess(issueId);

  try {
    await cookies();
    const sessionCookie = (await getSessionCookie())?.value
    if (!sessionCookie) return { error: 'Not authenticated' }

    let auth;
    try {
      auth = JSON.parse(sessionCookie);
    } catch {
      return { error: 'Invalid token' }
    }

    // Fetch the current user to get their mobile number
    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: { mobileNumber: true }
    })

    if (!user || !user.mobileNumber) {
      return { error: 'Your mobile number is not configured in your profile. Please add it to make calls.' }
    }

    // Fetch the issue to get their phone number
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      select: { mobileNumber: true }
    })

    if (!issue || !issue.mobileNumber) {
      return { error: 'Issue does not have a valid phone number.' }
    }

    const smartfloToken = process.env.SMARTFLO_API_TOKEN;
    if (!smartfloToken) {
      return { error: 'Smartflo API integration is not configured. Missing SMARTFLO_API_TOKEN.' }
    }

    const apiUrl = 'https://api-smartflo.tatateleservices.com/v1/click_to_call';

    const callerIds = [
      '917969081999',
      '917969081998',
      '917969081997',
      '917969081996',
      '917969081995',
      '917969081994',
      '917969081993',
      '917969081992',
      '917969081991'
    ];
    
    const agentNo = user.mobileNumber;
    
    const cleanCustomerNumber = issue.mobileNumber.replace(/\D/g, ''); 
    const customerLast10 = cleanCustomerNumber.length >= 10 ? cleanCustomerNumber.slice(-10) : cleanCustomerNumber;
    const destNo = `0${customerLast10}`;
    const callerId = callerIds[Math.floor(Math.random() * callerIds.length)];

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${smartfloToken}`
      },
      body: JSON.stringify({
        agent_number: agentNo,
        destination_number: destNo,
        caller_id: callerId
      })
    });

    const debugMsg = `(Agent: ${agentNo} | Dest: ${destNo} | CLI: ${callerId})`;

    if (!response.ok) {
      let errorMessage = 'Failed to initiate call';
      let rawData = '';
      try {
        const errorData = await response.json();
        rawData = JSON.stringify(errorData);
        errorMessage = errorData.message || rawData;
      } catch {
      }
      return { error: `Smartflo API Error: ${errorMessage} \n ${debugMsg} \n Raw Response: ${rawData}` }
    }

    const data = await response.json();
    const rawDataStr = JSON.stringify(data);

    if (data.status === 'error' || data.success === false) {
      return { error: `Call failed: ${data.message} \n ${debugMsg} \n Raw Response: ${rawDataStr}` }
    }

    return { success: true, message: `Call initiated! \n ${debugMsg} \n Raw Response: ${rawDataStr}`, ref_id: data.ref_id || data.call_id || data.id }

  } catch (error) {
    return { error: `Failed to initiate call: ${(error instanceof Error ? error.message : String(error))}` }
  }
}
