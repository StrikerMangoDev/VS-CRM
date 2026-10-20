export function getWorkingDaysCount(startDate: Date, endDate: Date): number {
  let count = 0;
  const curDate = new Date(startDate.getTime());
  curDate.setHours(0, 0, 0, 0);
  const end = new Date(endDate.getTime());
  end.setHours(0, 0, 0, 0);

  if (curDate > end) return 0;

  while (curDate <= end) {
    const dayOfWeek = curDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    curDate.setDate(curDate.getDate() + 1);
  }
  return count;
}

export function calculateLeadStatus(paymentDate: Date | null | undefined, frozenStatus: string | null | undefined): string {
  if (frozenStatus) return frozenStatus;
  
  if (!paymentDate) return 'Fresh Lead'; // fallback

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const pDate = new Date(paymentDate.getTime());
  pDate.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - pDate.getTime();
  const diffCalendarDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffCalendarDays > 90) {
    return 'Old Lead';
  }

  const workingDays = getWorkingDaysCount(pDate, today);
  if (workingDays <= 21) {
    return 'Fresh Lead';
  } else {
    return 'New Lead';
  }
}
