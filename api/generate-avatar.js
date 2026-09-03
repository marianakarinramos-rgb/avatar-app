import { put } from "@vercel/blob";

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const formData = await req.formData();
        const frontPhotoFile = formData.get('frontPhoto');
        const audioSampleFile = formData.get('audioSample');

        if (!frontPhotoFile || !audioSampleFile) {
            return res.status(400).json({ error: "Faltan archivos requeridos en el formulario." });
        }

        const frontBuffer = Buffer.from(await frontPhotoFile.arrayBuffer());
        const frontBlob = await put(`captures/front-${Date.now()}.jpg`, frontBuffer, { 
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN
        });

        const audioBuffer = Buffer.from(await audioSampleFile.arrayBuffer());
        const ext = audioSampleFile.name?.includes('mp4') ? 'mp4' : 'webm';
        const audioBlob = await put(`captures/audio-${Date.now()}.${ext}`, audioBuffer, { 
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN
        });

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
