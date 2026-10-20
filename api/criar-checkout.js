const crypto = require("crypto");

const MIN = 500;
const MAX = 1000000;

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido" });

  const handle = process.env.INFINITEPAY_HANDLE;
  const site = process.env.SITE_URL;
  if (!handle || !site) return res.status(500).json({ erro: "Servidor sem configuração" });

  const centavos = req.body && req.body.centavos;
  if (!Number.isInteger(centavos) || centavos < MIN || centavos > MAX) {
    return res.status(400).json({ erro: "Valor inválido" });
  }

  const orderNsu = crypto.randomUUID();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);

  try {
    const r = await fetch("https://api.checkout.infinitepay.io/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        handle,
        order_nsu: orderNsu,
        redirect_url: site + "/?retorno=1",
        items: [{ quantity: 1, price: centavos, description: "Contribuição" }],
      }),
    });
    const data = await r.json().catch(() => ({}));
    console.log("InfinitePay", r.status, JSON.stringify(data));
    if (!r.ok || !data.url) return res.status(502).json({ erro: "Falha ao criar o checkout" });
    return res.status(200).json({ url: data.url, pedido: orderNsu });
  } catch (e) {
    return res.status(504).json({ erro: "Tempo esgotado ou erro de rede" });
  } finally {
    clearTimeout(timer);
  }
};
