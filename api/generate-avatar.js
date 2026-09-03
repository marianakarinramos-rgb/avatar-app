export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // Recibimos directamente las URLs que el frontend ya subió a Vercel Blob
        const { frontUrl, audioUrl } = req.body;

        if (!frontUrl || !audioUrl) {
            return res.status(400).json({ error: "Faltan las URLs de los archivos." });
        }

        // Disparador automático a Fal.ai con webhook asíncrono
        const falResponse = await fetch("https://queue.fal.run/fal-ai/sadtalker", {
            method: "POST",
            headers: {
                "Authorization": `Key ${process.env.FAL_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                source_image_url: frontUrl,
                driven_audio_url: audioUrl,
                still: true,
                enhancer: "gfpgan",
                webhookUrl: "https://avatar-app-beta-snowy.vercel.app/api/webhook"
            })
        });

        if (!falResponse.ok) {
            const errorText = await falResponse.text();
            throw new Error(`Error en Fal.ai: ${errorText}`);
        }

        return res.status(200).json({ success: true, message: "Avatar en cola de renderizado automático" });

    } catch (error) {
        console.error("Error crítico en generate-avatar:", error);
        return res.status(500).json({ error: error.message });
    }
}
