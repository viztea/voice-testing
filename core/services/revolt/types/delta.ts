export interface RESTGetDeltaResponse {
    features: DeltaFeatures;
    ws: string;
    app: string;
    vapid: string;
}

export interface RESTPostJoinCallResponse {
    token: string;
}

export interface DeltaFeatures {
    captcha: DeltaCaptchaFeature;
    email: true;
    invite_only: boolean;
    autumn: DeltaBackendService;
    january: DeltaBackendService;
    voso: DeltaBackendService & { ws: string };
}

export interface DeltaCaptchaFeature {
    enabled: boolean;
    key: string;
}

export interface DeltaBackendService {
    enabled: boolean;
    url: string;
    ws?: string;
}
