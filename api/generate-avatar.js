import { put } from "@vercel/blob";
import { IncomingForm } from "formidable";
import fs from "fs";

export const config = {
    api: {
        bodyParser: false, // Desactivado para permitir la subida de archivos pesados (foto y audio)
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // Parseamos el formulario multiparte que viene del frontend
        const data = await new Promise((resolve, reject) => {
            const form = new IncomingForm({ multiples: false });
            form.parse(req, (err, fields, files) => {
                if (err) reject(err);
                resolve({ fields, files });
            });
        });

        const frontPhotoFile = data.files.frontPhoto?.[0];
        const audioSampleFile = data.files.audioSample?.[0];

        if (!frontPhotoFile || !audioSampleFile) {
            return res.status(400).json({ error: "Faltan archivos requeridos (foto o audio)." });
        }

        // Subimos la foto frontal a Vercel Storage
        const frontBuffer = fs.readFileSync(frontPhotoFile.filepath);
        const frontBlob = await put(`captures/front-${Date.now()}.jpg`, frontBuffer, { 
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN
        });

        // Subimos la muestra de voz a Vercel Storage
        const audioBuffer = fs.readFileSync(audioSampleFile.filepath);
        const audioExtension = audioSampleFile.originalFilename?.includes('mp4') ? 'mp4' : 'webm';
        const audioBlob = await put(`captures/audio-${Date.now()}.${audioExtension}`, audioBuffer, { 
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

        // Éxito instantáneo para el frontend, liberando el hilo de ejecución
        return res.status(200).json({ success: true, message: "Avatar en cola de renderizado automático" });

    } catch (error) {
        console.error("Error crítico en generate-avatar:", error);
        return res.status(500).json({ error: error.message });
    }
}
