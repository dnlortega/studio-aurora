import { ImageResponse } from "next/og";

import { getSettings } from "@/lib/settings";

/**
 * Imagem social do site. É lida do Neon na hora da requisição (`force-dynamic`):
 * o nome do salão e o aviso público aparecem corretos mesmo depois de o admin
 * mudar as configurações, e a `next build` nunca tenta conectar no banco.
 */
export const alt = "Studio Aurora — agende manicure, pedicure e unhas em gel";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

const FALLBACK = { salonName: "Studio Aurora", tagline: "Unhas cuidadas no seu tempo." };

export default async function OpenGraphImage() {
  let salonName = FALLBACK.salonName;
  let tagline = FALLBACK.tagline;

  try {
    const settings = await getSettings();
    salonName = settings.salonName || salonName;
    tagline = settings.tagline || tagline;
  } catch {
    // Banco indisponível: a imagem sai com a marca padrão em vez de quebrar a página.
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(135deg, #faf7f1 0%, #f2e6d6 55%, #e9d3c1 100%)",
          color: "#2b1e18",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 18,
              background: "#8c4a35",
              color: "#faf7f1",
              fontSize: 32,
              fontWeight: 600,
            }}
          >
            A
          </div>
          <div
            style={{
              fontSize: 22,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#8c4a35",
            }}
          >
            {salonName}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 700, lineHeight: 1.05 }}>
            Reserve seu horário
          </div>
          <div style={{ display: "flex", fontSize: 34, color: "#6c5548", lineHeight: 1.3 }}>
            {tagline} Escolha os serviços, veja os horários livres e confirme
            online.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 24,
            color: "#8c4a35",
          }}
        >
          <div style={{ display: "flex", gap: 28 }}>
            <div style={{ display: "flex" }}>Manicure</div>
            <div style={{ display: "flex" }}>Pedicure</div>
            <div style={{ display: "flex" }}>Unhas em gel</div>
          </div>
          <div style={{ display: "flex" }}>Agenda online</div>
        </div>
      </div>
    ),
    size,
  );
}
