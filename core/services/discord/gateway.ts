import { EventEmitter, connectPogSocket, discord, decoder, gray, logger, magenta, PogSocket, readSocket, sendMessage, yellow } from "../../../deps.ts";
import { createFunctionalInterval, FunctionalInterval } from "../../tools/mod.ts";

const decode = decoder();

export async function createGateway(token: string): Promise<Gateway> {
    const state: GatewayState = {
        socket: await connectPogSocket("wss://gateway.discord.gg/?v=10&encoding=json"),
        events: new EventEmitter<GatewayEvents>(),
        sequence: -1,
        sessionId: null,
        log: logger.getLogger("discord/gateway"),
        heartbeat: createFunctionalInterval()
    }

    readGateway(state);

    /* send identify */
    send(state, {
        op: discord.GatewayOpcodes.Identify,
        d: {
            token,
            intents: discord.GatewayIntentBits.Guilds | discord.GatewayIntentBits.GuildVoiceStates,
            properties: {
                browser: "Mixtape",
                device: "Mixtape",
                os: "Mixtape"
            }
        }
    });

    return {
        state,
        send: payload => send(state, payload)
    }
}

async function readGateway(state: GatewayState) {
    for await (const frame of readSocket(state.socket)) {
        switch (frame.type) {
            case "close":
                state.log.warning("gateway has closed.");
                break;
            case "message": {
                const payloadText = typeof frame.data === "string"
                    ? frame.data
                    : decode(frame.data);

                /* log received json */
                state.log.debug(yellow("RECV"), gray(payloadText));

                /* handle received message */
                handleGatewayPayload(state, JSON.parse(payloadText));
                break;
            }
        }
    }
}

function handleGatewayPayload(state: GatewayState, payload: discord.GatewayReceivePayload) {
    switch (payload.op) {
        case discord.GatewayOpcodes.Dispatch:
            /* received dispatch event. */
            state.sequence = payload.s;
            if (payload.t === discord.GatewayDispatchEvents.Ready) {
                state.log.info("now ready!");
                heartbeat(state);
                state.self = payload.d.user;
            }

            state.events.emit("dispatch", payload);
            break;
        case discord.GatewayOpcodes.Heartbeat:
            heartbeat(state);
            break;
        case discord.GatewayOpcodes.HeartbeatAck:
            state.log.info("our last heartbeat was acknowledged");
            break;
        case discord.GatewayOpcodes.Hello:
            state.heartbeat.start(payload.d.heartbeat_interval, () => heartbeat(state));
            break;
    }
}

function heartbeat(state: GatewayState) {
    const d = state.sequence == -1 ? null : state.sequence;
    send(state, { op: discord.GatewayOpcodes.Heartbeat, d });
}

function send(state: GatewayState, payload: discord.GatewaySendPayload) {
    const json = JSON.stringify(payload);

    /* log outgoing payload. */
    state.log.debug(magenta("SEND"), gray(json));

    /* send payload to gateway */
    sendMessage(state.socket, json);
}

export interface Gateway {
    state: GatewayState;
    send: (payload: discord.GatewaySendPayload) => void;
}

export interface GatewayState {
    socket: PogSocket;
    events: EventEmitter<GatewayEvents>;
    sequence: number;
    sessionId: string | null;
    self?: discord.APIUser;
    heartbeat: FunctionalInterval;
    log: logger.Logger;
}

export type GatewayEvents = {
    dispatch: [payload: discord.GatewayDispatchPayload];
}
