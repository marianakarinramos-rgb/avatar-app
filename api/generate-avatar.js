import { put } from '@vercel/blob';
import multiparty from 'multiparty';
import fs from 'fs';

export const config = {
    api: { bodyParser: false },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    try {
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
            throw new Error("Falta el token de Vercel Blob.");
        }

        const form = new multiparty.Form();
        const { fields, files } = await new Promise((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) reject(err);
                resolve({ fields, files });
            });
        });

        if (!files || !files.frontPhoto || !files.audioSample) {
            throw new Error("Faltan archivos en la solicitud.");
        }

        const frontPhotoFile = files.frontPhoto[0];
        const audioFile = files.audioSample[0];
        
        console.log("1. Subiendo assets a Vercel Blob (Almacenamiento temporal)...");
        const blobPhoto = await put(`captures/front-${Date.now()}.jpg`, fs.readFileSync(frontPhotoFile.path), {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN
        });

        const blobAudio = await put(`captures/audio-${Date.now()}.webm`, fs.readFileSync(audioFile.path), {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN
        });

        console.log("2. Registro guardado exitosamente. Assets listos para procesamiento asíncrono.");
        
        return res.status(200).json({ 
            success: true, 
            message: "Captura exitosa. En cola de renderizado."
        });

    } catch (error) {
        console.error("CRASH EN BACKEND:", error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
}
