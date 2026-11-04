-- Insert default IssueDropdownValue records safely
INSERT INTO "IssueDropdownValue" (id, type, value, "isActive", "createdAt", "updatedAt")
VALUES 
  ('iss_type_1', 'ISSUE_TYPE', 'Payment Issue', true, NOW(), NOW()),
  ('iss_type_2', 'ISSUE_TYPE', 'LMS Access Issue', true, NOW(), NOW()),
  ('iss_type_3', 'ISSUE_TYPE', 'WhatsApp Group Issue', true, NOW(), NOW()),
  ('iss_type_4', 'ISSUE_TYPE', 'Call Back Request', true, NOW(), NOW()),
  ('iss_type_5', 'ISSUE_TYPE', 'Technical Glitch', true, NOW(), NOW()),
  ('iss_type_6', 'ISSUE_TYPE', 'Other Issue', true, NOW(), NOW()),
  ('iss_stat_1', 'ISSUE_STATUS', 'OPEN', true, NOW(), NOW()),
  ('iss_stat_2', 'ISSUE_STATUS', 'IN_PROGRESS', true, NOW(), NOW()),
  ('iss_stat_3', 'ISSUE_STATUS', 'RESOLVED', true, NOW(), NOW()),
  ('iss_stat_4', 'ISSUE_STATUS', 'CLOSED', true, NOW(), NOW()),
  ('act_iss_1', 'ACTUAL_ISSUE', 'Wrong Mobile Number', true, NOW(), NOW()),
  ('act_iss_2', 'ACTUAL_ISSUE', 'Payment Failed', true, NOW(), NOW()),
  ('act_iss_3', 'ACTUAL_ISSUE', 'Portal Login Error', true, NOW(), NOW()),
  ('act_iss_4', 'ACTUAL_ISSUE', 'Link Expired', true, NOW(), NOW()),
  ('act_iss_5', 'ACTUAL_ISSUE', 'Others', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

