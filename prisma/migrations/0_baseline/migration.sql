-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobileNumber" TEXT,
    "employeeId" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "mainDepartment" TEXT NOT NULL DEFAULT 'Sales Department',
    "department" TEXT NOT NULL,
    "subTeam" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "password" TEXT,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostingDailyTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "polls" INTEGER NOT NULL DEFAULT 0,
    "quizzes" INTEGER NOT NULL DEFAULT 0,
    "communityPosts" INTEGER NOT NULL DEFAULT 0,
    "commentsReply" INTEGER NOT NULL DEFAULT 0,
    "captionsFound" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostingDailyTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "uniqueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "email" TEXT,
    "totalPayment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "partPaymentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fullPaymentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "partPaymentId" TEXT,
    "fullPaymentId" TEXT,
    "amount1" DOUBLE PRECISION,
    "amount2" DOUBLE PRECISION,
    "amount3" DOUBLE PRECISION,
    "discount" DOUBLE PRECISION,
    "salesAmount" DOUBLE PRECISION,
    "recoveryAmount" DOUBLE PRECISION,
    "paymentStatus" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3),
    "whatsappJoined" BOOLEAN NOT NULL DEFAULT false,
    "lmsAccessGranted" BOOLEAN NOT NULL DEFAULT false,
    "enrollmentCompleted" BOOLEAN NOT NULL DEFAULT false,
    "updateStatusDate" TIMESTAMP(3),
    "accessStatus" TEXT NOT NULL DEFAULT 'Pending',
    "accessType" TEXT,
    "frozenLeadStatus" TEXT,
    "frozenLeadLogStatus" TEXT,
    "recoveryAssignedAt" TIMESTAMP(3),
    "state" TEXT,
    "webinarName" TEXT,
    "webinarId" TEXT,
    "isTransferred" BOOLEAN NOT NULL DEFAULT false,
    "leadStatus" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "callStatus" TEXT NOT NULL DEFAULT 'UNTOUCHED',
    "nextFollowUpDate" TIMESTAMP(3),
    "remark1" TEXT,
    "remark2" TEXT,
    "whatsappTemplate" TEXT,
    "whatsappSentAt" TIMESTAMP(3),
    "customData" TEXT NOT NULL DEFAULT '{}',
    "currentModuleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomColumn" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "departmentTarget" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionLog" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "connected" BOOLEAN NOT NULL,
    "amountCollected" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallRecord" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "smartfloRefId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "duration" INTEGER NOT NULL DEFAULT 0,
    "recordingUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebinarCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebinarCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebinarMaster" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "description" TEXT,
    "whatsappGroupUrl" TEXT NOT NULL,
    "webinarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebinarMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebinarRecording" (
    "id" TEXT NOT NULL,
    "webinarId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "duration" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebinarRecording_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditHistory" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueDropdownValue" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IssueDropdownValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emailId" TEXT,
    "mobileNumber" TEXT NOT NULL,
    "issueTypeId" TEXT NOT NULL,
    "leadOwnerId" TEXT,
    "issueStatusId" TEXT,
    "actualIssueId" TEXT,
    "remark" TEXT,
    "creatorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueHistory" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fieldName" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssueHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncentiveConfiguration" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "webinarTarget" INTEGER NOT NULL DEFAULT 6,
    "webinarWeightage" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "webinarMaximumCap" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "callingTarget" INTEGER NOT NULL DEFAULT 5200,
    "callingWeightage" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "callingMaximumCap" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "revenueTarget" DOUBLE PRECISION NOT NULL DEFAULT 160000,
    "revenueWeightage" DOUBLE PRECISION NOT NULL DEFAULT 70,
    "revenueHasCap" BOOLEAN NOT NULL DEFAULT false,
    "pipThreshold" DOUBLE PRECISION NOT NULL DEFAULT 75,
    "noIncentiveStart" DOUBLE PRECISION NOT NULL DEFAULT 75.01,
    "noIncentiveEnd" DOUBLE PRECISION NOT NULL DEFAULT 94.99,
    "fixedIncentiveStart" DOUBLE PRECISION NOT NULL DEFAULT 95,
    "fixedIncentiveEnd" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "fixedIncentiveAmount" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "additionalIncentiveStart" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "additionalIncentivePerPercentage" DOUBLE PRECISION NOT NULL DEFAULT 300,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncentiveConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebinarAttendanceUpload" (
    "id" TEXT NOT NULL,
    "webinarId" TEXT NOT NULL,
    "webinarDay" TEXT NOT NULL,
    "uploadedFile" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebinarAttendanceUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebinarAttendance" (
    "id" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "webinarId" TEXT NOT NULL,
    "webinarDay" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "WebinarAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DropdownConfiguration" (
    "id" TEXT NOT NULL,
    "sheetName" TEXT NOT NULL,
    "columnName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DropdownConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DropdownValue" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DropdownValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgDepartment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT DEFAULT 'Building2',
    "color" TEXT DEFAULT '#3b82f6',
    "managerId" TEXT,
    "userMatchRule" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgTeam" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "leaderId" TEXT,
    "userMatchRule" TEXT,
    "canViewPerformance" BOOLEAN NOT NULL DEFAULT false,
    "canViewReports" BOOLEAN NOT NULL DEFAULT false,
    "canViewIncentives" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgModule" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'SHEET',
    "urlPath" TEXT,
    "icon" TEXT,
    "ownerId" TEXT,
    "columnsConfig" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgConnection" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "destId" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'ONE_WAY',
    "syncEnabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OrgConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgFieldMapping" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "sourceField" TEXT NOT NULL,
    "destField" TEXT NOT NULL,

    CONSTRAINT "OrgFieldMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentRecord" (
    "id" TEXT NOT NULL,
    "uniqueId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "doneDate" TIMESTAMP(3),
    "remark" TEXT,
    "channel" TEXT NOT NULL,
    "videoLink" TEXT,
    "thumbnail" TEXT,
    "thumbnailCount" TEXT,
    "graphicsCount" TEXT,
    "thumbnailDoneDate" TIMESTAMP(3),
    "sendTo" TEXT,
    "approvalStatus" TEXT NOT NULL DEFAULT 'Pending',
    "approvalDate" TIMESTAMP(3),
    "approvedById" TEXT,
    "postOnDate" TIMESTAMP(3),
    "postedById" TEXT,
    "postedOnPlatform" TEXT,
    "uploadingStatus" TEXT NOT NULL DEFAULT 'Not Started',
    "uploadingDate" TIMESTAMP(3),
    "scheduleVideo" BOOLEAN NOT NULL DEFAULT false,
    "uploadingTime" TEXT,
    "storyStatus" TEXT DEFAULT 'Pending',
    "editorId" TEXT,
    "graphicDesignerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskRecord" (
    "id" TEXT NOT NULL,
    "uniqueId" TEXT NOT NULL,
    "departmentName" TEXT NOT NULL,
    "assigningDate" TEXT,
    "requirementDate" TEXT,
    "platform" TEXT,
    "topic" TEXT,
    "requirementPurpose" TEXT,
    "referenceFile" TEXT,
    "format" TEXT,
    "size" TEXT,
    "videoLink" TEXT,
    "graphicsCount" TEXT,
    "remark" TEXT,
    "assignedDepartment" TEXT,
    "assignedToId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialMediaUserTarget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "weeklyVideos" INTEGER NOT NULL DEFAULT 0,
    "monthlyVideos" INTEGER NOT NULL DEFAULT 0,
    "weeklyGraphics" INTEGER NOT NULL DEFAULT 0,
    "monthlyGraphics" INTEGER NOT NULL DEFAULT 0,
    "weeklyPosts" INTEGER NOT NULL DEFAULT 0,
    "monthlyPosts" INTEGER NOT NULL DEFAULT 0,
    "weeklyStories" INTEGER NOT NULL DEFAULT 0,
    "monthlyStories" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialMediaUserTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdCreativeRecord" (
    "id" TEXT NOT NULL,
    "creativeId" TEXT,
    "mediaType" TEXT NOT NULL DEFAULT 'Video',
    "videoName" TEXT NOT NULL,
    "forTarget" TEXT NOT NULL DEFAULT 'Vastu Shikhar',
    "editorId" TEXT,
    "editorName" TEXT,
    "videoLink" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completedDate" TEXT,
    "remark" TEXT,
    "approval" TEXT NOT NULL DEFAULT 'Pending',
    "useStatus" TEXT NOT NULL DEFAULT 'pending',
    "utilizeDate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdCreativeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserShift" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "totalActiveSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftBreak" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "durationSec" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ShiftBreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialMediaChannel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "platforms" TEXT NOT NULL,
    "purpose" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialMediaChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_OrgModuleToOrgTeam" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_OrgModuleToOrgTeam_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PostingDailyTask_userId_date_key" ON "PostingDailyTask"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_uniqueId_key" ON "Lead"("uniqueId");

-- CreateIndex
CREATE UNIQUE INDEX "CallRecord_smartfloRefId_key" ON "CallRecord"("smartfloRefId");

-- CreateIndex
CREATE UNIQUE INDEX "WebinarCategory_code_key" ON "WebinarCategory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "WebinarCategory_name_key" ON "WebinarCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Issue_issueId_key" ON "Issue"("issueId");

-- CreateIndex
CREATE UNIQUE INDEX "DropdownConfiguration_sheetName_columnName_key" ON "DropdownConfiguration"("sheetName", "columnName");

-- CreateIndex
CREATE UNIQUE INDEX "OrgDepartment_name_key" ON "OrgDepartment"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ContentRecord_uniqueId_key" ON "ContentRecord"("uniqueId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskRecord_uniqueId_key" ON "TaskRecord"("uniqueId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialMediaUserTarget_userId_key" ON "SocialMediaUserTarget"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppTemplate_name_key" ON "WhatsAppTemplate"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UserShift_userId_date_key" ON "UserShift"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SocialMediaChannel_name_key" ON "SocialMediaChannel"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SocialMediaChannel_slug_key" ON "SocialMediaChannel"("slug");

-- CreateIndex
CREATE INDEX "_OrgModuleToOrgTeam_B_index" ON "_OrgModuleToOrgTeam"("B");

-- AddForeignKey
ALTER TABLE "PostingDailyTask" ADD CONSTRAINT "PostingDailyTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_webinarId_fkey" FOREIGN KEY ("webinarId") REFERENCES "WebinarMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionLog" ADD CONSTRAINT "ActionLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionLog" ADD CONSTRAINT "ActionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallRecord" ADD CONSTRAINT "CallRecord_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallRecord" ADD CONSTRAINT "CallRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebinarMaster" ADD CONSTRAINT "WebinarMaster_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "WebinarCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebinarRecording" ADD CONSTRAINT "WebinarRecording_webinarId_fkey" FOREIGN KEY ("webinarId") REFERENCES "WebinarMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditHistory" ADD CONSTRAINT "AuditHistory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_issueTypeId_fkey" FOREIGN KEY ("issueTypeId") REFERENCES "IssueDropdownValue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_issueStatusId_fkey" FOREIGN KEY ("issueStatusId") REFERENCES "IssueDropdownValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_actualIssueId_fkey" FOREIGN KEY ("actualIssueId") REFERENCES "IssueDropdownValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_leadOwnerId_fkey" FOREIGN KEY ("leadOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueHistory" ADD CONSTRAINT "IssueHistory_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueHistory" ADD CONSTRAINT "IssueHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebinarAttendance" ADD CONSTRAINT "WebinarAttendance_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "WebinarAttendanceUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DropdownValue" ADD CONSTRAINT "DropdownValue_configId_fkey" FOREIGN KEY ("configId") REFERENCES "DropdownConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgDepartment" ADD CONSTRAINT "OrgDepartment_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgTeam" ADD CONSTRAINT "OrgTeam_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "OrgDepartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgTeam" ADD CONSTRAINT "OrgTeam_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgModule" ADD CONSTRAINT "OrgModule_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "OrgDepartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgModule" ADD CONSTRAINT "OrgModule_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgConnection" ADD CONSTRAINT "OrgConnection_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "OrgModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgConnection" ADD CONSTRAINT "OrgConnection_destId_fkey" FOREIGN KEY ("destId") REFERENCES "OrgModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgFieldMapping" ADD CONSTRAINT "OrgFieldMapping_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "OrgConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentRecord" ADD CONSTRAINT "ContentRecord_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentRecord" ADD CONSTRAINT "ContentRecord_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentRecord" ADD CONSTRAINT "ContentRecord_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentRecord" ADD CONSTRAINT "ContentRecord_graphicDesignerId_fkey" FOREIGN KEY ("graphicDesignerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskRecord" ADD CONSTRAINT "TaskRecord_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialMediaUserTarget" ADD CONSTRAINT "SocialMediaUserTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCreativeRecord" ADD CONSTRAINT "AdCreativeRecord_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserShift" ADD CONSTRAINT "UserShift_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftBreak" ADD CONSTRAINT "ShiftBreak_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "UserShift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OrgModuleToOrgTeam" ADD CONSTRAINT "_OrgModuleToOrgTeam_A_fkey" FOREIGN KEY ("A") REFERENCES "OrgModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OrgModuleToOrgTeam" ADD CONSTRAINT "_OrgModuleToOrgTeam_B_fkey" FOREIGN KEY ("B") REFERENCES "OrgTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
