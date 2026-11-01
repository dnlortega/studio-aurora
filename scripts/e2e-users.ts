/**
 * Credenciais exclusivas dos testes E2E locais.
 * Nunca são criadas em produção: o script reset-e2e só roda em PGlite local.
 */
export const E2E_USERS = {
  admin: {
    name: "Aurora Admin",
    email: "admin.e2e@studioaurora.local",
    password: "AuroraAdmin123",
  },
  client: {
    name: "Cliente Teste",
    email: "cliente.e2e@studioaurora.local",
    password: "ClienteE2e123",
    phone: "11988887777",
  },
  otherClient: {
    name: "Outro Cliente",
    email: "outro.e2e@studioaurora.local",
    password: "OutroE2e123",
    phone: "11977776666",
  },
} as const;
