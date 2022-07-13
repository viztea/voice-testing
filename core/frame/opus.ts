import { Encoder, readableStreamFromIterable } from "../../deps.ts";

export function getOpusReader(pcm: ReadableStream<Uint8Array>): ReadableStreamDefaultReader<Uint8Array> {
    return getOpusStream(pcm).getReader();
}

export function getOpusStream(pcm: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
    /* create opus encoder */
    const encoder = new Encoder({
        channels: 2,
        application: "audio",
        max_opus_size: undefined,
        sample_rate: 48000,
    });
    
    encoder.complexity = 10;
    encoder.signal = "music";

    /* create opus stream from the encoder */
    return readableStreamFromIterable(encoder.encode_pcm_stream(960, pcm));
}
