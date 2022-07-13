export type MediaKind             = "audio" | "video";
export type RtpExtensionDirection = `${"send" | "recv"}only` | "sendonly"

export interface RtpCapabilities {
    codecs: RtpCodecCapability[];
    headerExtensions: RtpHeaderExtension[];
}

export interface RtpParameters {
    mid: string | null;
    codecs: RtpCodecParameters[];
    headerExtensions: RtpHeaderExtension[];
    encodings: RtpEncodingParameters[];
    rtcp?: RtcpParameters;
}

export interface RtcpParameters {
    cname?: string;
    reducedSize?: boolean;
}

export interface RtpEncodingParameters {
    ssrc?: number;
    dtx?: boolean;
    rid?: string;
    codecPayloadType?: number;
    rtx?: { ssrc?: number },
    scaleDownResolutionBy?: number;
    maxBitrate?: number;
}

export interface RtpCodecCapability {
    kind: MediaKind;
    mimeType: string;
    preferredPayloadType: number;
    clockRate: number;
    channels: number | null;
    parameters: Record<string, unknown>;
}

export interface RtpCodecParameters {
    mimeType: string;
    payloadType: number;
    clockRate: number;
    channels: number | null;
    parameters: Record<string, unknown>;
    rtcpFeedback: Array<RtcpFeedback>;
}

export interface RtpHeaderExtension {
    kind: MediaKind;
    uri: string;
    preferredId: string;   
    preferredEncrypt: boolean | null;   
    direction: RtpExtensionDirection; 
}

export interface RtcpFeedback {
    type: string;
    parameter: string | null;
}
