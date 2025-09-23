-- Remove A Level and O Level from levels table
DELETE FROM levels WHERE name IN ('A Level', 'O Level');