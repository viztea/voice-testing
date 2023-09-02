import { decoder } from "../../deps.ts";
import { VoiceTransport } from "../services/mod.ts";
import { ByteWriter, readUInt16BE } from "../tools/mod.ts";

const decode = decoder();
export async function holepunch(
    ssrc: number,
    transport: VoiceTransport,
): Promise<Address> {
    const holepunch_packet = ByteWriter.withSize(74)
        .writeUInt16(0x1)
        .writeUInt16(70)
        .writeUInt32(ssrc)
        .data;

    await transport.send(holepunch_packet);

    const [resp] = await transport.receive();
    return {
        ip: decode(resp.slice(8, resp.indexOf(0, 8))),
        port: readUInt16BE(resp, resp.length - 2),
    };
}

export interface Address {
    ip: string;
    port: number;
}
