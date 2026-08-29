-- R2-759: Normalize stored CRM lead priority values to lowercase ('low', 'medium', 'high')
UPDATE crm_leads SET priority = LOWER(priority) WHERE priority IS NOT NULL;
UPDATE crm_leads SET priority = 'medium' WHERE priority IS NULL OR priority NOT IN ('low', 'medium', 'high');
