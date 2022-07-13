export type SrtpCryptoSuite = `AES_CM_128_HMAC_SHA1_${"80" | "32"}` | "F8_128_HMAC_SHA1_80";

export interface SrtpParameters {
    cryptoSuite: SrtpCryptoSuite;
    keyBase64: string;
}
