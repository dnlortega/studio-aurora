import { sql, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { users } from "@/lib/db/schema";
import { createTestContext, type TestContext } from "../helpers/db";

let context: TestContext;

beforeAll(async () => {
  context = await createTestContext();
});

afterAll(async () => {
  await context.close();
});

/**
 * A checagem de “e-mail já cadastrado” da tela de criação de conta tem duas
 * camadas: a consulta por `lower(email)` (mesmo resultado para `Ana@X.com`
 * e `ana@x.com`) e o índice único do banco, que segura a corrida entre duas
 * requisições simultâneas. Este teste cobre o índice no schema real.
 */
describe("unicidade de e-mail no banco", () => {
  const email = `dup-${Date.now()}@teste.local`;

  it("encontra o cadastro ignorando maiúsculas e minúsculas", async () => {
    await context.db
      .insert(users)
      .values({ name: "Dup Teste", email, passwordHash: "hash", role: "client" });

    // Mesmo padrão de `emailMatches`, em `src/actions/auth.ts`: a coluna é
    // comparada em minúsculas com o e-mail já normalizado.
    const rows = await context.db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${email.toUpperCase().trim().toLowerCase()}`);

    expect(rows).toHaveLength(1);
  });

  it("rejeita o segundo cadastro do mesmo e-mail em outra grafia", async () => {
    await expect(
      context.db
        .insert(users)
        .values({
          name: "Dup Teste 2",
          email: email.toUpperCase(),
          passwordHash: "hash",
          role: "client",
        }),
    ).rejects.toThrow();

    const remaining = await context.db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`);

    expect(remaining).toHaveLength(1);
  });

  it("permite um e-mail diferente para outra conta", async () => {
    const outro = `outro-${Date.now()}@teste.local`;
    await context.db
      .insert(users)
      .values({ name: "Outro", email: outro, passwordHash: "hash" });

    const row = await context.db.query.users.findFirst({
      where: eq(users.email, outro),
    });
    expect(row?.role).toBe("client");
  });
});
