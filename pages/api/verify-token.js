export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  
  const { token } = req.body;
  const validTokens = process.env.ACCESS_TOKENS?.split(",").map(t => t.trim()) || [];
  
  if (validTokens.includes(token)) {
    res.status(200).json({ valid: true });
  } else {
    res.status(401).json({ valid: false });
  }
}
