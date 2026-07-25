import { chmod, open, rename, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

export interface AtomicWriteOptions {
	mode?: number;
	beforeRename?: () => void | Promise<void>;
}

export async function atomicWriteFile(
	path: string,
	bytes: Uint8Array,
	options: AtomicWriteOptions = {},
): Promise<void> {
	const directory = dirname(path);
	const temporaryPath = join(
		directory,
		`.agents-pack.tmp-${process.pid}-${randomUUID()}`,
	);
	const handle = await open(
		temporaryPath,
		"wx",
		options.mode === undefined ? 0o666 : options.mode & 0o777,
	);
	let handleOpen = true;

	try {
		await handle.writeFile(bytes);
		await handle.sync();
		await handle.close();
		handleOpen = false;

		if (options.mode !== undefined) {
			await chmod(temporaryPath, options.mode & 0o777);
		}

		await options.beforeRename?.();
		await rename(temporaryPath, path);
		await syncDirectory(directory);
	} catch (error) {
		if (handleOpen) {
			await handle.close().catch(() => undefined);
		}

		await unlink(temporaryPath).catch((unlinkError: unknown) => {
			if (!isMissing(unlinkError)) {
				throw unlinkError;
			}
		});
		throw error;
	}
}

export async function syncDirectory(path: string): Promise<void> {
	const handle = await open(path, "r");

	try {
		await handle.sync();
	} finally {
		await handle.close();
	}
}

function isMissing(error: unknown): boolean {
	return (
		error instanceof Error &&
		"code" in error &&
		(error as NodeJS.ErrnoException).code === "ENOENT"
	);
}
