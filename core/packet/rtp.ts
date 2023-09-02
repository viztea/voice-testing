import { ByteReader, ByteWriter, uint16, uint32 } from "../tools/mod.ts";

const RTP_HEADER_SIZE = 12;

export function writeRtpHeader(writer: ByteWriter, header: RtpHeader) {
    if (writer.data.length < RTP_HEADER_SIZE) {
        throw new Error(
            `Writer buffer is too short, must be (atleast) ${RTP_HEADER_SIZE} bytes`,
        );
    }

    // 00
    const padding = header.hasPadding ? 0x20 : 0x00;
    const extension = header.hasExtension ? 0x10 : 0x00;
    writer.write(
        (header.version << 6) | padding | extension | (header.csrcCount & 0x0F),
    );

    // 01
    const marker = header.marker ? 0x80 : 0x00;
    writer.write(header.payloadType | marker);

    // 02 03
    writer.writeUInt16(header.sequence);

    // 04 05 06 07
    writer.writeUInt32(header.timestamp);

    // 08 09 10 11
    writer.writeUInt32(header.ssrc);

    /* write constributing-source identifiers. */
    if (header.csrcCount != 0) {
        const size = RTP_HEADER_SIZE + header.csrcCount * 2;
        if (writer.data.length < size) {
            throw new Error(
                `Writer buffer is too short, must be (at least) ${size} bytes long.`,
            );
        }

        for (const identifier of header.csrcIdentifiers) {
            writer.writeUInt32(identifier);
        }
    }
}

export function readRtpHeader(reader: ByteReader): RtpHeader {
    if (reader.data.length < RTP_HEADER_SIZE) {
        throw new Error(
            `Reader contains too few bytes, must contain (atleast) ${RTP_HEADER_SIZE} bytes`,
        );
    }

    const fb = reader.read(),
        sb = reader.read();

    / read the header bytes./;
    const header: RtpHeader = {
        sequence: reader.readUInt16BE(),
        timestamp: reader.readUInt32BE(),
        ssrc: reader.readUInt32BE(),

        version: (fb & 0xC0) >> 6,
        hasPadding: (fb & 0x20) === 0x20,
        hasExtension: (fb & 0x10) === 0x10,
        csrcCount: fb & 0x0F,
        marker: (sb & 0x80) === 0x80,
        payloadType: sb & 0x7F,
        csrcIdentifiers: [],
    };

    for (let i = 0; i < header.csrcCount; i++) {
        const csrcIdentifier = reader.readUInt32BE();
        header.csrcIdentifiers.push(csrcIdentifier);
    }

    return header;
}

export function createRtpHeader(
    sequence: number,
    timestamp: number,
    ssrc: number,
): RtpHeader {
    return {
        version: 2,
        hasExtension: false,
        hasPadding: false,
        csrcCount: 0,
        marker: false,
        payloadType: 0x78,
        sequence,
        timestamp,
        ssrc,
        csrcIdentifiers: [],
    };
}

export interface RtpHeader {
    sequence: uint16;
    timestamp: uint32;
    ssrc: uint32;

    version: number;
    hasPadding: boolean;
    hasExtension: boolean;
    csrcCount: number;
    csrcIdentifiers: number[];
    marker: boolean;
    payloadType: number;
}

export function writeRtpPacket(writer: ByteWriter, packet: RtpPacket) {
    /* write the rtp header */
    writeRtpHeader(writer, packet.header);

    /* write the rtp body */
    writer.writeBytes(packet.body);
    if (packet.paddingBytes != 0) {
        const padding = new Uint8Array(packet.paddingBytes - 1);
        writer.writeBytes(padding);
        writer.write(packet.paddingBytes);
    }
}

export function readRtpPacket(reader: ByteReader): RtpPacket {
    const header = readRtpHeader(reader),
        payload = reader.readBytes(),
        paddingBytes = header.hasPadding ? payload[payload.length - 1] : 0;

    const body = header.hasPadding
        ? payload.slice(0, payload.length - paddingBytes)
        : payload;

    return { header, body, paddingBytes };
}

export function calculateRtpPacketSize(packet: RtpPacket): number {
    return RTP_HEADER_SIZE + packet.body.length + packet.paddingBytes +
        (packet.header.csrcCount * 4);
}

export interface RtpPacket {
    header: RtpHeader;
    body: Uint8Array;
    paddingBytes: number;
}
