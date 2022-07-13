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
        // readable: createReadableRtpStream(connection)
    }
}

export function createWritableRtpStream(connection: VoiceConnection): WritableStream<Uint8Array> {
    return new WritableStream<Uint8Array>({
        write: async packet => void await connection.transport.send(packet)
    });
}


export interface RtpStream {
    writable: WritableStream<Uint8Array>;
    // readable: ReadableStream<RtpPacket>;
}
