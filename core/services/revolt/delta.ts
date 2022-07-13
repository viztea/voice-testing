import { DELTA_URL } from "./constants.ts";
import { DeltaFeatures, RESTGetDeltaResponse, RESTPostJoinCallResponse } from "./types/delta.ts";

export async function createDelta(
    auth: DeltaAuth,
    url: string = DELTA_URL,
): Promise<Delta> {
    const response: RESTGetDeltaResponse = await fetch(url)
        .then(r => r.json());

    function make(endpoint: string, init: RequestInit = {}): Promise<Response> {
        return fetch(url + endpoint, {
            ...init,
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                ...(init.headers ?? {}),
                [auth.header]: auth.token,
            }
        })
    }

    return {
        features: response.features,
        async joinCall(roomId: string): Promise<RESTPostJoinCallResponse> {
            const r = await make(`/channels/${roomId}/join_call`, { method: "POST" });
            return r.json();
        }
    }
}

export interface Delta {
    features: DeltaFeatures;

    joinCall(roomId: string): Promise<RESTPostJoinCallResponse>;
}

export type DeltaAuth = BotToken | SessionToken;

export interface BotToken {
    header: "X-Bot-Token";
    token: string;
}

export interface SessionToken {
    header: "X-Session-Token";
    token: string;
}
