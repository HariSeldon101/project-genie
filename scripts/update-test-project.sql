-- Update project with test dates for comprehensive testing
UPDATE projects 
SET 
    start_date = '2025-07-01', 
    end_date = '2027-01-31',
    company_info = jsonb_set(
      COALESCE(company_info, '{}'::jsonb),
      '{companyName}',
      '"TechCorp Solutions"'
    )
WHERE id = '2d076513-7ba4-4768-9224-df11e1ee9d2c';

-- Verify the update
SELECT id, name, start_date, end_date, company_info 
FROM projects 
WHERE id = '2d076513-7ba4-4768-9224-df11e1ee9d2c';