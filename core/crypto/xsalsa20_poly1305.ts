import type { CryptoSuite } from "./suite.ts";

import { sodium } from "../../deps.ts";
import { ByteWriter, randomBytes, RtpHeader, writeRtpHeader } from "../mod.ts";

export enum NonceStrategyType {
    Normal,
    Suffix,
    Lite
}

export const NONCE_LENGTH = 24;

export async function create(secretKey: Uint8Array, nonceStrategy: NonceStrategy): Promise<CryptoSuite> {
    await sodium.ready;
    const nonceCursor = ByteWriter.withSize(NONCE_LENGTH);
    return {
        name: getSuiteName(nonceStrategy.type),
        encrypt: (cursor: ByteWriter, header: RtpHeader, payload: Uint8Array) => {
            /* reset the nonce cursor and generate a new nonce. */
            nonceCursor.reset();
            nonceStrategy.generate(nonceCursor, header);

            /* encrypt the payload. */
            const encrypted = sodium.crypto_secretbox_easy(payload, nonceCursor.data, secretKey);
            cursor.writeBytes(encrypted);

            /* append the nonce to the cursor */
            nonceStrategy.append(cursor, nonceCursor.data);
            return Promise.resolve()
        },
        decrypt: () => {
            throw new Error("Not Implemented Yet");
        },
        nextSequence: seq => seq + 1
    }
}

function getSuiteName(nonceStrategy: NonceStrategyType): string {
    const base = "xsalsa20_poly1305";
    return nonceStrategy === NonceStrategyType.Normal
        ? base
        : `${base}_${NonceStrategyType[nonceStrategy].toLowerCase()}`;
}

export function createNormalNonceStrategy(): NonceStrategy {
    return {
        type: NonceStrategyType.Normal,
        generate: (cursor, header) => writeRtpHeader(cursor, header),
        append: () => void 0,
    }
}

export function createSuffixNonceStrategy(): NonceStrategy {
    return {
        type: NonceStrategyType.Suffix,
        generate: cursor => cursor.writeBytes(randomBytes(NONCE_LENGTH)),
        append: (cursor, nonce) => cursor.writeBytes(nonce),
    }
}

export function createLiteNonceStrategy(): NonceStrategy {
    let seq = 0;
    return {
        type: NonceStrategyType.Normal,
        generate: cursor => cursor.writeUInt32(++seq, "little"),
        append: cursor => cursor.writeUInt32(seq, "little"),
    }
}

interface NonceStrategy {
    type: NonceStrategyType;

    generate(cursor: ByteWriter, header: RtpHeader): void;
    append(cursor: ByteWriter, nonce: Uint8Array): void;
}
