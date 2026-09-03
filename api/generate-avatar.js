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
        if (!process.env.BLOB_READ_WRITE_TOKEN || !process.env.ELEVENLABS_API_KEY || !process.env.FAL_KEY) {
            throw new Error("Faltan configurar variables de entorno en Vercel.");
        }

        const form = new multiparty.Form();
        const { fields, files } = await new Promise((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) reject(err);
                resolve({ fields, files });
            });
        });

        if (!files || !files.frontPhoto) {
            throw new Error("No llegó la foto frontal al servidor.");
        }

        const frontPhotoFile = files.frontPhoto[0];
        const textToSpeak = fields.textToSpeak ? fields.textToSpeak[0] : "Hola, este es mi avatar inteligente.";
        
        console.log("1. Subiendo foto a Vercel Blob...");
        const blobPhoto = await put(`avatars/front-${Date.now()}.jpg`, fs.readFileSync(frontPhotoFile.path), {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN
        });

        console.log("2. Generando audio con ElevenLabs...");
        // Usamos una voz estándar de ElevenLabs (Rachel) para garantizar estabilidad en el MVP
        const voiceId = "21m00Tcm4TlvDq8ikWAM"; 
        const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'xi-api-key': process.env.ELEVENLABS_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: textToSpeak,
                model_id: "eleven_multilingual_v2",
                voice_settings: { stability: 0.5, similarity_boost: 0.75 }
            })
        });
        
        if (!ttsResponse.ok) {
            const ttsError = await ttsResponse.text();
            throw new Error("Error en ElevenLabs TTS: " + ttsError);
        }

        const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
        
        console.log("3. Subiendo audio a Vercel Blob...");
        const blobAudio = await put(`avatars/speech-${Date.now()}.mp3`, audioBuffer, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN
        });

        console.log("4. Llamando a Fal.ai para animación...");
        const animationResponse = await fetch('https://fal.run/fal-ai/sync-lips', {
            method: 'POST',
            headers: {
                'Authorization': `Key ${process.env.FAL_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image_url: blobPhoto.url,
                audio_url: blobAudio.url
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
