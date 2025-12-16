import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    console.log(`Checking for overdue books as of ${todayISO}`);

    // Find all active transactions that are now overdue
    const { data: overdueTransactions, error: overdueError } = await supabase
      .from("library_transactions")
      .select(`
        id,
        borrower_id,
        due_date,
        is_overdue,
        library_items (title)
      `)
      .eq("transaction_type", "borrow")
      .is("return_date", null)
      .lt("due_date", todayISO)
      .eq("is_overdue", false);

    if (overdueError) {
      console.error("Error fetching overdue transactions:", overdueError);
      throw overdueError;
    }

    console.log(`Found ${overdueTransactions?.length || 0} newly overdue transactions`);

    // Update each overdue transaction and send notifications
    for (const transaction of overdueTransactions || []) {
      // Mark as overdue
      await supabase
        .from("library_transactions")
        .update({ is_overdue: true })
        .eq("id", transaction.id);

      // Create notification for borrower
      const bookTitle = transaction.library_items?.title || "Unknown Book";
      
      await supabase.rpc("create_library_notification", {
        p_borrower_id: transaction.borrower_id,
        p_title: "Book Overdue",
        p_message: `"${bookTitle}" is now overdue. Please return it as soon as possible to avoid additional fines.`,
        p_type: "warning",
        p_reference_id: transaction.id
      });

      console.log(`Marked transaction ${transaction.id} as overdue and notified borrower`);
    }

    // Find transactions due today (reminder)
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowISO = tomorrow.toISOString();

    const { data: dueTodayTransactions, error: dueTodayError } = await supabase
      .from("library_transactions")
      .select(`
        id,
        borrower_id,
        due_date,
        library_items (title)
      `)
      .eq("transaction_type", "borrow")
      .is("return_date", null)
      .gte("due_date", todayISO)
      .lt("due_date", tomorrowISO);

    if (!dueTodayError && dueTodayTransactions) {
      console.log(`Found ${dueTodayTransactions.length} books due today`);

      for (const transaction of dueTodayTransactions) {
        const bookTitle = transaction.library_items?.title || "Unknown Book";
        
        await supabase.rpc("create_library_notification", {
          p_borrower_id: transaction.borrower_id,
          p_title: "Book Due Today",
          p_message: `Reminder: "${bookTitle}" is due today. Please return it to avoid late fees.`,
          p_type: "info",
          p_reference_id: transaction.id
        });

        console.log(`Sent due today reminder for transaction ${transaction.id}`);
      }
    }

    // Find transactions due in 3 days (early reminder)
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const fourDaysLater = new Date(today);
    fourDaysLater.setDate(fourDaysLater.getDate() + 4);

    const { data: dueSoonTransactions, error: dueSoonError } = await supabase
      .from("library_transactions")
      .select(`
        id,
        borrower_id,
        due_date,
        library_items (title)
      `)
      .eq("transaction_type", "borrow")
      .is("return_date", null)
      .gte("due_date", threeDaysLater.toISOString())
      .lt("due_date", fourDaysLater.toISOString());

    if (!dueSoonError && dueSoonTransactions) {
      console.log(`Found ${dueSoonTransactions.length} books due in 3 days`);

      for (const transaction of dueSoonTransactions) {
        const bookTitle = transaction.library_items?.title || "Unknown Book";
        
        await supabase.rpc("create_library_notification", {
          p_borrower_id: transaction.borrower_id,
          p_title: "Book Due Soon",
          p_message: `"${bookTitle}" is due in 3 days on ${new Date(transaction.due_date).toLocaleDateString()}. Please return it on time.`,
          p_type: "info",
          p_reference_id: transaction.id
        });

        console.log(`Sent due soon reminder for transaction ${transaction.id}`);
      }
    }

    const summary = {
      checkedAt: new Date().toISOString(),
      newlyOverdue: overdueTransactions?.length || 0,
      dueToday: dueTodayTransactions?.length || 0,
      dueSoon: dueSoonTransactions?.length || 0
    };

    console.log("Check complete:", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in check-overdue-books function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
