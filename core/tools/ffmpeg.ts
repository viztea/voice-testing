// Thanks harmony devs <3 https://github.com/harmonyland/harmony_voice/blob/main/src/ffmpeg.ts

import {
    readableStreamFromReader,
    writableStreamFromWriter,
} from "../../deps.ts";

export interface FFmpegStreamOptions {
    path?: string;
    args: string[];
    chunkSize?: number;
    stderr?: boolean;
}

export class FFmpegStream extends ReadableStream<Uint8Array> {
    #proc?: Deno.Process;
    #stderr?: ReadableStream<string>;
    #stdin?: WritableStream<Uint8Array>;

    get writable(): WritableStream<Uint8Array> {
        return this.stdin;
    }

    get readable(): ReadableStream<Uint8Array> {
        return this;
    }

    get proc() {
        if (!this.#proc) {
            this.#proc = Deno.run({
                cmd: [this.options.path || "ffmpeg", ...this.options.args],
                cwd: Deno.cwd(),
                stdout: "piped",
                stderr: this.options.stderr ? "piped" : "null",
                stdin: "piped",
            });
        }

        if (this.#proc.stderr) {
            this.#stderr = readableStreamFromReader(this.#proc.stderr)
                .pipeThrough(
                    new TextDecoderStream(),
                );
        }
        this.#stdin = writableStreamFromWriter(this.#proc.stdin!);
        return this.#proc;
    }

    get stderr() {
        if (!this.#stderr) {
            if (this.proc.stderr) {
                this.#stderr = readableStreamFromReader(this.proc.stderr)
                    .pipeThrough(
                        new TextDecoderStream(),
                    );
            }
        }

        return this.#stderr;
    }

    get stdin() {
        if (!this.#stdin) {
            this.#stdin = writableStreamFromWriter(this.proc.stdin!);
        }

        return this.#stdin;
    }

    constructor(public options: FFmpegStreamOptions) {
        super({
            pull: async (ctx) => {
                const proc = this.proc;

                for await (
                    const chunk of readableStreamFromReader(proc.stdout!, {
                        chunkSize: options.chunkSize,
                    })
                ) {
                    ctx.enqueue(chunk);
                }

                ctx.close();
                proc.close();
            },
        });
    }
}

export class PCMStream extends FFmpegStream {
    constructor(path: string) {
        super({
            args: [
                "-i",
                path,
                "-f",
                "s16le",
                "-acodec",
                "pcm_s16le",
                "-ac",
                "2",
                "-ar",
                "48000",
                "-",
            ],
        });
    }
}
