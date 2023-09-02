import type { EncryptionStrategy } from "./suite.ts";

import {
    ByteWriter,
    floorDiv,
    randomBytes,
    range,
    uint16,
    uint32,
    uint32toBytes,
    uint8,
    withIndex,
} from "../tools/mod.ts";
import { base64, concat } from "../../deps.ts";
import { AES } from "./aes/cipher.ts";

export const SUITE_NAME = "aes_cm_hmac_sha1_80";

export const COUNTER_LEN = 16;
export const SALT_LEN = 14;
export const AUTH_KEY_LEN = 20;
export const AUTH_TAG_LEN = 10;
export const KEY_LEN = 16;

export function create(ctx: Context): EncryptionStrategy {
    let roc = 0;

    const counterCursor = ByteWriter.withSize(COUNTER_LEN);
    return {
        name: SUITE_NAME,
        encrypt: async (cursor, header, payload) => {
            counterCursor.reset();
            generateCounter(
                counterCursor,
                header.sequence,
                roc,
                header.ssrc,
                ctx.session.salt,
            );

            /* encrypt payload and write it to the cursor */
            cursor.writeBytes(
                await encryptCtr(ctx.session.encr, payload, counterCursor.data),
            );

            /* generate the auth tag and write to the cursor */
            cursor.writeBytes(
                await generateAuthTag(cursor.slice(), ctx.session.auth, roc),
            );
        },
        nextSequence: (previous) => {
            let newSeq = previous + 1;
            if (newSeq >= 65565) {
                roc++;
                newSeq = 0;
            }

            return newSeq;
        },
    };
}

export async function generateMasterKey(): Promise<MasterKey> {
    /* generate a random salt */
    const salt = randomBytes(SALT_LEN);

    /* generate secret. */
    const secret = await crypto.subtle.generateKey(
        { name: "AES-CTR", length: 128 },
        true,
        ["encrypt"],
    );

    return {
        salt,
        secret,
        secretBytes: new Uint8Array(
            await crypto.subtle.exportKey("raw", secret),
        ),
    };
}

export async function generateSessionContext(
    key: MasterKey,
): Promise<SessionContext> {
    return {
        encr: await crypto.subtle.importKey(
            "raw",
            deriveKey(key, 0x00, KEY_LEN),
            "AES-CTR",
            true,
            ["encrypt"],
        ),
        auth: await crypto.subtle.importKey(
            "raw",
            deriveKey(key, 0x01, AUTH_KEY_LEN),
            { name: "HMAC", hash: "SHA-1" },
            true,
            ["sign"],
        ),
        salt: deriveKey(key, 0x02, SALT_LEN),
    };
}

export function getMasterKeyBase64(key: MasterKey): string {
    const bytes = concat(key.secretBytes, key.salt);
    return base64.encode(bytes);
}

function generateCounter(
    cursor: ByteWriter,
    seq: uint16,
    roc: uint32,
    ssrc: uint32,
    salt: Uint8Array,
) {
    cursor.writeUInt32(0); // 01 02 03 04
    cursor.writeUInt32(ssrc); // 05 06 07 08
    cursor.writeUInt32(roc); // 09 10 11 12
    cursor.writeUInt32(seq << 16); // 13 14 15 16
    for (let i = 0; i < salt.length; i++) {
        cursor.data[i] ^= salt[i];
    }
}

async function generateAuthTag(
    input: Uint8Array,
    key: CryptoKey,
    roc: uint32,
): Promise<Uint8Array> {
    const a = await crypto.subtle.sign(
        "HMAC",
        key,
        concat(input, uint32toBytes(roc)),
    );

    return new Uint8Array(a).slice(0, AUTH_TAG_LEN);
}

function deriveKey(
    key: MasterKey,
    label: uint8,
    len: number,
): Uint8Array {
    const secretLen = key.secretBytes.length;
    const x = new Uint8Array(secretLen);
    x.set(key.salt);
    x[7] ^= label;

    const cipher = new AES(key.secretBytes);
    const output = new Uint8Array(
        floorDiv(secretLen + len, secretLen) * secretLen,
    );

    for (const { value: n, index: i } of withIndex(range(0, len, secretLen))) {
        x[x.length - 2] = i >> 8;
        x[x.length - 1] = i >> 0;
        output.set(cipher.encrypt(x), n);
    }

    return output.slice(0, len);
}

export function encryptCtr(
    key: CryptoKey,
    payload: Uint8Array,
    counter: Uint8Array,
): Promise<ArrayBuffer> {
    return crypto.subtle.encrypt(
        { name: "AES-CTR", counter, length: 64 },
        key,
        payload,
    );
}

export interface Context {
    session: SessionContext;
}

export interface SessionContext {
    encr: CryptoKey;
    auth: CryptoKey;
    salt: Uint8Array;
}

export interface MasterKey {
    secret: CryptoKey;
    secretBytes: Uint8Array;
    salt: Uint8Array;
}
