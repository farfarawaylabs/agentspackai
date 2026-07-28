import { AgentsPackError } from "./errors.ts";

interface ParsedVersion {
	major: number;
	minor: number;
	patch: number;
	prerelease: string[];
}

const SEMVER =
	/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export function isSemanticVersion(value: string): boolean {
	return SEMVER.test(value);
}

export function compareVersions(left: string, right: string): number {
	const parsedLeft = parseVersion(left);
	const parsedRight = parseVersion(right);

	for (const key of ["major", "minor", "patch"] as const) {
		const difference = parsedLeft[key] - parsedRight[key];

		if (difference !== 0) {
			return difference < 0 ? -1 : 1;
		}
	}

	if (
		parsedLeft.prerelease.length === 0 ||
		parsedRight.prerelease.length === 0
	) {
		if (parsedLeft.prerelease.length === parsedRight.prerelease.length) {
			return 0;
		}

		return parsedLeft.prerelease.length === 0 ? 1 : -1;
	}

	const length = Math.max(
		parsedLeft.prerelease.length,
		parsedRight.prerelease.length,
	);

	for (let index = 0; index < length; index += 1) {
		const leftPart = parsedLeft.prerelease[index];
		const rightPart = parsedRight.prerelease[index];

		if (leftPart === undefined || rightPart === undefined) {
			return leftPart === undefined ? -1 : 1;
		}

		if (leftPart === rightPart) {
			continue;
		}

		const leftNumber = numericIdentifier(leftPart);
		const rightNumber = numericIdentifier(rightPart);

		if (leftNumber !== undefined && rightNumber !== undefined) {
			return leftNumber < rightNumber ? -1 : 1;
		}

		if (leftNumber !== undefined || rightNumber !== undefined) {
			return leftNumber !== undefined ? -1 : 1;
		}

		return leftPart < rightPart ? -1 : 1;
	}

	return 0;
}

function parseVersion(value: string): ParsedVersion {
	const match = value.match(SEMVER);

	if (match === null) {
		throw new AgentsPackError(
			"INVALID_PACK",
			`Pack version must use semantic versioning: ${value}`,
		);
	}

	return {
		major: Number(match[1]),
		minor: Number(match[2]),
		patch: Number(match[3]),
		prerelease: match[4]?.split(".") ?? [],
	};
}

function numericIdentifier(value: string): number | undefined {
	return /^(0|[1-9]\d*)$/.test(value) ? Number(value) : undefined;
}
