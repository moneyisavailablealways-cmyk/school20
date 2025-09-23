-- Fix level hierarchy issues
UPDATE levels SET parent_id = NULL WHERE name = 'Nursery' AND parent_id = id;
UPDATE levels SET parent_id = NULL WHERE name = 'Primary' AND parent_id = id;
UPDATE levels SET name = 'O Level' WHERE name = 'O level';