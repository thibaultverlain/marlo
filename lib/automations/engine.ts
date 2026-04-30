import { db } from "@/lib/db/client";
import { products, tasks, automations } from "@/lib/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { getEnabledAutomations, markAutomationRun } from "@/lib/db/queries/automations";
import { createTask } from "@/lib/db/queries/tasks";
import { createNotification, notifyShopMembers } from "@/lib/db/queries/notifications";

/**
 * TRIGGER TYPES:
 * - dormant_stock     : article en stock depuis N jours (triggerValue = nb jours)
 * - sale_recorded     : quand une vente est enregistree
 * - low_margin        : marge < N% (triggerValue = seuil en %)
 * - deadline_passed   : deadline sourcing depassee
 *
 * ACTION TYPES:
 * - create_task       : creer une tache (actionValue = titre)
 * - notify_owner      : notifier le proprietaire (actionValue = message)
 * - notify_team       : notifier toute l'equipe (actionValue = message)
 */

type AutomationContext = {
  shopId: string;
  userId: string;
  entityType?: string;
  entityId?: string;
  entityTitle?: string;
  marginPct?: number;
  salePrice?: number;
};

export async function executeAutomations(trigger: string, ctx: AutomationContext): Promise<number> {
  const rules = await getEnabledAutomations(ctx.shopId, trigger);
  let executed = 0;

  for (const rule of rules) {
    try {
      const shouldRun = evaluateTrigger(rule, ctx);
      if (!shouldRun) continue;

      await executeAction(rule, ctx);
      await markAutomationRun(rule.id);
      executed++;
    } catch (err) {
      console.error(`Automation ${rule.id} failed:`, err);
    }
  }

  return executed;
}

function evaluateTrigger(rule: typeof automations.$inferSelect, ctx: AutomationContext): boolean {
  switch (rule.trigger) {
    case "sale_recorded":
      return true;
    case "low_margin":
      if (ctx.marginPct === undefined) return false;
      const threshold = parseFloat(rule.triggerValue ?? "20");
      return ctx.marginPct < threshold;
    default:
      return true;
  }
}

async function executeAction(rule: typeof automations.$inferSelect, ctx: AutomationContext): Promise<void> {
  const actionValue = rule.actionValue ?? "";
  const title = actionValue
    .replace("{title}", ctx.entityTitle ?? "")
    .replace("{margin}", ctx.marginPct?.toFixed(0) ?? "")
    .replace("{price}", ctx.salePrice?.toFixed(0) ?? "");

  switch (rule.action) {
    case "create_task":
      await createTask({
        shopId: ctx.shopId,
        createdBy: ctx.userId,
        title: title || `Auto: ${rule.name}`,
        description: `Generee par l'automatisation "${rule.name}"`,
        status: "a_faire",
        priority: "normale",
        relatedEntity: ctx.entityType,
        relatedEntityId: ctx.entityId,
      });
      break;

    case "notify_owner": {
      const { teamMembers } = await import("@/lib/db/schema");
      const [owner] = await db
        .select({ userId: teamMembers.userId })
        .from(teamMembers)
        .where(and(eq(teamMembers.shopId, ctx.shopId), eq(teamMembers.role, "owner")))
        .limit(1);
      if (owner) {
        await createNotification(
          ctx.shopId,
          owner.userId,
          "automation",
          title || rule.name,
          `Automatisation: ${rule.name}`,
          ctx.entityId ? `/${ctx.entityType}s/${ctx.entityId}` : undefined
        );
      }
      break;
    }

    case "notify_team":
      await notifyShopMembers(
        ctx.shopId,
        ctx.userId,
        "automation",
        title || rule.name,
        `Automatisation: ${rule.name}`,
        ctx.entityId ? `/${ctx.entityType}s/${ctx.entityId}` : undefined
      );
      break;
  }
}

/**
 * Process daily automations (called by cron).
 * Handles: dormant_stock, deadline_passed
 */
export async function processDailyAutomations(shopId: string): Promise<number> {
  let executed = 0;

  // Dormant stock automations
  const dormantRules = await getEnabledAutomations(shopId, "dormant_stock");
  for (const rule of dormantRules) {
    const days = parseInt(rule.triggerValue ?? "30", 10);
    const dormantProducts = await db
      .select({ id: products.id, title: products.title })
      .from(products)
      .where(
        and(
          eq(products.shopId, shopId),
          inArray(products.status, ["en_stock", "en_vente"]),
          sql`created_at < NOW() - make_interval(days => ${days})`
        )
      );

    for (const product of dormantProducts) {
      await executeAction(rule, {
        shopId,
        userId: rule.createdBy,
        entityType: "product",
        entityId: product.id,
        entityTitle: product.title,
      });
    }

    if (dormantProducts.length > 0) {
      await markAutomationRun(rule.id);
      executed++;
    }
  }

  return executed;
}
