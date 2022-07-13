import { logger } from "../../deps.ts";
import { VoiceConnection, createFunctionalInterval, createPacketProvider, formatMilliseconds } from "../mod.ts";
import { getOpusReader } from "./opus.ts";

const silentFrame = new Uint8Array([ 0xFC, 0xFF, 0xFE ]);

export function createWritableVoiceStream(
    connection: VoiceConnection,
): VoiceStream {
    const log = logger.getLogger("frame/sender");

    let running = false, position = 0, readableCtx: ReadableStreamDefaultController<Uint8Array>;

    /* create stream used for queueing pcm audio. */
    const pcmStream = new ReadableStream({
        start: ctx => {
            readableCtx = ctx
        }
    });

    return {
        writable: new WritableStream({
            start: () => {
                running = true;
    
                /* get opus reader */
                const opus = getOpusReader(pcmStream);
    
                /* xd */
                let next = performance.now(), speaking = false, silence = 5;
                async function setSpeaking(state: boolean) {
                    log.info(`setting speaking state: ${state}`);
                    if (state) {
                        silence = 5;
                    }
    
                    speaking = state;
                    await connection.updateSpeaking(state);
                }
    
                const provider = createPacketProvider(connection.ssrc, connection.encryptionStrategy)
                    , xd = performance.now()
                    , checkup = createFunctionalInterval();
    
                let frame_times: number[] = [];
                checkup.start(1000, () => {
                    const avg_frame_time = frame_times.reduce((a, c) => a + c, 0) / frame_times.length;
                    log.info("checkup, avg frame time:", (avg_frame_time).toFixed(2), "ms", "progress:", formatMilliseconds(position));
                    frame_times = [];
                });

                async function stop() {
                    await setSpeaking(false);
                    checkup.stop();
                    log.info("stopping...");
                }
    
                const run = async () => {
                    if (!running) {
                        return stop();
                    }

                    const start = performance.now();
    
                    /* poll a frame and handle speaking state. */
                    let { done, value: frame } = await opus.read();
                    if (done) {
                        running = false;
                        return stop();
                    }

                    if (frame != null && !speaking) {
                        await setSpeaking(true);
                    } else if ((frame == null) && speaking && silence == 0) {
                        await setSpeaking(false);
                    }

                    /* if there are more silent frames to be sent make sure the frame is not null. */
                    if (frame == null && silence > 0) {
                        frame = silentFrame;
                        silence--
                    }
    
                    if (frame != null) {
                        position += 20;
    
                        /* create and encrypt an rtp packet with the polled frame. */
                        const rtp = await provider.provide(frame);
                        frame_times.push(performance.now() - start);
                        await connection.transport.send(rtp);
                    }
    
                    /* queue the next frame timestamp. */
                    next += 20;
                    setTimeout(run, Math.max(0, next - (performance.now() - xd)))
                }
    
                run().catch(() => running = false);
            },
            write: chunk => void readableCtx.enqueue(chunk),
            close: () => void readableCtx.close()
        }),
        position,
        running
    }
}

export interface VoiceStream {
    writable: WritableStream<Uint8Array>;
    position: number;
    running: boolean;
}
