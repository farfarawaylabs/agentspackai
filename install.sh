#!/bin/sh

set -eu

PROGRAM_NAME="agents-pack"
DEFAULT_REGISTRY_URL="https://farfarawaylabs.github.io/agentspackai/registry/v1/cli.json"
DEFAULT_DOWNLOAD_BASE_URL="https://github.com/farfarawaylabs/agentspackai/releases/download/cli-v"

fail() {
	printf 'Agents Pack installer: %s\n' "$*" >&2
	exit 1
}

require_command() {
	command -v "$1" >/dev/null 2>&1 ||
		fail "Required command not found: $1"
}

download() {
	url=$1
	destination=$2
	curl -fsSL --retry 3 --retry-delay 1 "$url" -o "$destination" ||
		fail "Could not download $url"
}

sha256_file() {
	file=$1

	if command -v shasum >/dev/null 2>&1; then
		shasum -a 256 "$file" | awk '{print $1}'
	elif command -v sha256sum >/dev/null 2>&1; then
		sha256sum "$file" | awk '{print $1}'
	else
		fail "Install shasum or sha256sum to verify the downloaded archive."
	fi
}

cleanup() {
	if [ -n "${temporary_directory:-}" ] && [ -d "$temporary_directory" ]; then
		rm -rf "$temporary_directory"
	fi

	if [ -n "${temporary_install:-}" ] && [ -e "$temporary_install" ]; then
		rm -f "$temporary_install"
	fi
}

trap cleanup 0 1 2 3 15

require_command curl
require_command awk
require_command chmod
require_command cp
require_command grep
require_command mktemp
require_command mkdir
require_command mv
require_command rm
require_command sed
require_command tar
require_command tr
require_command uname

registry_url=${AGENTS_PACK_REGISTRY_URL:-$DEFAULT_REGISTRY_URL}
download_base_url=${AGENTS_PACK_DOWNLOAD_BASE_URL:-$DEFAULT_DOWNLOAD_BASE_URL}
version=${AGENTS_PACK_VERSION:-}

if [ -z "$version" ]; then
	registry_document=$(curl -fsSL --retry 3 --retry-delay 1 "$registry_url") ||
		fail "Could not load the CLI registry at $registry_url"
	version=$(printf '%s\n' "$registry_document" |
		tr ',' '\n' |
		sed -n 's/.*"latest"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
fi

case "$version" in
*'
'*)
	fail "The CLI registry returned more than one latest version."
	;;
esac

printf '%s\n' "$version" |
	grep -Eq '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$' ||
	fail "Invalid CLI version: ${version:-empty}"

case "$(uname -s)" in
Darwin)
	platform="darwin"
	if command -v sw_vers >/dev/null 2>&1; then
		macos_major=$(sw_vers -productVersion | awk -F. '{print $1}')
		[ "$macos_major" -ge 13 ] ||
			fail "Agents Pack requires macOS 13 or newer."
	fi
	;;
Linux)
	platform="linux"
	if command -v ldd >/dev/null 2>&1 && ldd --version 2>&1 | grep -qi musl; then
		fail "This installer does not support musl Linux yet."
	fi
	;;
*)
	fail "Unsupported operating system: $(uname -s)"
	;;
esac

case "$(uname -m)" in
arm64 | aarch64)
	architecture="arm64"
	;;
x86_64 | amd64)
	architecture="x64"
	;;
*)
	fail "Unsupported architecture: $(uname -m)"
	;;
esac

asset="${PROGRAM_NAME}-${version}-${platform}-${architecture}.tar.gz"
checksums="${PROGRAM_NAME}-${version}-checksums.txt"
release_base="${download_base_url}${version}"
temporary_directory=$(mktemp -d "${TMPDIR:-/tmp}/agents-pack-install.XXXXXX")
archive_path="$temporary_directory/$asset"
checksums_path="$temporary_directory/$checksums"

printf 'Downloading Agents Pack CLI %s for %s-%s...\n' \
	"$version" "$platform" "$architecture"
download "$release_base/$asset" "$archive_path"
download "$release_base/$checksums" "$checksums_path"

expected_checksum=$(awk -v asset="$asset" '$2 == asset {print $1}' "$checksums_path")
case "$expected_checksum" in
*'
'*)
	fail "The release checksum file contains duplicate entries for $asset."
	;;
esac
printf '%s\n' "$expected_checksum" | grep -Eq '^[0-9a-fA-F]{64}$' ||
	fail "The release checksum file does not contain exactly one valid entry for $asset."
actual_checksum=$(sha256_file "$archive_path")

[ "$actual_checksum" = "$expected_checksum" ] ||
	fail "Checksum verification failed for $asset."

archive_listing=$(tar -tzf "$archive_path") ||
	fail "Could not inspect the downloaded archive."
[ "$archive_listing" = "$PROGRAM_NAME" ] ||
	fail "The downloaded archive has an unexpected file layout."

tar -xzf "$archive_path" -C "$temporary_directory" ||
	fail "Could not extract the downloaded archive."
extracted_binary="$temporary_directory/$PROGRAM_NAME"
[ -f "$extracted_binary" ] && [ ! -L "$extracted_binary" ] ||
	fail "The downloaded archive does not contain a regular $PROGRAM_NAME executable."
chmod 755 "$extracted_binary"
"$extracted_binary" --version >/dev/null ||
	fail "The downloaded Agents Pack executable did not start correctly."

if [ -n "${AGENTS_PACK_INSTALL_DIR:-}" ]; then
	install_directory=$AGENTS_PACK_INSTALL_DIR
else
	[ -n "${HOME:-}" ] || fail "HOME is not set; provide AGENTS_PACK_INSTALL_DIR."
	install_directory="$HOME/.local/bin"
fi

case "$install_directory" in
/*) ;;
*) fail "The installation directory must be an absolute path." ;;
esac

[ ! -L "$install_directory" ] ||
	fail "The installation directory may not be a symlink: $install_directory"
mkdir -p "$install_directory" ||
	fail "Could not create the installation directory: $install_directory"

install_path="$install_directory/$PROGRAM_NAME"
[ ! -L "$install_path" ] ||
	fail "Refusing to replace a symlink: $install_path"
[ ! -e "$install_path" ] || [ -f "$install_path" ] ||
	fail "Refusing to replace a non-file: $install_path"

temporary_install="$install_directory/.${PROGRAM_NAME}.install.$$"
cp "$extracted_binary" "$temporary_install" ||
	fail "Could not stage the executable in $install_directory"
chmod 755 "$temporary_install"
mv -f "$temporary_install" "$install_path" ||
	fail "Could not install the executable at $install_path"
temporary_install=""

printf 'Installed %s %s at %s\n' "$PROGRAM_NAME" "$version" "$install_path"

case ":${PATH:-}:" in
*":$install_directory:"*) ;;
*)
	printf '\nAdd Agents Pack to your PATH:\n'
	printf '  export PATH="%s:$PATH"\n' "$install_directory"
	;;
esac
