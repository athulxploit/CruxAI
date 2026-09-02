import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getRequest } from "@tanstack/react-start/server";

// Admin check helper (internal server use only)
const isAdmin = async (userId: string) => {
  const { data: roleData } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!roleData;
};

export const getAdminAnalytics = createServerFn({ method: "GET" })
  .handler(async () => {
    const request = getRequest();
    if (!request) throw new Error("No request found");

    // 1. Verify caller is admin
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    
    const token = authHeader.replace("Bearer ", "");
    // Use admin client to get user from token safely on server
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user || !(await isAdmin(user.id))) {
      throw new Error("Forbidden");
    }

    // 2. Fetch all real-time stats
    const now = new Date();
    const todayStart = new Date(new Date(now).setHours(0, 0, 0, 0)).toISOString();
    const weekStart = new Date(new Date().setDate(new Date().getDate() - 7)).toISOString();
    const monthStart = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString();
    
    const [
      totalUsers,
      activeNow,
      activeToday,
      newUsersToday,
      newUsersWeek,
      newUsersMonth,
      planDistribution,
      modelLeaderboard,
      usageStats,
      userGrowth,
      multimodalStats
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("user_sessions")
        .select("user_id", { count: "exact", head: true })
        .eq("revoked", false)
        .gt("last_seen", new Date(Date.now() - 5 * 60 * 1000).toISOString()),
      supabaseAdmin.from("profiles")
        .select("id", { count: "exact", head: true })
        .gt("last_seen_at", todayStart),
      supabaseAdmin.from("profiles")
        .select("id", { count: "exact", head: true })
        .gt("created_at", todayStart),
      supabaseAdmin.from("profiles")
        .select("id", { count: "exact", head: true })
        .gt("created_at", weekStart),
      supabaseAdmin.from("profiles")
        .select("id", { count: "exact", head: true })
        .gt("created_at", monthStart),
      supabaseAdmin.rpc("get_plan_distribution"),
      supabaseAdmin.rpc("get_model_leaderboard", { _days: 7 }),
      supabaseAdmin.rpc("get_model_usage_stats", { _days: 1 }),
      supabaseAdmin.rpc("get_user_growth", { _days: 30 }),
      supabaseAdmin.rpc("get_model_multimodal_stats", { _days: 7 })
    ]);

    // Format usage stats
    const usage = (usageStats.data as any[] ?? []).reduce((acc: any, curr: any) => {
      acc[curr.status] = Number(curr.count);
      acc.total = (acc.total || 0) + Number(curr.count);
      return acc;
    }, { success: 0, error: 0, timeout: 0, total: 0 });

    // 3. Performance & Test Logs
    const [performanceAnalytics, testLogs] = await Promise.all([
      supabaseAdmin.rpc("get_performance_analytics", { _days: 7 }),
      supabaseAdmin.from("xcomm_test_logs").select("*").order("created_at", { ascending: false }).limit(50)
    ]);

    return {
      users: {
        total: totalUsers.count ?? 0,
        activeNow: activeNow.count ?? 0,
        activeToday: activeToday.count ?? 0,
        newToday: newUsersToday.count ?? 0,
        newWeek: newUsersWeek.count ?? 0,
        newMonth: newUsersMonth.count ?? 0,
      },
      plans: planDistribution.data ?? [],
      models: modelLeaderboard.data ?? [],
      growth: userGrowth.data ?? [],
      usage,
      multimodal: multimodalStats.data ?? [],
      performance: performanceAnalytics.data ?? { performance: [], plan_usage: [] },
      testLogs: testLogs.data ?? [],
      revenue: null,
      timestamp: new Date().toISOString()
    };
  });
