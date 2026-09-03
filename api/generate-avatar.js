import { put } from "@vercel/blob";

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
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch (e) { body = {}; }
        }

        const { frontBase64, audioBase64, audioExtension } = body;

        if (!frontBase64 || !audioBase64) {
            return res.status(400).json({ error: "Faltan los datos de los archivos en la petición." });
        }

        // Subimos la foto a Vercel Blob
        const frontBuffer = Buffer.from(frontBase64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        const frontBlob = await put(`captures/front-${Date.now()}.jpg`, frontBuffer, { 
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN
        });

        // Subimos el audio a Vercel Blob
        const base64Data = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
        const audioBuffer = Buffer.from(base64Data, 'base64');
        const ext = audioExtension || 'webm';
        const audioBlob = await put(`captures/audio-${Date.now()}.${ext}`, audioBuffer, { 
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN
        });

        // Disparador automático a Fal.ai con webhook asíncrono
        const falResponse = await fetch("https://queue.fal.run/fal-ai/sadtalker", {
            method: "POST",
            headers: {
                "Authorization": `Key ${process.env.FAL_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                source_image_url: frontBlob.url,
                driven_audio_url: audioBlob.url,
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
