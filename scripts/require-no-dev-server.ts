import { connect } from "node:net";

/**
 * Preflight da suíte E2E.
 *
 * O Next 16 não permite dois `next dev` na mesma pasta: se o servidor de
 * desenvolvimento estiver de pé na porta 3000, o `next dev --port 3100` do
 * Playwright morre com uma mensagem solta no meio do log. Aqui a falha acontece
 * antes de qualquer reset de banco, com a instrução certa.
 */
const PORTS = [Number(process.env.E2E_RESERVED_PORT ?? 3000)];

function isInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ port, host: "127.0.0.1" });
    socket.setTimeout(600);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => resolve(false));
  });
}

async function main() {
  const busy: number[] = [];
  for (const port of PORTS) {
    if (port && (await isInUse(port))) busy.push(port);
  }
  if (busy.length > 0) {
    console.error(
      `Servidor já ouvindo na porta ${busy.join(", ")}. Pare o npm run dev antes de rodar npm run test:e2e — a suíte sobe o próprio next dev na 3100 e o Next não permite dois servidores na mesma pasta.`,
    );
    process.exit(1);
  }
}

main().catch(() => process.exit(1));
