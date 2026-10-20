-- CreateIndex
CREATE INDEX "Assignment_userId_leadId_idx" ON "Assignment"("userId", "leadId");

-- CreateIndex
CREATE INDEX "Assignment_leadId_idx" ON "Assignment"("leadId");

-- CreateIndex
CREATE INDEX "AuditHistory_leadId_createdAt_idx" ON "AuditHistory"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditHistory_createdAt_field_idx" ON "AuditHistory"("createdAt", "field");

-- CreateIndex
CREATE INDEX "CallRecord_userId_createdAt_idx" ON "CallRecord"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CallRecord_leadId_createdAt_idx" ON "CallRecord"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "ContentRecord_channel_createdAt_idx" ON "ContentRecord"("channel", "createdAt");

-- CreateIndex
CREATE INDEX "ContentRecord_editorId_idx" ON "ContentRecord"("editorId");

-- CreateIndex
CREATE INDEX "ContentRecord_graphicDesignerId_idx" ON "ContentRecord"("graphicDesignerId");

-- CreateIndex
CREATE INDEX "Issue_leadOwnerId_status_idx" ON "Issue"("leadOwnerId", "status");

-- CreateIndex
CREATE INDEX "Issue_creatorId_createdAt_idx" ON "Issue"("creatorId", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_mobileNumber_webinarId_idx" ON "Lead"("mobileNumber", "webinarId");

-- CreateIndex
CREATE INDEX "Lead_email_webinarId_idx" ON "Lead"("email", "webinarId");

-- CreateIndex
CREATE INDEX "Lead_currentModuleId_createdAt_idx" ON "Lead"("currentModuleId", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_paymentStatus_paymentDate_idx" ON "Lead"("paymentStatus", "paymentDate");

-- CreateIndex
CREATE INDEX "WebinarAttendance_webinarId_email_idx" ON "WebinarAttendance"("webinarId", "email");

-- CreateIndex
CREATE INDEX "WebinarAttendance_email_idx" ON "WebinarAttendance"("email");
