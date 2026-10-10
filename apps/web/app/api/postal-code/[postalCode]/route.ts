import { parsePostalCodeAddress } from "@/lib/postal-code";
import { getSessionToken } from "@/server/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ postalCode: string }> },
) {
  if (!(await getSessionToken())) {
    return Response.json(
      { message: "Entre novamente para continuar." },
      { status: 401 },
    );
  }
  const { postalCode } = await params;
  if (!/^\d{8}$/.test(postalCode)) {
    return Response.json(
      { message: "Informe um CEP com 8 dígitos." },
      { status: 400 },
    );
  }
  try {
    const response = await fetch(
      `https://viacep.com.br/ws/${postalCode}/json/`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      },
    );
    if (!response.ok) throw new Error("CEP lookup failed");
    const address = parsePostalCodeAddress(await response.json());
    if (!address) {
      return Response.json({ message: "CEP não encontrado." }, { status: 404 });
    }
    return Response.json(address);
  } catch {
    return Response.json(
      {
        message:
          "Não foi possível consultar o CEP. Preencha o endereço manualmente.",
      },
      { status: 502 },
    );
  }
}
