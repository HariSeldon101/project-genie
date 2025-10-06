-- Clear all company intelligence sessions for bigfluffy.ai
DELETE FROM company_intelligence_sessions 
WHERE domain IN ('bigfluffy.ai', 'bigfluff');

-- Clear all user sessions to force re-login
DELETE FROM auth.sessions;