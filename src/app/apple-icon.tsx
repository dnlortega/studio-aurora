import { ImageResponse } from "next/og";

/**
 * Ícone do iOS gerado em código (não é o padrão do Create Next App). Sem banco:
 * as cores são as do tema em `src/app/globals.css`, então a build nunca depende
 * do Neon para existir.
 */
export const alt = "Studio Aurora — agendamento de unhas";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f7efe4",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 132,
            height: 132,
            borderRadius: 40,
            background: "#8c4a35",
            color: "#f7efe4",
            fontSize: 84,
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          A
        </div>
      </div>
    ),
    size,
  );
}
