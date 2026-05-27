import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PushSubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

function getNotificationPayload(type: string, taskTitle?: string, taskId?: string) {
  const isCreated = type === "created";

  return {
    type,
    title: isCreated ? "New task added" : "Task completed",
    body: taskTitle
      ? `${isCreated ? "New" : "Completed"}: ${taskTitle}`
      : isCreated
        ? "A new task was added."
        : "A task was marked as completed.",
    tag: `task-${type}-${taskId || Date.now()}`,
    url: "/",
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const vapidPublicKey = Deno.env.get("WEB_PUSH_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("WEB_PUSH_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("WEB_PUSH_SUBJECT") || "mailto:admin@example.com";

    if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
      return new Response(JSON.stringify({ error: "Missing Web Push environment variables." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { type = "completed", task, originEndpoint } = await request.json();
    const notificationPayload = getNotificationPayload(type, task?.title, task?.id);
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint,p256dh,auth");

    if (error) {
      throw error;
    }

    const sendResults = await Promise.allSettled(
      (subscriptions || [])
        .filter((subscription: PushSubscriptionRow) => subscription.endpoint !== originEndpoint)
        .map(async (subscription: PushSubscriptionRow) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: subscription.endpoint,
                keys: {
                  p256dh: subscription.p256dh,
                  auth: subscription.auth,
                },
              },
              JSON.stringify(notificationPayload),
            );
          } catch (sendError) {
            const statusCode = (sendError as { statusCode?: number }).statusCode;

            if (statusCode === 404 || statusCode === 410) {
              await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
            }

            throw sendError;
          }
        }),
    );

    const sent = sendResults.filter((result) => result.status === "fulfilled").length;
    const failed = sendResults.length - sent;

    return new Response(JSON.stringify({ sent, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
