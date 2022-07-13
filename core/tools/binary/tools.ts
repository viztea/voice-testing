import { ByteWriter } from "./writer.ts";
import { uint32 } from "../types.ts";
import { Endianess } from "./endianess.ts";

export function uint32toBytes(value: uint32, endianess: Endianess = "big"): Uint8Array {
    return ByteWriter.withSize(4)
        .writeUInt32(value, endianess)
        .data;
}

export function randomBytes(size: number): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(size));
}
