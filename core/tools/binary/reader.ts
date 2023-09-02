import { readUInt16BE, readUInt32BE } from "./endianess.ts";

export class ByteReader {
    position = 0;

    constructor(public data: Uint8Array) {
    }

    /**
     * The remaining number of bytes that can be read.
     */
    get remaining(): number {
        return this.data.length - this.position;
    }

    /**
     * Reads a single byte from the underlying buffer.
     * @returns {number}
     */
    read(): number {
        return this.data[this.position++];
    }

    /**
     * Reads {@link n} number of bytes from the underlying buffer.
     *
     * @param {number} n the number of bytes to read.
     * @returns {ByteReader} a view containing the bytes that were read.
     */
    readBytes(n: number = this.data.length - this.position): Uint8Array {
        return this.data.slice(this.position, this.position + n);
    }

    /**
     * Reads an unsigned 16-bit integer from the underlying buffer.
     *
     * @returns {number}
     */
    readUInt16BE(): number {
        this.requireBytes(2);

        const value = readUInt16BE(this.data, this.position);
        this.position += 2;

        return value;
    }

    /**
     * Reads an unsigned 32-bit integer from the underlying buffer.
     *
     * @returns {number}
     */
    readUInt32BE(): number {
        this.requireBytes(4);

        const value = readUInt32BE(this.data, this.position);
        this.position += 4;

        return value;
    }

    resize(start = 0, end = this.data.length) {
        // check if the start and end is within bounds and are in the correct order
        if (start >= 0 && end <= this.data.length) {
            this.data = this.data.subarray(start, end);
            return true;
        }

        return false;
    }

    private requireBytes(n: number) {
        if (this.data.length < this.position + n) {
            throw new RangeError("Not enough bytes to read.");
        }
    }
}
