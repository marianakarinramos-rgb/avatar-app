import { put } from '@vercel/blob';
import multiparty from 'multiparty';
import fetch from 'node-fetch';
import fs from 'fs';

export const config = {
    api: { bodyParser: false },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    try {
        if (!process.env.BLOB_READ_WRITE_TOKEN || !process.env.FAL_KEY) {
            throw new Error("Faltan configurar variables de entorno en Vercel.");
        }

        const form = new multiparty.Form();
        const { fields, files } = await new Promise((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) reject(err);
                resolve({ fields, files });
            });
        });

        if (!files || !files.frontPhoto || !files.audioSample) {
            throw new Error("No llegó la foto frontal o el audio original al servidor.");
        }

        const frontPhotoFile = files.frontPhoto[0];
        const audioFile = files.audioSample[0];
        
        console.log("1. Subiendo foto a Vercel Blob...");
        const blobPhoto = await put(`avatars/front-${Date.now()}.jpg`, fs.readFileSync(frontPhotoFile.path), {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN
        });

        console.log("2. Subiendo audio original a Vercel Blob...");
        const blobAudio = await put(`avatars/speech-${Date.now()}.webm`, fs.readFileSync(audioFile.path), {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN
        });

        console.log("3. Llamando a Fal.ai (SadTalker) para animación labial...");
        const animationResponse = await fetch('https://fal.run/fal-ai/sadtalker', {
            method: 'POST',
            headers: {
                'Authorization': `Key ${process.env.FAL_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                source_image_url: blobPhoto.url,
                driven_audio_url: blobAudio.url
            })
        });

        const animationData = await animationResponse.json();
        if (!animationResponse.ok || !animationData.video || !animationData.video.url) {
            throw new Error("Error en Fal.ai: " + JSON.stringify(animationData));
        }

        console.log("¡Avatar generado con éxito!");
        return res.status(200).json({ 
            success: true, 
            video_url: animationData.video.url 
        });

    } catch (error) {
        console.error("CRASH EN BACKEND:", error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
}
