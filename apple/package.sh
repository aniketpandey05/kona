#!/usr/bin/env bash
#
# Wraps the built Safari extension in the app Apple requires around it: an
# Xcode project with a target for iPhone and iPad and one for Mac.
#
# Everything before this step builds anywhere. This one does not: the packager
# ships inside Xcode, so it needs a Mac.
#
#   apple/package.sh             build, then generate the project or refresh it
#   apple/package.sh --replace   throw the generated project away and start over
#
# The app name and bundle identifier can be overridden with KONA_APP_NAME and
# KONA_BUNDLE_ID, which is what you want if you are shipping your own build.
#
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

app_name="${KONA_APP_NAME:-Kona}"
bundle_id="${KONA_BUNDLE_ID:-io.github.aniketpandey05.kona}"
extension_dir=".output/safari-mv3"
project_dir="apple/$app_name"

die() { printf 'error: %s\n' "$*" >&2; exit 1; }

[[ "$(uname -s)" == "Darwin" ]] || die "this step needs macOS, because the packager ships inside Xcode.
The extension itself builds anywhere: npm run build:safari"

command -v xcrun >/dev/null 2>&1 || die "xcrun is not here. Install Xcode, then: xcode-select --install"

# Apple renamed the tool safari-web-extension-packager; before that it was
# safari-web-extension-converter, which is what older Xcodes still carry.
tool=""
for candidate in safari-web-extension-packager safari-web-extension-converter; do
  if xcrun --find "$candidate" >/dev/null 2>&1; then
    tool="$candidate"
    break
  fi
done
[[ -n "$tool" ]] || die "this Xcode has neither safari-web-extension-packager nor
safari-web-extension-converter. Check with: xcrun --find safari-web-extension-packager"

npm run build:safari
[[ -f "$extension_dir/manifest.json" ]] ||
  die "$extension_dir/manifest.json is missing, so the build produced no extension to wrap."

if [[ "${1:-}" == "--replace" ]]; then
  rm -rf "$project_dir"
elif [[ -n "${1:-}" ]]; then
  die "unknown argument: $1 (the only one is --replace)"
fi

if [[ -d "$project_dir" ]]; then
  # The project is already there, carrying signing settings and a build number
  # that regenerating would wipe. Only the web half changed, so copy that in.
  resources="$project_dir/$app_name Extension/Resources"
  [[ -d "$resources" ]] ||
    die "$project_dir exists but $resources does not, so the fresh build has nowhere to go.
Either the project was laid out by hand or the packager's naming changed.
Point it at the Resources folder of the extension target, or start over: apple/package.sh --replace"
  rsync --archive --delete "$extension_dir/" "$resources/"
  printf '\nRefreshed %s\n' "$resources"
  printf 'Build and run the extension target in Xcode to pick it up.\n'
else
  xcrun "$tool" \
    --project-location apple \
    --app-name "$app_name" \
    --bundle-identifier "$bundle_id" \
    --swift \
    --copy-resources \
    --no-open \
    --no-prompt \
    "$extension_dir"
  printf '\nGenerated %s\n' "$project_dir"
  printf 'Next, in Xcode: set your team on both targets, then run the %s (iOS) scheme.\n' "$app_name"
  printf 'On the device: Settings > Apps > Safari > Extensions > %s, and allow it on the sites you want.\n' "$app_name"
  printf 'See apple/README.md for the rest, including what Safari asks for that Chrome does not.\n'
fi
