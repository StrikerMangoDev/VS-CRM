export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getPerformanceData,getSocialMediaPerformanceData } from '@/app/actions/performance';
import PerformancePageWrapper from '@/components/PerformancePageWrapper';

export default async function PerformancePage() {
  let salesData;
  let socialMediaData;
  try {
    salesData = await getPerformanceData();
    socialMediaData = await getSocialMediaPerformanceData();
  } catch (error) {
    console.error("Error in getPerformanceData:", error);
    redirect('/login')
  }

  return (
    <div className="p-0">
      <PerformancePageWrapper 
        salesData={salesData.leads} 
        issuesData={salesData.issues}
        socialMediaData={socialMediaData.contentRecords}
        taskData={socialMediaData.taskRecords}
        user={salesData.user} 
      />
    </div>
  )
}
