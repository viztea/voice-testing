import { ByteWriter } from "../mod.ts";
import { CryptoSuite } from "./mod.ts";

export async function create(secretKey: Uint8Array): Promise<CryptoSuite> {
    const nonceCursor = ByteWriter.withSize(12);
    let nonce = 0;

    /* prepare the secret key. */
    const key = await crypto.subtle.importKey(
        "raw",
        secretKey,
        "AES-GCM",
        false,
        ["encrypt"],
    );

    return {
        name: "aead_aes256_gcm",
        encrypt: async (cursor, _, payload) => {
            /* reset the nonce cursor and generate a new nonce. */
            nonceCursor.reset();
            nonceCursor.writeUInt32(nonce, "little");

            /* encrypt the payload. */
            const params: AesGcmParams = {
                name: "AES-GCM",
                iv: nonceCursor.data,
                additionalData: cursor.slice(),
                tagLength: 16 * 8,
            }

            cursor.writeBytes(await crypto.subtle.encrypt(params, key, payload));

            /* append & increment nonce. */
            cursor.writeUInt32(nonce, "little");
            nonce++;
        },
        decrypt() {
            throw new Error("Not Implemented");
        },
        nextSequence: (seq) => seq + 1,
    };
}
