import { put } from "@vercel/blob";

export default async function handler(req, res) {
    // Solo aceptamos llamadas POST (que es como Fal.ai envía los datos)
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const data = req.body;

        // Verificamos que Fal.ai haya terminado bien y nos traiga la URL del video
        if (data.status === "OK" && data.payload && data.payload.video_url) {
            const videoUrl = data.payload.video_url;
            
            // Creamos un archivo de texto en tu Storage con el link del MP4 listo
            const fileName = `final-avatars/avatar-listo-${Date.now()}.txt`;
            await put(fileName, `¡Acá está tu video terminado!\n\nLink directo: ${videoUrl}`, { 
                access: 'public',
                token: process.env.BLOB_READ_WRITE_TOKEN
            });

            console.log("Avatar recibido y guardado con éxito.");
        }

        // Le respondemos rápido a Fal.ai con un 200 OK para que sepa que recibimos el paquete
        return res.status(200).json({ received: true });

    } catch (error) {
        console.error("Error procesando el webhook:", error);
        return res.status(500).json({ error: "Fallo en el servidor del webhook" });
    }
}
