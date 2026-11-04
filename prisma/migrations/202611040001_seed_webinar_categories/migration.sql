-- Insert default webinar categories safely
INSERT INTO "WebinarCategory" (id, code, name, "createdAt")
VALUES 
  ('cat_vastu', 'VST', 'Vastu Webinar', NOW()),
  ('cat_astro', 'AST', 'Astro Webinar', NOW())
ON CONFLICT (code) DO NOTHING;

