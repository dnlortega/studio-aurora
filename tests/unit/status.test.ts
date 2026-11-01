import { describe, expect, it } from "vitest";

import { redactDatabaseUrl } from "@/lib/db";
import { formErrorCode, formDataValues } from "@/lib/form-action";
import {
  buildStatusSections,
  sanitizeDiagnosticError,
  type StatusInput,
} from "@/lib/status";

const SECRET = "senha-super-secreta";
const USER = "neon_owner";

function baseInput(overrides: Partial<StatusInput> = {}): StatusInput {
  return {
    now: new Date("2026-11-01T12:00:00Z"),
    nodeEnv: "production",
    uptimeSeconds: 42,
    nodeVersion: "v22.11.0",
    appVersion: "1.0.0",
    nextVersion: "16.4.3",
    database: {
      connected: true,
      latencyMs: 12,
      driver: "postgres",
      target: "ep-cool-duck-123.us-east-2.aws.neon.tech:5432/aurora",
      autoMigrate: false,
      migrationsApplied: 1,
      tables: { users: 4, services: 6, appointments: 12 },
    },
    vercel: {
      isVercel: true,
      env: "production",
      region: "iad1",
      publicUrl: "https://studio-aurora.vercel.app",
    },
    repository: {
      source: "vercel",
      provider: "github",
      repo: "dnlortega/studio-aurora",
      branch: "main",
      commit: "1bf1692",
      url: "https://github.com/dnlortega/studio-aurora",
    },
    secrets: {
      authSecret: true,
      resendApiKey: true,
      emailFrom: true,
      databaseUrl: true,
    },
    ...overrides,
  };
}

describe("redactDatabaseUrl", () => {
  it("mantém host, porta e base e remove usuário, senha e query string", () => {
    const redacted = redactDatabaseUrl(
      `postgresql://${USER}:${SECRET}@ep-duck.us-east-2.aws.neon.tech:5432/aurora?sslmode=require`,
    );
    expect(redacted).toBe(
      "ep-duck.us-east-2.aws.neon.tech:5432/aurora",
    );
    expect(redacted).not.toContain(SECRET);
    expect(redacted).not.toContain(USER);
  });

  it("assume a porta padrão do PostgreSQL quando ela não vem na URL", () => {
    expect(redactDatabaseUrl(`postgres://${USER}:${SECRET}@host/db`)).toBe(
      "host:5432/db",
    );
  });

  it("não vaza a string inteira quando a URL é inválida", () => {
    expect(redactDatabaseUrl(`${USER}:${SECRET}@sem-esquema`)).toBe(
      "url inválida",
    );
  });
});

describe("formErrorCode", () => {
  it("retorna vazio quando a operação deu certo", () => {
    expect(formErrorCode({ ok: true, message: "Salvo." })).toBe("");
  });

  it("classifica o e-mail já cadastrado pela mensagem do campo", () => {
    expect(
      formErrorCode({
        ok: false,
        message: "Este e-mail já está cadastrado.",
        fieldErrors: { email: "Este e-mail já está cadastrado." },
      }),
    ).toBe("cadastrado");
  });

  it("mapeia os demais erros conhecidos", () => {
    expect(formErrorCode({ ok: false, message: "Credenciais inválidos." })).toBe(
      "credenciais",
    );
    expect(
      formErrorCode({ ok: false, message: "Muitas solicitações." }),
    ).toBe("limite");
    expect(
      formErrorCode({ ok: false, message: "A senha atual não confere." }),
    ).toBe("senha-atual");
    expect(
      formErrorCode({ ok: false, message: "Link inválido ou expirado." }),
    ).toBe("token");
    expect(
      formErrorCode({ ok: false, message: "Sua sessão expirou." }),
    ).toBe("sessao");
    expect(
      formErrorCode({ ok: false, message: "Revise os dados informados." }),
    ).toBe("dados");
  });

  it("não devolve a mensagem original como código", () => {
    const code = formErrorCode({
      ok: false,
      message: `erro com ${SECRET} embutida`,
    });
    expect(code).toBe("dados");
    expect(code).not.toContain(SECRET);
  });
});

describe("formDataValues", () => {
  it("preserva apenas os valores de texto do formulário", () => {
    const data = new FormData();
    data.set("email", "ana@teste.local");
    data.set("extra", new Blob(["x"]));
    expect(formDataValues(data)).toEqual({ email: "ana@teste.local" });
  });
});

describe("buildStatusSections", () => {
  it("monta as quatro seções esperadas", () => {
    const sections = buildStatusSections(baseInput());
    expect(sections.map((section) => section.id)).toEqual([
      "banco",
      "hospedagem",
      "repositorio",
      "integracoes",
    ]);
  });

  it("marca o banco embutido como atenção, não como ok", () => {
    const sections = buildStatusSections(
      baseInput({
        nodeEnv: "development",
        database: {
          connected: true,
          latencyMs: 3,
          driver: "pglite",
          target: "/tmp/.data/pglite",
          autoMigrate: true,
          migrationsApplied: 1,
          tables: { users: 1, services: 6, appointments: 0 },
        },
        vercel: { isVercel: false, env: null, region: null, publicUrl: null },
        repository: {
          source: "nenhum",
          provider: null,
          repo: null,
          branch: null,
          commit: null,
          url: null,
        },
        secrets: {
          authSecret: true,
          resendApiKey: false,
          emailFrom: false,
          databaseUrl: false,
        },
      }),
    );

    const motor = sections
      .find((section) => section.id === "banco")!
      .items.find((item) => item.label === "Motor");
    expect(motor?.tone).toBe("warn");
    expect(motor?.value).toContain("PGlite");

    const origem = sections.find((section) => section.id === "repositorio")!
      .items[0];
    expect(origem.tone).toBe("warn");

    const url = sections
      .find((section) => section.id === "hospedagem")!
      .items.find((item) => item.label === "URL pública");
    expect(url?.tone).toBe("warn");
  });

  it("reporta erro quando o banco não respondeu", () => {
    const sections = buildStatusSections(
      baseInput({
        database: {
          connected: false,
          latencyMs: null,
          driver: null,
          target: null,
          autoMigrate: null,
          migrationsApplied: null,
          tables: { users: 0, services: 0, appointments: 0 },
          error: "connection refused",
        },
      }),
    );
    const conexao = sections
      .find((section) => section.id === "banco")!
      .items[0];
    expect(conexao.tone).toBe("error");
    expect(conexao.value).toBe("falhou");
  });

  it("mostra apenas presença das chaves, nunca os valores", () => {
    const sections = buildStatusSections(baseInput());
    const serialized = JSON.stringify(sections);
    expect(serialized).toContain("AUTH_SECRET");
    expect(serialized).toContain("configurado");
    expect(serialized).not.toContain(SECRET);
    expect(serialized).not.toContain(USER);
  });

  it("mantém o segredo fora do diagnóstico mesmo quando o erro o contém", () => {
    process.env.DATABASE_URL = `postgres://${USER}:${SECRET}@neon.example:5432/aurora`;
    try {
      const message = sanitizeDiagnosticError(
        `connect failed: postgres://${USER}:${SECRET}@neon.example:5432/aurora`,
      );
      expect(message).not.toContain(SECRET);
      expect(message).not.toContain(USER);
      expect(message).toContain("[redigido]");

      const sections = buildStatusSections(
        baseInput({
          database: {
            connected: false,
            latencyMs: null,
            driver: null,
            target: redactDatabaseUrl(process.env.DATABASE_URL),
            autoMigrate: null,
            migrationsApplied: null,
            tables: { users: 0, services: 0, appointments: 0 },
            error: message,
          },
        }),
      );
      expect(JSON.stringify(sections)).not.toContain(SECRET);
    } finally {
      delete process.env.DATABASE_URL;
    }
  });

  it("redige user:pass mesmo sem conhecer a variável de ambiente", () => {
    const message = sanitizeDiagnosticError(
      "tentativa em postgres://outra:pessoa@host:5432/db falhou",
    );
    expect(message).not.toContain("pessoa");
    expect(message).toContain("//[redigido]@");
  });

  it("limita o tamanho do texto reproduzido na tela", () => {
    expect(sanitizeDiagnosticError("x".repeat(900))).toHaveLength(200);
  });

  it("traduz a região da Vercel e omite o item quando não há região", () => {
    const withRegion = buildStatusSections(baseInput());
    const hospedagem = withRegion.find((s) => s.id === "hospedagem")!;
    expect(
      hospedagem.items.some((item) => item.value.includes("Washington D.C.")),
    ).toBe(true);

    const semRegion = buildStatusSections(
      baseInput({
        vercel: {
          isVercel: true,
          env: "preview",
          region: null,
          publicUrl: null,
        },
      }),
    );
    expect(
      semRegion
        .find((s) => s.id === "hospedagem")!
        .items.some((item) => item.label === "Região"),
    ).toBe(false);
  });
});
