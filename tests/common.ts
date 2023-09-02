import {
    createOpusTransform,
    createRtpTransform,
    PCMStream,
} from "../core/mod.ts";
import {
    createWritableRtpStream,
    VoiceConnection,
} from "../core/services/mod.ts";
import { ytdl } from "../deps.ts";

export async function startFfmpegTest(connection: VoiceConnection) {
    const input = Deno.args[0];
    if (!input) {
        throw new Error("No FFmpeg input specified");
    }

    let parentStream: ReadableStream<Uint8Array>;
    if (input.includes("youtube.com")) {
        const stream = await ytdl(input, {
            filter: "audioonly",
            quality: "highestaudio",
        });
        parentStream = stream.pipeThrough(new PCMStream("-"));
    } else {
        parentStream = new PCMStream(input);
    }

    return parentStream
        .pipeThrough(createOpusTransform())
        .pipeThrough(createRtpTransform(connection))
        .pipeTo(createWritableRtpStream(connection));
}
