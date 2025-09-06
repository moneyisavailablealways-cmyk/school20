-- Enable leaked password protection for better security
-- This helps prevent users from using passwords that have been compromised in data breaches

-- Enable leaked password protection
UPDATE auth.config 
SET password_dictionary_enabled = true,
    password_min_length = 8
WHERE true;