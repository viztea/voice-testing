import { readUInt32BE, writeUInt32BE } from "../../mod.ts";
import { S, T1, T2, T3, T4, T5, T6, T7, T8 } from "./consts.ts";

export class AES {
    static readonly BLOCK_SIZE = 16;

    #ke: Uint32Array;
    #kd: Uint32Array;
    #nr: number;

    constructor(key: Uint8Array) {
        if (![16, 24, 32].includes(key.length)) {
            throw new RangeError("Key size must be either 16, 24 or 32 bytes");
        }

        const keyLen = key.length / 4;
        const rkc = key.length + 28;

        this.#nr = rkc - 4;
        this.#ke = new Uint32Array(rkc);
        this.#kd = new Uint32Array(rkc);

        for (let i = 0; i < keyLen; i++) {
            this.#ke[i] = readUInt32BE(key, i * 4);
        }

        let rcon = 1;
        for (let i = keyLen; i < rkc; i++) {
            let tmp = this.#ke[i - 1];

            if (i % keyLen === 0 || (keyLen === 8 && i % keyLen === 4)) {
                tmp = S[tmp >>> 24] << 24 ^ S[(tmp >> 16) & 0xff] << 16 ^
                    S[(tmp >> 8) & 0xff] << 8 ^ S[tmp & 0xff];

                if (i % keyLen === 0) {
                    tmp = tmp << 8 ^ tmp >>> 24 ^ rcon << 24;
                    rcon = rcon << 1 ^ (rcon >> 7) * 0x11b;
                }
            }

            this.#ke[i] = this.#ke[i - keyLen] ^ tmp;
        }

        for (let j = 0, i = rkc; i; j++, i--) {
            const tmp = this.#ke[j & 3 ? i : i - 4];
            this.#kd[j] = (i <= 4 || j < 4) 
                ? tmp 
                : 
                T5[S[(tmp >>> 24)       ]] ^
                T6[S[(tmp >>  16) & 0xff]] ^
                T7[S[(tmp >>   8) & 0xff]] ^
                T8[S[(tmp & 0xff)       ]]
        }
    }

    encrypt(data: Uint8Array) {
        const encrypted = data.slice();

        /* encrypt all blocks within the provided data. */
        for (let i = 0; i < data.length; i += AES.BLOCK_SIZE) {
            this.encryptBlock(encrypted, i);
        }

        /* return the encrypted data. */
        return encrypted;
    }

    encryptBlock(data: Uint8Array, offset: number) {
        let t0 = readUInt32BE(data, offset +  0) ^ this.#ke[0];
        let t1 = readUInt32BE(data, offset +  4) ^ this.#ke[1];
        let t2 = readUInt32BE(data, offset +  8) ^ this.#ke[2];
        let t3 = readUInt32BE(data, offset + 12) ^ this.#ke[3];

        for (let i = 4; i < this.#nr; i += 4) {
            const a0 = 
                T1[(t0 >>> 24)       ] ^ 
                T2[(t1 >>  16) & 0xff] ^ 
                T3[(t2 >>   8) & 0xff] ^
                T4[(t3 & 0xff)       ] ^ 
                this.#ke[i];

            const a1 = 
                T1[(t1 >>> 24)       ] ^ 
                T2[(t2 >>  16) & 0xff] ^ 
                T3[(t3 >>   8) & 0xff] ^
                T4[(t0 & 0xff)       ] ^ 
                this.#ke[i + 1];

            const a2 = 
                T1[(t2 >>> 24)       ] ^ 
                T2[(t3 >>  16) & 0xff] ^ 
                T3[(t0 >>   8) & 0xff] ^
                T4[(t1 & 0xff)       ] ^ 
                this.#ke[i + 2];

            t3 =
                T1[(t3 >>> 24)       ] ^ 
                T2[(t0 >>  16) & 0xff] ^ 
                T3[(t1 >>   8) & 0xff] ^
                T4[(t2 & 0xff)       ] ^ 
                this.#ke[i + 3];

            t0 = a0;
            t1 = a1;
            t2 = a2;
        }

        writeUInt32BE(
            data,
            S[(t0 >>> 24)       ] << 24 ^ 
            S[(t1 >>  16) & 0xff] << 16 ^
            S[(t2 >>   8) & 0xff] <<  8 ^ 
            S[(t3 & 0xff)       ]       ^ 
            this.#ke[this.#nr],
            offset,
        );
        
        writeUInt32BE(
            data,
            S[(t1 >>> 24)       ] << 24 ^ 
            S[(t2 >>  16) & 0xff] << 16 ^
            S[(t3 >>   8) & 0xff] <<  8 ^ 
            S[(t0 & 0xff)       ]       ^ 
            this.#ke[this.#nr + 1],
            offset + 4,
        );

        writeUInt32BE(
            data,
            S[(t2 >>> 24)       ] << 24 ^ 
            S[(t3 >>  16) & 0xff] << 16 ^
            S[(t0 >>   8) & 0xff] <<  8 ^ 
            S[(t1 & 0xff)       ]       ^ 
            this.#ke[this.#nr + 2],
            offset + 8,
        );

        writeUInt32BE(
            data,
            S[(t3 >>> 24)       ] << 24 ^ 
            S[(t0 >>  16) & 0xff] << 16 ^
            S[(t1 >>   8) & 0xff] <<  8 ^ 
            S[(t2 & 0xff)       ]       ^ 
            this.#ke[this.#nr + 3],
            offset + 12,
        );
    }
}