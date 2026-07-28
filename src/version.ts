import packageMetadata from "../package.json" with { type: "json" };

export const CLI_VERSION = packageMetadata.version;
