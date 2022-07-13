import { logger, connectPogSocket, readSocket, decoder, sendMessage, Deferred, deferred, PogSocket, magenta, yellow, gray } from "../../../deps.ts"
import { Delta } from "./delta.ts";
import { Commands, ReceivedPayloads, Replies } from "./types/vortex.ts";

const decode = decoder()
export async function createVortex(delta: Delta): Promise<Vortex> {
    if (!delta.features.voso.enabled) {
        throw new Error("Vortex is not enabled on the configured Delta Instance.");
    }

    const state: VortexState = {
        id: 0,
        socket: await connectPogSocket(delta.features.voso.ws),
        replies: {},
        log: logger.getLogger("revolt/vortex")
    }

    /* read incoming websocket frames */
    readVortex(state);
    return {
        state,
        send<D extends Replies>(payload: Commands): Promise<D> {
            const def = state.replies[payload.id] = deferred<D>()
                , json = JSON.stringify(payload);

            // log outgoing payload
            state.log.debug(magenta("SEND"), gray(json))

            // send outgoing payload.
            sendMessage(state.socket, json);
            return def
        },
        getNextId() {
            return state.id++;
        }
    }
}

async function readVortex(state: VortexState) {
    for await (const frame of readSocket(state.socket)) {
        switch (frame.type) {
            case "close":
                console.log("vortex closed :(", frame)
                break;

            case "message": {
                const payloadText = typeof frame.data === "string"
                    ? frame.data
                    : decode(frame.data);

                state.log.debug(yellow("RECV"), gray(payloadText));

                const payload: ReceivedPayloads = JSON.parse(payloadText);
                if ("id" in payload) {
                    /* received payloads that include an ID are replies. */
                    state.replies[payload.id]?.resolve(payload);
                } else {
                    /* received payloads with no ID are an event. */
                    state.log.info("received event:", payloadText);
                }

                break;
            }
        }
    }
}

interface Vortex {
    readonly state: VortexState;

    getNextId(): number;
    send<D extends Replies>(command: Commands): Promise<D>
}

interface VortexState {
    readonly socket: PogSocket;
    readonly replies: Record<number, Deferred<Replies>>;
    readonly log: logger.Logger;

    id: number;
}
