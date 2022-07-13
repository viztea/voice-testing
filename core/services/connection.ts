import { createPacketProvider, RtpPacket } from "../packet/mod.ts";
import { EncryptionStrategy } from "../crypto/mod.ts";

export interface VoiceConnection {
    transport: VoiceTransport;
    ssrc: number;
    encryptionStrategy: EncryptionStrategy;

    updateSpeaking(value: boolean): void;
}

export interface VoiceTransport {
    ip: string;
    port: number;

    send(datagram: Uint8Array): Promise<number>;
    receive(): Promise<[ Uint8Array, Deno.Addr ]>;
}

export function createVoiceTransport(ip: string, port: number): VoiceTransport {
    /* create udp socket. */
    const udp = Deno.listenDatagram({ transport: "udp", hostname: "0.0.0.0", port: 0 });

    /* create transport object. */
    return {
        ip, port,
        send: datagram => udp.send(datagram, { transport: "udp", hostname: ip, port }),
        receive: () => udp.receive()
    }
}

export function createRtpStream(connection: VoiceConnection): RtpStream {
    return {
        writable: createWritableRtpStream(connection),
        readable: createReadableRtpStream(connection)
    }
}

export function createReadableRtpStream(_: VoiceConnection): ReadableStream<RtpPacket> {
    return new ReadableStream<RtpPacket>({
        pull: async () => {
        }
    })
}

export function createWritableRtpStream(connection: VoiceConnection): WritableStream<Uint8Array> {
    const provider = createPacketProvider(connection.ssrc, connection.encryptionStrategy)
    return new WritableStream({
        write: async chunk => {
            const packet = await provider.provide(chunk);
            await connection.transport.send(packet);
        }
    });
}

export interface RtpStream {
    writable: WritableStream<Uint8Array>;
    readable: ReadableStream<RtpPacket>;
}
