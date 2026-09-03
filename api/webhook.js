import { put } from "@vercel/blob";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const data = req.body;
        console.log("Webhook recibido de Fal.ai:", JSON.stringify(data));

        // Verificamos si el video ya está listo
        const videoUrl = data?.payload?.video?.url || data?.video?.url;

        if (videoUrl) {
            // Descargamos el video generado por la IA
            const videoRes = await fetch(videoUrl);
            const videoBuffer = await videoRes.arrayBuffer();

            // Lo guardamos de manera definitiva en tu Vercel Blob en una carpeta propia
            const savedBlob = await put(`final-avatars/video-${Date.now()}.mp4`, Buffer.from(videoBuffer), {
                access: 'public',
                token: process.env.BLOB_READ_WRITE_TOKEN
            });

            console.log("¡Video guardado con éxito en Vercel Blob!", savedBlob.url);
        }

        return res.status(200).json({ received: true });
    } catch (error) {
        console.error("Error en el webhook:", error);
        return res.status(500).json({ error: error.message });
    }
}
