import { db } from "../client";
import { customers, type NewCustomer, type Customer } from "../schema";
import { eq, desc, sql } from "drizzle-orm";

export async function getAllCustomers(userId: string): Promise<Customer[]> {
  return db.select().from(customers).where(eq(customers.userId, userId)).orderBy(desc(customers.createdAt));
}

export async function getCustomerById(id: string): Promise<Customer | undefined> {
  const rows = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return rows[0];
}

export async function getCustomerStats(userId: string) {
  const rows = await db
    .select({
      total: sql<number>`count(*)::int`,
      vipCount: sql<number>`count(*) filter (where vip = true)::int`,
    })
    .from(customers)
    .where(eq(customers.userId, userId));
  return rows[0] ?? { total: 0, vipCount: 0 };
}

export async function createCustomer(data: NewCustomer): Promise<Customer> {
  const rows = await db.insert(customers).values(data).returning();
  return rows[0];
}

export async function updateCustomer(id: string, data: Partial<NewCustomer>): Promise<Customer | undefined> {
  const rows = await db.update(customers).set(data).where(eq(customers.id, id)).returning();
  return rows[0];
}

export async function deleteCustomer(id: string): Promise<void> {
  await db.delete(customers).where(eq(customers.id, id));
}
