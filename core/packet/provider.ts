import { ByteWriter, EncryptionStrategy } from "../mod.ts";
import { createRtpHeader, RtpHeader, writeRtpHeader } from "./rtp.ts";

export function createPacketProvider(
    ssrc: number,
    encryptionStrategy: EncryptionStrategy,
): PacketProvider {
    const cursor = ByteWriter.withSize(2048);

    let sequence = 0, timestamp = 0;
    function getRtpHeader(): RtpHeader {
        const ts = timestamp;
        timestamp += 960;

        return createRtpHeader(
            sequence = encryptionStrategy.nextSequence(sequence),
            ts,
            ssrc,
        );
    }

    return {
        provide: async (frame) => {
            cursor.reset();
            cursor.data.fill(0);

            /* write the rtp header to the byte cursor */
            const header = getRtpHeader();
            writeRtpHeader(cursor, header);

            /* encrypt the packet. */
            await encryptionStrategy.encrypt(cursor, header, frame);
            return cursor.slice();
        },
    };
}

export interface PacketProvider {
    provide(data: Uint8Array): Promise<Uint8Array>;
}
