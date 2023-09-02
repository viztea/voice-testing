import "../logging.ts";
import {
    aes_cm_hmac_sha1_80,
    AuthenticateReply,
    createDelta,
    createVoiceTransport,
    createVortex,
    env,
    InitializeTransportsReply,
    randomNumber,
} from "../core/mod.ts";
import { startFfmpegTest } from "./common.ts";

const state = { mid: 0 };

/* ID of the room to join */
const ROOM_ID = env("ROOM_ID");

/* create delta instance. */
const delta = await createDelta({
    header: "X-Bot-Token",
    token: Deno.env.get("BOT_TOKEN")!,
});

/* join call to get a voice token. */
const { token } = await delta.joinCall(ROOM_ID);
if (!token) {
    throw new Error("Unable to join call.");
}

/* create vortex instance */
const vortex = await createVortex(delta);

/* authenticate with voso */
const { data: authenticated } = await vortex.send<AuthenticateReply>({
    id: vortex.getNextId(),
    type: "Authenticate",
    data: { token, roomId: ROOM_ID },
});

/* find the opus codec */
const opusCodec = authenticated.rtpCapabilities.codecs.find((c) =>
    c.mimeType === "audio/opus" && c.clockRate === 48000
);
if (!opusCodec) {
    throw new Error("Could not find compatible opus codec in rtpCapabilities.");
}

/* initialize transports */
const { data: transport } = await vortex.send<InitializeTransportsReply>({
    id: vortex.getNextId(),
    type: "InitializeTransports",
    data: {
        mode: "CombinedRTP",
        rtpCapabilities: {
            codecs: [opusCodec],
            headerExtensions: [],
        },
    },
});

// create master key */
const masterKey = await aes_cm_hmac_sha1_80.generateMasterKey();

// connect transport
await vortex.send({
    id: vortex.getNextId(),
    type: "ConnectTransport",
    data: {
        id: transport.id,
        srtpParameters: {
            cryptoSuite: "AES_CM_128_HMAC_SHA1_80",
            keyBase64: aes_cm_hmac_sha1_80.getMasterKeyBase64(masterKey),
        },
    },
});

/* start producer */

// get next mid and random ssrc
const mid = state.mid++,
    ssrc = randomNumber(1000, 10000);

// send StartProduce
await vortex.send({
    id: vortex.getNextId(),
    type: "StartProduce",
    data: {
        rtpParameters: {
            mid: `${mid}`,
            codecs: [
                {
                    channels: 2,
                    clockRate: 48000,
                    mimeType: "audio/opus",
                    payloadType: 120,
                    parameters: {},
                    rtcpFeedback: [],
                },
            ],
            headerExtensions: [],
            encodings: [{ ssrc, maxBitrate: 512000 }],
            rtcp: { cname: crypto.randomUUID(), reducedSize: false },
        },
        type: "audio",
    },
});

/* start ffmpeg test */
await startFfmpegTest({
    ssrc,
    transport: createVoiceTransport(transport.ip, transport.port),
    encryptionStrategy: aes_cm_hmac_sha1_80.create({
        session: await aes_cm_hmac_sha1_80.generateSessionContext(masterKey),
    }),
    updateSpeaking: (_) => void _,
});
