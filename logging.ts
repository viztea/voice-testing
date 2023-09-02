import {
    LogLevelNames,
    LogLevels,
} from "https://deno.land/std@0.147.0/log/levels.ts";
import {
    blue,
    cyan,
    green,
    logger,
    magenta,
    red,
    reset,
    white,
    yellow,
} from "./deps.ts";

const LOG_LEVEL_NAME_PADDING = LogLevelNames.reduce(
    (m, l) => Math.max(m, l.length),
    0,
);

await logger.setup({
    handlers: {
        console: new logger.handlers.ConsoleHandler("DEBUG", {
            formatter: (rec) => {
                const levelColor = {
                    [LogLevels.DEBUG]: blue,
                    [LogLevels.INFO]: cyan,
                    [LogLevels.WARNING]: yellow,
                    [LogLevels.ERROR]: red,
                    [LogLevels.CRITICAL]: magenta,
                }[rec.level] ?? white;

                const loggerName = rec.loggerName === "default"
                    ? ""
                    : `${green(rec.loggerName)}${reset(":")} `;

                return `» ${
                    levelColor(rec.levelName.padEnd(LOG_LEVEL_NAME_PADDING))
                }${reset("")} — ${loggerName}${reset("")}${rec.msg} ${
                    rec.args.join(" ")
                }`;
            },
        }),
    },
    loggers: {
        default: {
            handlers: ["console"],
            level: "DEBUG",
        },
        "discord": {
            handlers: ["console"],
            level: "DEBUG",
        },
        "discord/gateway": {
            handlers: ["console"],
            level: "DEBUG",
        },
        "discord/voice_gateway": {
            handlers: ["console"],
            level: "DEBUG",
        },
        "revolt/vortex": {
            handlers: ["console"],
            level: "DEBUG",
        },
        "frame/sender": {
            handlers: ["console"],
            level: "DEBUG",
        },
    },
});
