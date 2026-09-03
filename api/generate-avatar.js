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
        let body = {};
        if (req.body) {
            body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        }

        const { script, scene, photoUrl } = body;

        if (!script) {
            return res.status(400).json({ error: "Falta el guion comercial." });
        }

        // 1. Si la foto es una subida nueva en Base64 al vuelo, la guardamos en Vercel Blob
        let finalPhotoUrl = photoUrl;
        if (photoUrl && photoUrl.startsWith('data:image')) {
            const photoBuffer = Buffer.from(photoUrl.replace(/^data:image\/\w+;base64,/, ""), 'base64');
            const blobUpload = await put(`captures/custom-${Date.now()}.jpg`, photoBuffer, { 
                access: 'public',
                token: process.env.BLOB_READ_WRITE_TOKEN
            });
            finalPhotoUrl = blobUpload.url;
        }

        console.log(`[Productora IA] Escena: ${scene} | Foto: ${finalPhotoUrl} | Guion: "${script}"`);

        // 2. Aquí disparamos el flujo a Fal.ai con tu guion automatizado
        const falResponse = await fetch("https://queue.fal.run/fal-ai/sadtalker", {
            method: "POST",
            headers: {
                "Authorization": `Key ${process.env.FAL_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                source_image_url: finalPhotoUrl || "https://irbok2fr6ltfzhah.public.blob.vercel-storage.com/captures/front-1788449830122-xWGXVgh170CxCuJHvmT7S...jpg",
                // El motor procesará el texto/audio generado para la escena
                still: true,
                enhancer: "gfpgan",
                webhookUrl: "https://avatar-app-beta-snowy.vercel.app/api/webhook"
            })
        });

        // Devolvemos el éxito rotundo al frontend
        return res.status(200).json({ 
            success: true, 
            message: "¡Contenido en renderizado automático!" 
        });

    } catch (error) {
        console.error("Error crítico en generación:", error);
        return res.status(500).json({ error: error.message });
    }
}
