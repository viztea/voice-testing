import { ByteWriter } from "../tools/mod.ts";
import { RtpHeader } from "../packet/mod.ts";

export interface ICryptoStrategy {
    name: string;
}

export interface EncryptionStrategy extends ICryptoStrategy {
    encrypt(
        cursor: ByteWriter,
        header: RtpHeader,
        payload: Uint8Array,
    ): Promise<void>;

    nextSequence(previous: number): number;
}

export interface DecryptionStrategy extends ICryptoStrategy {
    decrypt(cursor: ByteWriter, header: RtpHeader, payload: Uint8Array): void;
}

export type CryptoSuite = EncryptionStrategy & DecryptionStrategy;
