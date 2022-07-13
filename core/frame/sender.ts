import { delay, logger, toTransformStream, } from "../../deps.ts";
import { VoiceConnection, createFunctionalInterval, createPacketProvider, formatMilliseconds } from "../mod.ts";

const silentFrame = new Uint8Array([ 0xFC, 0xFF, 0xFE ]);

export function createRtpTransform(connection: VoiceConnection): TransformStream<Uint8Array, Uint8Array> {
    const log = logger.getLogger("frame/sender");
    
    return toTransformStream(async function* transform(src) {    
        let next = performance.now(), speaking = false, silence = 5, position = 0;
        function setSpeaking(state: boolean) {
            log.info(`setting speaking state: ${state}`);
            if (state) {
                silence = 5;
            }

            speaking = state;
            return connection.updateSpeaking(state);
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

        for await (let frame of src) {
            const start = performance.now();

            /* handle speaking state. */
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
                yield rtp;
            }

            /* queue the next frame timestamp. */
            next += 20;
            await delay(Math.max(0, next - (performance.now() - xd)))
        }

        await setSpeaking(false);
        checkup.stop();
        log.info("stopping...");
    })
}
