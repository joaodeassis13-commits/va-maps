// Vercel serverless function — runs on the server, not in the browser.
// The Copernicus identity server blocks direct browser requests for a
// token (CORS), but has no problem with a server-to-server request like
// this one. This is the only piece that needs to run server-side; once
// the browser has the token, it fetches the actual map tiles directly
// from Sentinel Hub (that endpoint does allow browser requests).
module.exports = async (req, res) => {
  const clientId = process.env.SENTINEL_CLIENT_ID;
  const clientSecret = process.env.SENTINEL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    res.status(500).json({ error: 'SENTINEL_CLIENT_ID/SENTINEL_CLIENT_SECRET não configurados nas variáveis de ambiente do projeto na Vercel.' });
    return;
  }

  try {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    });
    const resp = await fetch('https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });
    const data = await resp.json();
    if (!resp.ok) {
      res.status(resp.status).json(data);
      return;
    }
    res.status(200).json({ access_token: data.access_token, expires_in: data.expires_in });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
