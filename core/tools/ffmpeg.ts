// Thanks harmony devs <3 https://github.com/harmonyland/harmony_voice/blob/main/src/ffmpeg.ts

export interface FFmpegStreamOptions {
    path?: string;
    args: string[];
    stderr?: boolean;
}

export class FFmpegStream extends ReadableStream<Uint8Array> {
    #proc?: Deno.ChildProcess;
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
            // this.#proc = Deno.run({
            //     cmd: [this.options.path || "ffmpeg", ...this.options.args],
            //     cwd: Deno.cwd(),
            //     stdout: "piped",
            //     stderr: this.options.stderr ? "piped" : "null",
            //     stdin: "piped",
            // });

            const command = new Deno.Command(this.options.path ?? "ffmpeg", {
                args: this.options.args,
                cwd: Deno.cwd(),
                stdout: "piped",
                stderr: this.options.stderr ? "piped" : "null",
                stdin: "piped",
            });

            this.#proc = command.spawn();
        }

        if (this.options.stderr) {
            this.#stderr = this.#proc.stderr.pipeThrough(
                new TextDecoderStream(),
            );
        }
        this.#stdin = this.#proc.stdin;
        return this.#proc;
    }

    get stderr() {
        if (!this.#stderr) {
            if (this.options.stderr) {
                this.#stderr = this.proc.stderr.pipeThrough(new TextDecoderStream());
            }
        }

        return this.#stderr;
    }

    get stdin() {
        if (!this.#stdin) {
            this.#stdin = this.proc.stdin;
        }

        return this.#stdin;
    }

    constructor(public options: FFmpegStreamOptions) {
        super({
            pull: async (ctx) => {
                const proc = this.proc;

                for await (const chunk of proc.stdout) {
                    ctx.enqueue(chunk);
                }

                ctx.close();
                proc.kill();
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
