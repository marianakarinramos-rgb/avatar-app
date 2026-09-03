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
        // 1. Aquí recibes los archivos del formulario frontend (esto ya lo tenías funcionando)
        // ... tu código actual que procesa frontPhoto y audioSample ...

        // (Ejemplo de cómo guardas en Vercel Blob):
        // const frontBlob = await put(`captures/front-${Date.now()}.jpg`, frontPhotoFile, { access: 'public' });
        // const audioBlob = await put(`captures/audio-${Date.now()}.webm`, audioSampleFile, { access: 'public' });

        // 2. Disparador automático a Fal.ai (¡Adentro de la función, bien colocado!)
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

        // 3. Respuesta limpia al frontend
        return res.status(200).json({ success: true, message: "Avatar en cola de renderizado" });

    } catch (error) {
        console.error("Error en el backend:", error);
        return res.status(500).json({ error: error.message });
    }
}
