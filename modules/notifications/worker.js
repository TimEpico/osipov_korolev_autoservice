import { buildPushPayload } from "@block65/webcrypto-web-push";
const origin = "https://timepico.github.io";
const cors = {
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Cache-Control": "no-store",
};
const response = (status, value) =>
  new Response(value, { status, headers: cors });
export function validSubscription(s) {
  try {
    const u = new URL(s.endpoint);
    return (
      u.protocol === "https:" &&
      !u.port &&
      !u.username &&
      !u.password &&
      ([
        "fcm.googleapis.com",
        "push.services.mozilla.com",
        "web.push.apple.com",
      ].includes(u.hostname) ||
        u.hostname.endsWith(".push.apple.com") ||
        u.hostname.endsWith(".push.services.mozilla.com")) &&
      /^[\w-]{87}$/.test(s.keys.p256dh) &&
      /^[\w-]{22}$/.test(s.keys.auth)
    );
  } catch {
    return false;
  }
}
export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return response(204, null);
    if (req.headers.get("origin") !== origin || req.method !== "POST")
      return response(403, "Forbidden");
    if (
      !(
        await env.LIMIT.limit({
          key: req.headers.get("CF-Connecting-IP") || "local",
        })
      ).success
    )
      return response(429, "Too many requests");
    const token = /^Bearer ([0-9a-f]{64})$/.exec(
      req.headers.get("authorization") || "",
    )?.[1];
    if (!/^[0-9a-f]{64}$/.test(token || ""))
      return response(401, "Unauthorized");
    const id = env.DEVICES.idFromName(token);
    return env.DEVICES.get(id).fetch(req);
  },
};
export class Device {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.store = ctx.storage;
    this.env = env;
  }
  async fetch(req) {
    return this.ctx.blockConcurrencyWhile(async () => {
      const path = new URL(req.url).pathname;
      if (path === "/off") {
        await this.store.deleteAlarm();
        await this.store.deleteAll();
        return response(204, null);
      }
      const text = await req.text();
      if (text.length > 64000) return response(413, "Too large");
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        return response(400, "Invalid JSON");
      }
      if (
        path !== "/sync" ||
        !body ||
        !validSubscription(body.sub) ||
        !Array.isArray(body.tasks) ||
        body.tasks.length > 250
      )
        return response(400, "Invalid subscription or task list");
      if (
        body.tasks.some(
          (t) =>
            !t ||
            !Number.isSafeInteger(t.at) ||
            typeof t.id !== "string" ||
            t.id.length > 60 ||
            typeof t.label !== "string" ||
            t.label.length > 220,
        )
      )
        return response(400, "Invalid task");
      const old = await this.store.get("state");
      const sent = (old?.sent || []).filter((id) =>
        body.tasks.some((t) => t.id === id),
      );
      const state = {
        sub: body.sub,
        tasks: body.tasks,
        sent,
        test: old?.test || 0,
      };
      if (body.test && !state.test) state.test = Date.now() + 10000;
      await this.store.put("state", state);
      await this.schedule(state);
      return response(204, null);
    });
  }
  async schedule(s) {
    const times = s.tasks
      .filter((t) => !s.sent.includes(t.id))
      .map((t) => t.at);
    if (s.test) times.push(s.test);
    if (times.length)
      await this.store.setAlarm(Math.max(Date.now() + 100, Math.min(...times)));
    else await this.store.deleteAlarm();
  }
  async alarm() {
    await this.ctx.blockConcurrencyWhile(async () => {
      const s = await this.store.get("state");
      if (!s) return;
      const now = Date.now(),
        task = s.tasks.find((t) => t.at <= now && !s.sent.includes(t.id));
      const test = s.test && s.test <= now;
      if (test || task) {
        const data = {
          body: test ? "Тестовое уведомление AutoService" : task.label,
          id: test ? "test" : task.id,
        };
        const init = await buildPushPayload(
          { data: JSON.stringify(data), options: { ttl: 3600 } },
          s.sub,
          {
            subject: "https://github.com/TimEpico/autoservice-mobile-preview",
            publicKey: this.env.VAPID_PUBLIC,
            privateKey: this.env.VAPID_PRIVATE,
          },
        );
        const res = await fetch(s.sub.endpoint, {
          ...init,
          redirect: "manual",
        });
        if (
          res.status >= 400 &&
          res.status < 500 &&
          ![429, 408].includes(res.status)
        ) {
          await this.store.deleteAll();
          return;
        }
        if (!res.ok) {
          await this.store.setAlarm(
            now +
              Math.max(
                60000,
                Math.min(
                  3600000,
                  Number(res.headers.get("retry-after") || 60) * 1000 || 60000,
                ),
              ),
          );
          return;
        }
        if (test) s.test = 0;
        else s.sent.push(task.id);
        await this.store.put("state", s);
      }
      await this.schedule(s);
    });
  }
}
