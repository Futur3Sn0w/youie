export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ error: 'Missing URL' });
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch RSS');

        const text = await response.text();
        res.setHeader('Content-Type', 'application/xml');
        res.status(200).send(text);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}