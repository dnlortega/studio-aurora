/**
 * Credenciais dos testes ponta a ponta.
 *
 * Só existem no banco de teste `aurora_e2e` da Neon, que é zerado antes de cada
 * suíte — nunca no banco do salão e nunca em produção. São contas fictícias de
 * teste, não credenciais reais; por isso podem ficar no repositório.
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
