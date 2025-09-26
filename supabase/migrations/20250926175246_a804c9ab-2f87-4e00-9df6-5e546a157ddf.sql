-- Delete student 'STU20257426' and all related records
DO $$
DECLARE
    student_uuid UUID;
BEGIN
    -- Get the student's UUID
    SELECT id INTO student_uuid FROM students WHERE student_id = 'STU20257426';
    
    IF student_uuid IS NOT NULL THEN
        -- Delete related records in order to avoid foreign key conflicts
        DELETE FROM invoice_items WHERE student_fee_id IN (SELECT id FROM student_fees WHERE student_id = student_uuid);
        DELETE FROM student_fees WHERE student_id = student_uuid;
        DELETE FROM payments WHERE student_id = student_uuid;
        DELETE FROM invoices WHERE student_id = student_uuid;
        DELETE FROM student_scholarships WHERE student_id = student_uuid;
        DELETE FROM student_medical_info WHERE student_id = student_uuid;
        DELETE FROM student_emergency_contacts WHERE student_id = student_uuid;
        DELETE FROM student_enrollments WHERE student_id = student_uuid;
        DELETE FROM behavior_notes WHERE student_id = student_uuid;
        DELETE FROM attendance_records WHERE student_id = student_uuid;
        DELETE FROM report_cards WHERE student_id = student_uuid;
        DELETE FROM parent_student_relationships WHERE student_id = student_uuid;
        DELETE FROM library_transactions WHERE borrower_id = (SELECT profile_id FROM students WHERE id = student_uuid);
        DELETE FROM library_reservations WHERE reserver_id = (SELECT profile_id FROM students WHERE id = student_uuid);
        DELETE FROM library_fines WHERE borrower_id = (SELECT profile_id FROM students WHERE id = student_uuid);
        
        -- Finally delete the student record
        DELETE FROM students WHERE id = student_uuid;
        
        RAISE NOTICE 'Student STU20257426 and all related records have been deleted successfully.';
    ELSE
        RAISE NOTICE 'Student with ID STU20257426 not found.';
    END IF;
END $$;