import { put } from '@vercel/blob';
import multiparty from 'multiparty';
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

// Evita que Vercel rompa el FormData entrante
export const config = {
    api: { bodyParser: false },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    try {
        const form = new multiparty.Form();
        
        const data = await new Promise((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) reject(err);
                resolve({ fields, files });
            });
        });

        const audioFile = data.files.audioSample[0];
        const frontPhotoFile = data.files.frontPhoto[0];
        const textToSpeak = data.fields.textToSpeak[0];
        
        // 1. Subir la foto frontal a Vercel Blob para que las APIs externas puedan leerla
        const blobPhoto = await put(`avatars/front-${Date.now()}.jpg`, fs.readFileSync(frontPhotoFile.path), {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN
        });

        // 2. ElevenLabs: Clonar la voz (Instant Voice Cloning)
        const elevenLabsForm = new FormData();
        elevenLabsForm.append('name', `Clone_${Date.now()}`);
        elevenLabsForm.append('files', fs.createReadStream(audioFile.path));
        
        const cloneResponse = await fetch('https://api.elevenlabs.io/v1/voices/add', {
            method: 'POST',
            headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
            body: elevenLabsForm
        });
        
        const cloneData = await cloneResponse.json();
        if (!cloneData.voice_id) throw new Error("Fallo en ElevenLabs: No se clonó la voz.");
        const voiceId = cloneData.voice_id;

        // 3. ElevenLabs: Generar el audio con el texto deseado usando la voz clonada
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
        
        const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
        
        // 4. Subir el audio final a Vercel Blob
        const blobAudio = await put(`avatars/speech-${Date.now()}.mp3`, audioBuffer, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN
        });

        // 5. Fal.ai (Sync Lips / Animación facial)
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
        if (!animationData.video || !animationData.video.url) throw new Error("Fallo en la generación de video en Fal.ai");

        // 6. Enviar video final al Frontend
        return res.status(200).json({ 
            success: true, 
            video_url: animationData.video.url 
        });

    } catch (error) {
        console.error("Error en orquestación:", error);
        return res.status(500).json({ error: error.message || 'Falló la creación del avatar' });
    }
}import { put } from '@vercel/blob';
import multiparty from 'multiparty';
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

// Evita que Vercel rompa el FormData entrante
export const config = {
    api: { bodyParser: false },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    try {
        const form = new multiparty.Form();
        
        const data = await new Promise((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) reject(err);
                resolve({ fields, files });
            });
        });

        const audioFile = data.files.audioSample[0];
        const frontPhotoFile = data.files.frontPhoto[0];
        const textToSpeak = data.fields.textToSpeak[0];
        
        // 1. Subir la foto frontal a Vercel Blob para que las APIs externas puedan leerla
        const blobPhoto = await put(`avatars/front-${Date.now()}.jpg`, fs.readFileSync(frontPhotoFile.path), {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN
        });

        // 2. ElevenLabs: Clonar la voz (Instant Voice Cloning)
        const elevenLabsForm = new FormData();
        elevenLabsForm.append('name', `Clone_${Date.now()}`);
        elevenLabsForm.append('files', fs.createReadStream(audioFile.path));
        
        const cloneResponse = await fetch('https://api.elevenlabs.io/v1/voices/add', {
            method: 'POST',
            headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
            body: elevenLabsForm
        });
        
        const cloneData = await cloneResponse.json();
        if (!cloneData.voice_id) throw new Error("Fallo en ElevenLabs: No se clonó la voz.");
        const voiceId = cloneData.voice_id;

        // 3. ElevenLabs: Generar el audio con el texto deseado usando la voz clonada
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
        
        const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
        
        // 4. Subir el audio final a Vercel Blob
        const blobAudio = await put(`avatars/speech-${Date.now()}.mp3`, audioBuffer, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN
        });

        // 5. Fal.ai (Sync Lips / Animación facial)
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
        if (!animationData.video || !animationData.video.url) throw new Error("Fallo en la generación de video en Fal.ai");

        // 6. Enviar video final al Frontend
        return res.status(200).json({ 
            success: true, 
            video_url: animationData.video.url 
        });

    } catch (error) {
        console.error("Error en orquestación:", error);
        return res.status(500).json({ error: error.message || 'Falló la creación del avatar' });
    }
}