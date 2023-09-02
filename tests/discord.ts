import "../logging.ts";
import {
    aead_aes256_gcm,
    createGateway,
    createVoiceGateway,
    env,
    holepunch,
    VoiceGatewayInfo,
} from "../core/mod.ts";
import { discord, logger } from "../deps.ts";
import { startFfmpegTest } from "./common.ts";

const log = logger.getLogger("discord");

/* get the IDs to use for a voice connection */
const GUILD_ID = env("GUILD_ID"),
    CHANNEL_ID = env("CHANNEL_ID");

/* create a new gateway instance. */
const gateway = await createGateway(Deno.env.get("BOT_TOKEN")!);

let voice: Partial<VoiceGatewayInfo> = {};
function checkCanConnectVoice() {
    if (voice.server && voice.state) {
        runVoice(voice as VoiceGatewayInfo);
        voice = {};
    }
}

gateway.state.events.on("dispatch", (payload) => {
    if (payload.t === "VOICE_SERVER_UPDATE") {
        voice.server = payload.d;
        checkCanConnectVoice();
    } else if (payload.t === "VOICE_STATE_UPDATE") {
        if (payload.d.user_id !== gateway.state.self?.id) {
            return;
        }

        voice.state = payload.d;
        checkCanConnectVoice();
    } else if (payload.t === "READY") {
        /* send voice state update. */
        gateway.send({
            op: discord.GatewayOpcodes.VoiceStateUpdate,
            d: {
                guild_id: GUILD_ID,
                channel_id: CHANNEL_ID,
                self_deaf: true,
                self_mute: false,
            },
        });
    }
});

async function runVoice(voice: VoiceGatewayInfo) {
    const gateway = await createVoiceGateway(voice);

    gateway.state.events.on("ready", async () => {
        const { ip, port } = await holepunch(
            gateway.state.ssrc!,
            gateway.state.transport!,
        );

        /* select protocol */
        log.info(`performed holepunch: ${ip}:${port}`);

        gateway.send({
            op: 1,
            d: {
                protocol: "udp",
                data: {
                    address: ip,
                    port,
                    mode: "aead_aes256_gcm",
                },
            },
        });
    });

    gateway.state.events.on("session_description", async (secretKey) => {
        await startFfmpegTest({
            transport: gateway.state.transport!,
            ssrc: gateway.state.ssrc!,
            // encryptionStrategy: await xsalsa20_poly1305.create(
            //     secretKey,
            //     xsalsa20_poly1305.createSuffixNonceStrategy()
            // ),
            encryptionStrategy: await aead_aes256_gcm.create(secretKey),
            updateSpeaking: (value) =>
                gateway.send({
                    op: 5,
                    d: {
                        speaking: value ? 1 << 0 : 0,
                        delay: 0,
                        ssrc: gateway.state.ssrc!,
                    },
                }),
        });
    });
}
