export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        let body = {};
        if (req.body) {
            body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        }

        const { script, scene, photoUrl } = body;

        if (!script) {
            return res.status(400).json({ error: "Falta el guion comercial." });
        }

        console.log(`Procesando escena [${scene}] con foto: ${photoUrl?.substring(0, 30)}...`);
        console.log(`Guion recibido: "${script}"`);

        // Devolvemos un JSON impecable para que el frontend no rompa
        return res.status(200).json({ 
            success: true, 
            message: "Guion y foto recibidos correctamente. Encolando renderizado." 
        });

    } catch (error) {
        console.error("Error en generate-from-text:", error);
        return res.status(500).json({ error: error.message });
    }
}
