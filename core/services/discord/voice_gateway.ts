// deno-lint-ignore-file no-explicit-any
import { EventEmitter, connectPogSocket, decoder, gray, discord, logger, magenta, PogSocket, readSocket, sendMessage, yellow } from "../../../deps.ts";
import { createVoiceTransport, VoiceTransport } from "../connection.ts";
import { FunctionalInterval, createFunctionalInterval } from "../../tools/mod.ts";

export async function createVoiceGateway(info: VoiceGatewayInfo): Promise<VoiceGateway> {
    const state: VoiceGatewayState = {
        socket: await connectPogSocket(`wss://${info.server.endpoint}/?v=4`),
        heartbeat: createFunctionalInterval(),
        events: new EventEmitter<VoiceGatewayEvents>(),
        log: logger.getLogger("discord/voice_gateway")
    };

    readVoiceGateway(state);

    /* send identify */
    send(state, {
        op: 0,
        d: {
            session_id: info.state.session_id,
            token: info.server.token,
            server_id: info.server.guild_id,
            user_id: info.state.user_id,
        },
    });

    return {
        state,
        send: payload => send(state, payload),
    };
}

async function readVoiceGateway(state: VoiceGatewayState) {
    const decode = decoder();

    for await (const frame of readSocket(state.socket)) {
        switch (frame.type) {
            case "close":
                console.log(frame);
                state.log.warning("voice gateway closed.");
                break;
            case "message": {
                const payloadText = typeof frame.data === "string"
                    ? frame.data
                    : decode(frame.data);

                /* log received json */
                state.log.debug(yellow("RECV"), gray(payloadText));

                /* handle received message */
                await handleVoiceGatewayPayload(state, JSON.parse(payloadText));
                break;
            }
        }
    }
}

async function handleVoiceGatewayPayload(state: VoiceGatewayState, payload: Record<string, any>) {
    switch (payload.op) {
        case 2: // READY
            state.ssrc = payload.d.ssrc;
            state.transport = createVoiceTransport(payload.d.ip, payload.d.port);
            heartbeat(state);

            await state.events.emit("ready");
            break;
        case 4: // SESSION_DESCRIPTION
            await state.events.emit("session_description", new Uint8Array(payload.d.secret_key));
            break;
        case 6: // HEARTBEAT_ACK
            state.log.info("our last heartbeat was acknowledged.");
            break;
        case 8: // HELLO
            state.heartbeat.start(payload.d.heartbeat_interval, () => heartbeat(state));
            break;
    }
}

function heartbeat(state: VoiceGatewayState) {
    send(state, { op: 3, d: Date.now() });
}

function send(state: VoiceGatewayState, payload: any) {
    const json = JSON.stringify(payload);

    /* log outgoing payload. */
    state.log.debug(magenta("SEND"), gray(json));

    /* send payload */
    sendMessage(state.socket, json);
}

export interface VoiceGatewayInfo {
    server: discord.GatewayVoiceServerUpdateDispatchData;
    state: discord.GatewayVoiceStateUpdateDispatchData;
}

export interface VoiceGateway {
    state: VoiceGatewayState;

    send(payload: unknown): void;
}

export interface VoiceGatewayState {
    socket: PogSocket;
    events: EventEmitter<VoiceGatewayEvents>;
    heartbeat: FunctionalInterval;
    ssrc?: number;
    log: logger.Logger;
    transport?: VoiceTransport;
}

export type VoiceGatewayEvents = {
    ready: [];
    session_description: [secretKey: Uint8Array]
}
