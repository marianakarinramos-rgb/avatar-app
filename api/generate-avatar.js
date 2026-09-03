// Disparador automático a Fal.ai usando el sistema de colas (evita el timeout de 10s)
const falResponse = await fetch("https://queue.fal.run/fal-ai/sadtalker", {
    method: "POST",
    headers: {
        "Authorization": `Key ${process.env.FAL_KEY}`,
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        source_image_url: frontBlob.url, // Asegurate que esta variable sea la URL final de tu foto en Vercel
        driven_audio_url: audioBlob.url, // Asegurate que esta variable sea la URL final de tu audio en Vercel
        still: true,
        enhancer: "gfpgan",
        // Esta es la ruta secreta a la que Fal.ai llamará cuando termine
        webhookUrl: "https://avatar-app-beta-snowy.vercel.app/api/webhook" 
    })
});

// Le respondemos al frontend al instante, mientras Fal.ai trabaja de fondo
return res.status(200).json({ success: true, message: "Avatar en cola de renderizado" });
