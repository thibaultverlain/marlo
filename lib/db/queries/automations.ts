import { db } from "../client";
import { automations, type NewAutomation, type Automation } from "../schema";
import { eq, and, desc } from "drizzle-orm";

export async function getShopAutomations(shopId: string): Promise<Automation[]> {
  return db
    .select()
    .from(automations)
    .where(eq(automations.shopId, shopId))
    .orderBy(desc(automations.createdAt));
}

export async function getEnabledAutomations(shopId: string, trigger: string): Promise<Automation[]> {
  return db
    .select()
    .from(automations)
    .where(
      and(
        eq(automations.shopId, shopId),
        eq(automations.trigger, trigger),
        eq(automations.enabled, true)
      )
    );
}

export async function createAutomation(data: NewAutomation): Promise<Automation> {
  const rows = await db.insert(automations).values(data).returning();
  return rows[0];
}

export async function updateAutomation(id: string, shopId: string, data: Partial<NewAutomation>): Promise<Automation | undefined> {
  const rows = await db
    .update(automations)
    .set(data)
    .where(and(eq(automations.id, id), eq(automations.shopId, shopId)))
    .returning();
  return rows[0];
}

export async function deleteAutomation(id: string, shopId: string): Promise<void> {
  await db.delete(automations).where(and(eq(automations.id, id), eq(automations.shopId, shopId)));
}

export async function markAutomationRun(id: string): Promise<void> {
  await db
    .update(automations)
    .set({
      lastRun: new Date(),
      runCount: automations.runCount,
    })
    .where(eq(automations.id, id));

  // Increment run count separately
  await db.execute(
    `UPDATE automations SET run_count = run_count + 1 WHERE id = '${id}'`
  );
}
