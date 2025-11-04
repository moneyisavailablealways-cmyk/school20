
-- Allow students to view active subjects
DROP POLICY IF EXISTS "Students can view active subjects" ON subjects;
CREATE POLICY "Students can view active subjects"
ON subjects
FOR SELECT
USING (
  is_active = true 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'student'
  )
);

-- Allow authenticated users to view levels (already exists but ensure it works)
DROP POLICY IF EXISTS "Students can view levels" ON levels;
CREATE POLICY "Students can view levels"
ON levels  
FOR SELECT
USING (auth.uid() IS NOT NULL);
