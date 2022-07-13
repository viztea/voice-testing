import type { MediaKind, RtpCapabilities, RtpParameters } from "./rtp.ts";
import type { SrtpCryptoSuite, SrtpParameters } from "./srtp.ts";

export interface UserInfo {
    audio: boolean;
}

/* base payload */
export type EventType   = "UserJoined"   | "UserLeft" | "UserStartProduce" | "UserStopProduce";

export type CommandType = "Authenticate" | "RoomInfo" | "ConnectTransport" | "InitializeTransports" | "StartProduce" | "StopProduce";

export type PayloadType = EventType | CommandType;

type Event<T extends EventType, D> = {
    type: T;
    data: D;
}

type Payload<T extends PayloadType, D> = { type: T, id: number, data: D }

/* events */
export type UserJoinedEvent  = Event<"UserJoined",       { id: string }>;
export type UserLeftEvent    = Event<"UserLeft",         { id: string }>;
export type UserStartProduce = Event<"UserStartProduce", { id: string, type: MediaKind }>;
export type UserStopProduce  = Event<"UserStopProduce",  { id: string, type: MediaKind }>;

export type Events = UserJoinedEvent | UserLeftEvent | UserStartProduce | UserStopProduce;

/* replies */
export type RoomInfoReply             = Payload<"RoomInfo",             { id: string, videoAllowed: boolean, users: Record<string, UserInfo> }>;
export type StartProduceReply         = Payload<"StartProduce",         { producerId: string }>;
export type ConnectTransportsReply    = Payload<"ConnectTransport",     { producerId: string }>;
export type AuthenticateReply         = Payload<"Authenticate",         { version: string, roomId: string, userId: string, rtpCapabilities: RtpCapabilities }>;
export type InitializeTransportsReply = Payload<"InitializeTransports", { id: string, ip: string, port: number, srtpCryptoSuite: SrtpCryptoSuite }>;

export type Replies = RoomInfoReply | StartProduceReply | ConnectTransportsReply | AuthenticateReply | InitializeTransportsReply;

/* commands */
export type RoomInfoCommand             = Payload<"RoomInfo",             never>;
export type StartProduceCommand         = Payload<"StartProduce",         { type: MediaKind, rtpParameters: RtpParameters }>;
export type ConnectTransportCommand     = Payload<"ConnectTransport",     { id: string, srtpParameters: SrtpParameters }>
export type AuthenticateCommand         = Payload<"Authenticate",         { roomId: string, token: string }>;
export type InitializeTransportsCommand = Payload<"InitializeTransports", { mode: string, rtpCapabilities: RtpCapabilities }>;

export type Commands = Omit<RoomInfoCommand, "data"> | StartProduceCommand | ConnectTransportCommand | AuthenticateCommand | InitializeTransportsCommand;

/* payloads */
export type SentPayloads     = Commands;
export type ReceivedPayloads = Events | Replies;

export type Payloads = SentPayloads | ReceivedPayloads;
