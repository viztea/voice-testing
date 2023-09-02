export function randomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min) + min);
}

export function formatMilliseconds(ms: number): string {
    return new Date(ms)
        .toISOString()
        .substring(11, 19)
        .replace(/^\d{2}:/, "");
}

export function createFunctionalInterval(): FunctionalInterval {
    let id: number;
    return {
        start: (duration, callback) => id = setInterval(callback, duration),
        stop: () => clearInterval(id),
    };
}

export interface FunctionalInterval {
    start: (duration: number, callback: () => void) => number;
    stop: () => void;
}

export function floorDiv(a: number, b: number): number {
    return Math.floor(a / b);
}

export function range(start: number, stop: number, step = 1): number[] {
    return Array(Math.ceil((stop - start) / step)).fill(start).map((x, y) =>
        x + y * step
    );
}

export function withIndex<T>(arr: T[]): { index: number; value: T }[] {
    return arr.map((value, index) => ({ value, index }));
}

export function env(name: string) {
    const value = Deno.env.get(name);
    if (!value) throw new Error(`Environment variable '${name}' is not set.`);
    return value;
}
