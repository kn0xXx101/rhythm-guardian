import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface User {
  id: string;
  name: string;
  email: string;
  userType: 'hirer' | 'musician';
  status: 'active' | 'suspended' | 'banned' | 'pending';
  verified: boolean;
  joinDate: string;
  lastActive: string;
  profileComplete: boolean;
  documentsSubmitted: boolean;
  documentsVerified: boolean;
  completionPercentage: number;
}

/** Pathnames may be `/functions/v1/admin-users/...` — never use `split("/")[2]` (that yields `v1`). */
function extractUserIdAfterAdminUsers(pathname: string): string | null {
  const m = pathname.match(/\/admin-users\/([0-9a-f-]{36})/i);
  return m ? m[1] : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client with user's token for auth check
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify the user is authenticated and is an admin
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create admin client with service role key
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Service role key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const sendEmail = async (payload: { to: string; subject: string; html: string; type: string }) => {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn("Failed to send email:", errorText);
          return false;
        }

        return true;
      } catch (error) {
        console.warn("Failed to send email:", error);
        return false;
      }
    };

    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // Route: GET /admin-users/overview - Admin dashboard overview stats
    if (method === "GET" && path.endsWith("/admin-users/overview")) {
      const [
        { count: hirerCount, error: hirerError },
        { count: musicianCount, error: musicianError },
        { count: verifiedCount, error: verifiedError },
        { data: musicianProfiles, error: profilesError },
        { data: bookings, error: bookingsError },
      ] = await Promise.all([
        supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "hirer"),
        supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "musician"),
        supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "musician").eq("documents_verified", true),
        supabaseAdmin
          .from("profiles")
          .select("profile_completion_percentage")
          .eq("role", "musician")
          .not("profile_completion_percentage", "is", null),
        supabaseAdmin
          .from("bookings")
          .select("hirer_id, musician_id, status, total_amount, payment_status, service_confirmed_by_hirer, service_confirmed_by_musician, payout_released"),
      ]);

      if (hirerError) throw hirerError;
      if (musicianError) throw musicianError;
      if (bookingsError) throw bookingsError;

      if (verifiedError) {
        console.warn("Error fetching verified musicians:", verifiedError);
      }
      if (profilesError) {
        console.warn("Error fetching profile completion:", profilesError);
      }

      const avgCompletion =
        musicianProfiles && musicianProfiles.length > 0
          ? musicianProfiles.reduce((sum: number, p: any) => sum + (p.profile_completion_percentage || 0), 0) /
            musicianProfiles.length
          : 0;

      const hirerBookings = (bookings || []).filter((b: any) => b.hirer_id);
      const musicianBookings = (bookings || []).filter((b: any) => b.musician_id);
      const completedMusicianBookings = musicianBookings.filter((b: any) => b.status === "completed");

      const hirerStats = {
        totalHirers: hirerCount || 0,
        totalBookings: hirerBookings.length,
        pendingBookings: hirerBookings.filter(
          (b: any) => b.status === "pending" || b.status === "accepted"
        ).length,
        confirmedBookings: hirerBookings.filter(
          (b: any) => b.status === "in_progress"
        ).length,
        completedBookings: hirerBookings.filter((b: any) => b.status === "completed").length,
        cancelledBookings: hirerBookings.filter(
          (b: any) => b.status === "cancelled" || b.status === "rejected"
        ).length,
        totalSpent: hirerBookings
          .filter((b: any) => b.payment_status === "paid")
          .reduce((sum: number, b: any) => sum + parseFloat(b.total_amount?.toString() || "0"), 0),
      };

      const musicianStats = {
        totalMusicians: musicianCount || 0,
        totalBookings: musicianBookings.length,
        completedBookings: completedMusicianBookings.length,
        pendingBookings: musicianBookings.filter(
          (b: any) => b.status === "pending" || b.status === "accepted"
        ).length,
        totalEarned: musicianBookings
          .filter((b: any) => b.payment_status === "paid")
          .reduce((sum: number, b: any) => sum + parseFloat(b.total_amount?.toString() || "0"), 0),
        pendingPayouts: musicianBookings.filter(
          (b: any) =>
            b.payment_status === "paid" &&
            b.service_confirmed_by_hirer &&
            b.service_confirmed_by_musician &&
            !b.payout_released
        ).length,
        verifiedMusicians: verifiedCount || 0,
        averageProfileCompletion: Math.round(avgCompletion),
      };

      return new Response(
        JSON.stringify({ hirerStats, musicianStats }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Route: GET /admin-users - List all users
    if (method === "GET" && path.endsWith("/admin-users")) {
      console.log("GET /admin-users route hit");
      const status = url.searchParams.get("status");
      const role = url.searchParams.get("role");
      const search = url.searchParams.get("search");
      console.log("Query params:", { status, role, search });

      // Fetch profiles first (which is the main data source)
      // Use select("*") for reliability (same as verify route)
      let query = supabaseAdmin
        .from("profiles")
        .select("*")
        .not("role", "eq", "admin");

      if (status) query = query.eq("status", status);
      if (role) query = query.eq("role", role);

      console.log("Executing profiles query...");
      const { data: profiles, error: profileError } = await query;
      
      if (profileError) {
        console.error("Error fetching profiles:", profileError);
        console.error("Error code:", profileError.code);
        console.error("Error message:", profileError.message);
        console.error("Error details:", JSON.stringify(profileError, null, 2));
        console.error("Error hint:", profileError.hint);
        console.error("Query details - status:", status, "role:", role);
        
        // Try a simpler query without the neq filter to see if that's the issue
        console.log("Attempting fallback query without role filter...");
        const { data: allProfiles, error: fallbackError } = await supabaseAdmin
          .from("profiles")
          .select("*")
          .limit(10);
        
        if (fallbackError) {
          console.error("Fallback query also failed:", fallbackError);
          throw new Error(`Database error finding users: ${profileError.message} (code: ${profileError.code}). Fallback query also failed: ${fallbackError.message}`);
        } else {
          console.log(`Fallback query succeeded, got ${allProfiles?.length || 0} profiles`);
          // Filter out admins manually
          (allProfiles || []).filter((p: any) => p.role !== "admin");
          throw new Error(`Database error with role filter: ${profileError.message} (code: ${profileError.code}). Query without filter works, suggesting issue with .neq() filter.`);
        }
      }
      
      console.log(`Successfully fetched ${profiles?.length || 0} profiles`);

      // Ensure profiles is an array
      const profilesList = profiles || [];

      // Build email map by fetching auth users with pagination
      const emailMap = new Map<string, string>();
      const userIds = new Set(profilesList.map((p: any) => p.user_id));
      
      // Fetch emails from auth via admin API with pagination
      if (userIds.size > 0) {
        try {
          const allUsers: any[] = [];
          let page = 1;
          let hasMore = true;
          const maxPages = 20; // Limit to prevent infinite loops
          
          while (hasMore && page <= maxPages) {
            try {
              const { data: pageData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
                page,
                perPage: 1000
              });
              
              if (listError) {
                console.error(`Error fetching users page ${page}:`, listError);
                // If we've fetched at least some users, use what we have
                if (allUsers.length > 0) {
                  console.warn(`Stopped fetching users due to error, using ${allUsers.length} users already fetched`);
                } else {
                  // If first page fails, log but continue without emails
                  console.warn("Could not fetch any users via admin API, profiles will be returned without emails");
                }
                break;
              }
              
              if (pageData && pageData.users && pageData.users.length > 0) {
                allUsers.push(...pageData.users);
                // Continue if we got a full page (might be more)
                hasMore = pageData.users.length === 1000;
                page++;
              } else {
                hasMore = false;
              }
            } catch (err) {
              console.error(`Exception fetching users page ${page}:`, err);
              // Use what we've fetched so far
              break;
            }
          }
          
          // Build email map from fetched users
          allUsers.forEach((authUser) => {
            if (authUser.email && userIds.has(authUser.id)) {
              emailMap.set(authUser.id, authUser.email);
            }
          });
          
          console.log(`Successfully fetched ${emailMap.size} emails out of ${userIds.size} profiles`);
        } catch (emailFetchError) {
          console.warn("Could not fetch user emails, continuing without them:", emailFetchError);
          // Continue without emails - profiles will be returned with empty email strings
        }
      }

      const users: User[] = profilesList.map((profile: any) => ({
        id: profile.user_id,
        name: profile.full_name || "Unknown",
        email: emailMap.get(profile.user_id) || "",
        userType: profile.role as "hirer" | "musician",
        status: profile.status as "active" | "suspended" | "banned" | "pending",
        verified: Boolean(profile.email_verified),
        joinDate: profile.created_at,
        lastActive: profile.last_active_at || profile.created_at,
        profileComplete: Boolean(profile.profile_complete),
        documentsSubmitted: Boolean(profile.documents_submitted),
        documentsVerified: Boolean(profile.documents_verified),
        completionPercentage: profile.profile_completion_percentage || 0,
      }));

      // Apply search filter
      let filteredUsers = users;
      if (search) {
        const searchLower = search.toLowerCase();
        filteredUsers = users.filter(
          (u) =>
            u.name.toLowerCase().includes(searchLower) ||
            u.email.toLowerCase().includes(searchLower)
        );
      }

      return new Response(JSON.stringify({ users: filteredUsers }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: PUT /admin-users/:id/status - Update user status
    if (method === "PUT" && path.includes("/status")) {
      const userId = extractUserIdAfterAdminUsers(path);
      if (!userId) {
        return new Response(JSON.stringify({ error: "Invalid user id in path" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const body = (await req.json()) as { status?: string };
      const { status } = body;

      if (!status || !["active", "suspended", "banned", "pending"].includes(status)) {
        return new Response(
          JSON.stringify({ error: "Invalid status" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Update profile
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({
          status: status,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (profileError) throw profileError;

      // Update auth metadata
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
          user_metadata: { status: status },
        }
      );

      if (authError) throw authError;

      try {
        const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
        const userEmail = authUser?.user?.email;

        if (!authUserError && userEmail) {
          const siteUrl = Deno.env.get("SITE_URL") || Deno.env.get("VITE_SITE_URL") || new URL(req.url).origin;
          const loginUrl = `${siteUrl}/login`;

          if (status === "banned" || status === "suspended") {
            const subject = status === "banned" ? "Account Banned" : "Account Suspended";
            const html = `
              <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h1>${subject}</h1>
                <p>Your account has been ${status} by an administrator.</p>
                <p>If you believe this is a mistake, please contact support.</p>
              </div>
            `;
            await sendEmail({ to: userEmail, subject, html, type: "status" });
          } else if (status === "active") {
            const subject = "Account Restored";
            const html = `
              <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h1>Account Restored</h1>
                <p>Your account has been restored and is now active.</p>
                <p>You can sign in here: <a href="${loginUrl}">${loginUrl}</a></p>
              </div>
            `;
            await sendEmail({ to: userEmail, subject, html, type: "status" });
          }
        }
      } catch (emailError) {
        console.warn("Status email failed:", emailError);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: PUT /admin-users/:id/verify - Verify user
    if (method === "PUT" && path.includes("/verify")) {
      const userId = extractUserIdAfterAdminUsers(path);
      if (!userId) {
        return new Response(JSON.stringify({ error: "Invalid user id in path" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log(`Verifying user: ${userId}`);

      // Get profile
      const { data: profile, error: fetchError } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (fetchError) {
        console.error("Error fetching profile:", fetchError);
        throw new Error(`Failed to fetch profile: ${fetchError.message || fetchError.code || 'Unknown error'}`);
      }

      if (!profile) {
        throw new Error(`Profile not found for user ${userId}`);
      }

      console.log("Profile found, fetching user email...");

      // Get user email from auth
      const { data: authUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (getUserError || !authUser?.user?.email) {
        console.error("Error fetching user email:", getUserError);
        throw new Error(`Failed to fetch user email: ${getUserError?.message || 'User email not found'}`);
      }

      const userEmail = authUser.user.email;
      console.log(`User email found: ${userEmail}`);

      console.log("Profile found, updating...");

      // Update profile (only update fields that exist in the schema)
      // Note: profile_complete will be added via migration
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({
          email_verified: true,
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (profileError) {
        console.error("Error updating profile:", profileError);
        throw new Error(`Failed to update profile: ${profileError.message || profileError.code || 'Unknown error'}. Details: ${JSON.stringify(profileError)}`);
      }

      console.log("Profile updated, updating auth...");

      // Update auth
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
          email_confirm: true,
          user_metadata: {
            status: "active",
            verified: true,
            email_verified: true,
            documents_verified: profile.documents_verified || true,
            profile_complete: profile.profile_complete || true,
            role: profile.role,
          },
        }
      );

      if (authError) {
        console.error("Error updating auth:", authError);
        throw new Error(`Failed to update auth user: ${authError.message || 'Unknown error'}`);
      }

      // Create in-app notification for the user
      try {
        const { error: notifError } = await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: userId,
            type: 'system',
            title: 'Account Approved',
            message: 'Your account has been approved! You can now log in and start using the platform.',
            read: false,
          });
        
        if (notifError) {
          console.warn("Failed to create notification:", notifError);
        }
      } catch (notifErr) {
        console.warn("Exception creating notification:", notifErr);
      }

      console.log("Sending approval email to user...");

      // Send approval email to user using magic link
      // This will send an email with a login link and notify them of their approval
      const siteUrl = Deno.env.get("SITE_URL") || Deno.env.get("VITE_SITE_URL") || new URL(req.url).origin;
      const redirectUrl = `${siteUrl}/login?approved=true`;
      
      try {
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: userEmail,
          options: {
            redirectTo: redirectUrl,
            data: {
              status: 'active',
              verified: true,
              email_verified: true,
              documents_verified: profile.documents_verified || true,
              profile_complete: profile.profile_complete || true,
              role: profile.role,
              approved: true,
              message: 'Your account has been approved! You can now log in and start using the platform.',
            },
          },
        });

        if (linkError) {
          console.error("Error generating approval link:", linkError);
          // Don't fail the verification if email fails, but log it
          console.warn("User verification succeeded but email notification failed. User can still log in.");
        } else {
          console.log("Approval email sent successfully");
        }

        const actionLink = (linkData as any)?.action_link || (linkData as any)?.properties?.action_link || redirectUrl;
        const html = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h1>Account Approved</h1>
            <p>Your account has been approved. You can now log in and start using the platform.</p>
            <p><a href="${actionLink}">Log in to your account</a></p>
          </div>
        `;
        await sendEmail({
          to: userEmail,
          subject: "Your account has been approved",
          html,
          type: "verification",
        });
      } catch (emailError) {
        console.error("Exception sending approval email:", emailError);
        // Don't fail the verification if email fails
        console.warn("User verification succeeded but email notification failed. User can still log in.");
      }

      console.log("User verified successfully");
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: DELETE /admin-users/bookings/:id - Delete a booking (admin only)
    if (method === "DELETE" && path.includes("/admin-users/bookings/")) {
      const parts = path.split("/").filter(Boolean);
      const bookingId = parts[parts.length - 1];
      if (!bookingId) {
        return new Response(JSON.stringify({ error: "Missing booking id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: deleteError } = await supabaseAdmin.from("bookings").delete().eq("id", bookingId);
      if (deleteError) throw deleteError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: POST /admin-users/bookings/purge - Delete all bookings (admin only)
    if (method === "POST" && path.endsWith("/admin-users/bookings/purge")) {
      const body = (await req.json().catch(() => ({}))) as { confirm?: string };
      if (body.confirm !== "DELETE_ALL_BOOKINGS") {
        return new Response(JSON.stringify({ error: "Confirmation required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: purgeError } = await supabaseAdmin.from("bookings").delete().neq("id", "");
      if (purgeError) throw purgeError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: DELETE /admin-users/:id - Delete a user account (admin only)
    // Note: this deletes the auth user and best-effort related rows.
    if (
      method === "DELETE" &&
      path.includes("/admin-users/") &&
      !path.includes("/admin-users/bookings") &&
      !path.includes("/status") &&
      !path.includes("/verify")
    ) {
      const userId = extractUserIdAfterAdminUsers(path) || path.split("/").filter(Boolean).pop() || "";
      if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
        return new Response(JSON.stringify({ error: "Missing or invalid user id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (user?.id === userId) {
        return new Response(JSON.stringify({ error: "You cannot delete your own admin account" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (targetProfileError) throw targetProfileError;
      if (targetProfile?.role === "admin") {
        return new Response(JSON.stringify({ error: "Cannot delete admin accounts" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Cleanup dependent rows first to prevent profile deletion constraints.
      await supabaseAdmin.from("transactions").delete().eq("user_id", userId);
      await supabaseAdmin.from("bookings").delete().or(`hirer_id.eq.${userId},musician_id.eq.${userId}`);
      await supabaseAdmin.from("notifications").delete().eq("user_id", userId);
      await supabaseAdmin.from("messages").delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
      await supabaseAdmin.from("conversations").delete().or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`);
      await supabaseAdmin.from("reviews").delete().or(`reviewer_id.eq.${userId},reviewee_id.eq.${userId}`);
      await supabaseAdmin.from("support_tickets").delete().or(`user_id.eq.${userId},assigned_admin_id.eq.${userId}`);
      await supabaseAdmin.from("ticket_messages").delete().eq("sender_id", userId);
      await supabaseAdmin.from("disputes").delete().or(`filed_by.eq.${userId},filed_against.eq.${userId},resolved_by.eq.${userId}`);
      await supabaseAdmin.from("dispute_messages").delete().eq("sender_id", userId);
      await supabaseAdmin.from("dispute_evidence").delete().eq("uploaded_by", userId);
      await supabaseAdmin.from("referrals").delete().or(`referrer_id.eq.${userId},referred_user_id.eq.${userId}`);
      await supabaseAdmin.from("fraud_reports").delete().or(`user_id.eq.${userId},resolved_by.eq.${userId}`);
      await supabaseAdmin.from("content_flags").delete().eq("actor_user_id", userId);
      await supabaseAdmin.from("user_settings").delete().eq("user_id", userId);
      await supabaseAdmin.from("musician_availability").delete().eq("musician_user_id", userId);
      await supabaseAdmin.from("availability_patterns").delete().eq("musician_user_id", userId);
      await supabaseAdmin.from("musician_packages").delete().eq("musician_user_id", userId);
      await supabaseAdmin.from("musician_addons").delete().eq("musician_user_id", userId);
      await supabaseAdmin.from("musician_portfolio").delete().eq("musician_user_id", userId);

      // Profile row must be deleted; otherwise user still appears in admin list.
      const { error: profileDeleteError } = await supabaseAdmin.from("profiles").delete().eq("user_id", userId);
      if (profileDeleteError) throw profileDeleteError;

      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (authDeleteError) throw authDeleteError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: POST /admin-users/purge - Delete all non-admin users (admin only)
    if (method === "POST" && path.endsWith("/admin-users/purge")) {
      const body = (await req.json().catch(() => ({}))) as { confirm?: string; limit?: number };
      if (body.confirm !== "DELETE_ALL_USERS") {
        return new Response(JSON.stringify({ error: "Confirmation required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const limit = typeof body.limit === "number" && body.limit > 0 ? Math.min(body.limit, 500) : 500;
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select("user_id, role")
        .not("role", "eq", "admin")
        .limit(limit);
      if (profilesError) throw profilesError;

      const ids = (profiles || []).map((p: any) => p.user_id).filter(Boolean);
      if (ids.length === 0) {
        return new Response(JSON.stringify({ success: true, deleted: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete related rows first, then profiles (strict: fail if profiles can't be deleted).
      await supabaseAdmin.from("bookings").delete().in("hirer_id", ids);
      await supabaseAdmin.from("bookings").delete().in("musician_id", ids);
      await supabaseAdmin.from("notifications").delete().in("user_id", ids);
      await supabaseAdmin.from("messages").delete().in("sender_id", ids);
      await supabaseAdmin.from("messages").delete().in("receiver_id", ids);
      await supabaseAdmin.from("reviews").delete().in("reviewer_id", ids);
      await supabaseAdmin.from("reviews").delete().in("reviewee_id", ids);
      await supabaseAdmin.from("support_tickets").delete().in("user_id", ids);
      await supabaseAdmin.from("ticket_messages").delete().in("sender_id", ids);
      await supabaseAdmin.from("dispute_messages").delete().in("sender_id", ids);
      await supabaseAdmin.from("dispute_evidence").delete().in("uploaded_by", ids);
      await supabaseAdmin.from("user_settings").delete().in("user_id", ids);
      await supabaseAdmin.from("musician_availability").delete().in("musician_user_id", ids);
      await supabaseAdmin.from("availability_patterns").delete().in("musician_user_id", ids);
      await supabaseAdmin.from("musician_packages").delete().in("musician_user_id", ids);
      await supabaseAdmin.from("musician_addons").delete().in("musician_user_id", ids);
      await supabaseAdmin.from("musician_portfolio").delete().in("musician_user_id", ids);
      const { error: profilePurgeError } = await supabaseAdmin.from("profiles").delete().in("user_id", ids);
      if (profilePurgeError) throw profilePurgeError;

      let deleted = 0;
      for (const id of ids) {
        const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (!delErr) deleted += 1;
      }

      return new Response(JSON.stringify({ success: true, deleted }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in admin-users function:", error);
    console.error("Error type:", typeof error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    
    // Extract error message from various error types
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error && typeof error === 'object') {
      // Handle Supabase errors
      if ('message' in error) {
        errorMessage = String(error.message);
      } else if ('error' in error && typeof error.error === 'string') {
        errorMessage = error.error;
      } else if ('code' in error) {
        errorMessage = `Error code: ${error.code}`;
      } else {
        errorMessage = JSON.stringify(error);
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
