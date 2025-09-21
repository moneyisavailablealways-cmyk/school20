-- Remove O level and A level from parent levels
DELETE FROM levels WHERE name IN ('O level', 'A level') AND parent_id IS NULL;