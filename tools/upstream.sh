#!/usr/bin/env bash
# What changed upstream since our app version, in one short summary:
#   1. Flux159/ragnarokoffline.app releases newer than the installed app
#   2. config/VENDOR_PINS changes between the clone's tag and the latest release
#   3. syncs MondoTruth's forks (fast-forward only; a fork that is ahead is
#      reported and left alone)
#   4. open PRs in Flux159's app, rathena, roBrowserLegacy and RemoteClient-Rust
#   5. `prontera,` lines of registry mods new or changed since the clone's
#      tag, with any within 2 cells of one of our NPCs
# Needs gh (logged in) and the app clone with an `upstream` remote.
# See docs/agent/outside-repos.md.
set -u
. "$(dirname "$0")/common.sh"

APP=Flux159/ragnarokoffline.app
[ -d "$APP_CLONE/.git" ] || die "no app clone at $APP_CLONE (set SNPC_APP)"
ver=$(installed_version)
clone=$(clone_tag)
clone_ref=${clone%% *}

echo "== Versions"
echo "installed app: $ver   clone: $clone"
retry git -C "$APP_CLONE" fetch -q upstream "+refs/heads/main:refs/remotes/upstream/main" "refs/tags/v*:refs/tags/v*" || echo "(fetch from upstream failed)"
releases=$(retry gh release list -R "$APP" --limit 20 --exclude-drafts \
	--json tagName,publishedAt,isPrerelease \
	--jq '.[] | "\(.tagName)\t\(.publishedAt[:10])\(if .isPrerelease then "\tpre-release" else "" end)"')
latest=$(gh release view -R "$APP" --json tagName --jq .tagName 2>/dev/null || echo "")
newer=$(printf '%s\n' "$releases" | while IFS=$'\t' read -r t d p; do
	[ -n "$t" ] || continue
	top=$(printf '%s\n%s\n' "${t#v}" "$ver" | sort -V | tail -1)
	[ "${t#v}" != "$ver" ] && [ "$top" = "${t#v}" ] && echo "  $t  $d ${p:-}"
done)
echo "latest release: ${latest:-?}"
if [ -n "$newer" ]; then echo "newer than installed:"; echo "$newer"; else echo "no release newer than installed"; fi

echo
echo "== VENDOR_PINS ($clone_ref -> ${latest:-?}, then -> unreleased upstream/main)"
pins() {
	git -C "$APP_CLONE" diff "$1" "$2" -- config/VENDOR_PINS 2>/dev/null |
		grep -E '^[-+][A-Za-z]' | awk '{print "  " $1, substr($3, 1, 10)}'
}
if [ -n "$latest" ]; then
	p=$(pins "$clone_ref" "$latest"); echo "${p:-  no change}"
	p=$(pins "$latest" upstream/main); [ -n "$p" ] && { echo " on main, not released:"; echo "$p"; }
fi

echo
echo "== Fork sync"
# fork <upstream owner/repo> <our repo> <branch>
fork() {
	local up=$1 repo=$2 br=$3 r ahead behind sha
	r=$(retry gh api "repos/$up/compare/$br...MondoTruth:$repo:$br" \
		--jq '"\(.ahead_by) \(.behind_by)"' 2>/dev/null) || { echo "  $repo: compare failed"; return; }
	read -r ahead behind <<<"$r"
	if [ "$ahead" != 0 ]; then
		echo "  $repo/$br: AHEAD of $up by $ahead (behind $behind) -- not touched"
	elif [ "$behind" = 0 ]; then
		echo "  $repo/$br: even with $up"
	else
		sha=$(retry gh api "repos/$up/commits/$br" --jq .sha) &&
			retry gh api -X PATCH "repos/MondoTruth/$repo/git/refs/heads/$br" \
				-f sha="$sha" -F force=false >/dev/null &&
			echo "  $repo/$br: fast-forwarded $behind commit(s) to ${sha:0:10}" ||
			echo "  $repo/$br: fast-forward FAILED"
	fi
}
fork Flux159/ragnarokoffline.app ragnarokoffline.app main
fork Flux159/rathena rathena ragnarokoffline
fork Flux159/roBrowserLegacy roBrowserLegacy ragnarokoffline
fork Flux159/roBrowserLegacy-RemoteClient-Rust roBrowserLegacy-RemoteClient-Rust main
fork LilArt420/cashshopmod cashshopmod main
fork AlwaysGH/adventurers-chronicle adventurers-chronicle main
fork LilArt420/world-sync-extras world-sync-extras main
fork adsonpleal/ragassets ragassets main

echo
echo "== Open PRs"
for r in "$APP" Flux159/rathena Flux159/roBrowserLegacy Flux159/roBrowserLegacy-RemoteClient-Rust; do
	echo " $r:"
	out=$(retry gh pr list -R "$r" --state open --limit 50 --json number,author,title \
		--jq '.[] | "  #\(.number)\t\(.author.login)\t\(.title)"') || out="  (failed)"
	echo "${out:-  none}"
done

echo
echo "== Prontera lines of registry mods new/changed since $clone_ref"
ours=$(grep -rhE '^prontera,' "$SNPC_ROOT/npc" "$SNPC_ROOT/pre-renewal" 2>/dev/null |
	awk -F'\t' '{split($1, c, ","); print c[2], c[3], $3}')
mods=$(git -C "$APP_CLONE" diff --name-only "$clone_ref" upstream/main -- registry/mods/ 2>/dev/null |
	cut -d/ -f3 | sort -u | grep -vx standart-npc)
[ -n "$mods" ] || echo "  no registry mod changed"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
for m in $mods; do
	if ! git -C "$APP_CLONE" cat-file -e "upstream/main:registry/mods/$m/mod.json" 2>/dev/null; then
		echo "  $m: removed"; continue
	fi
	lines=$(git -C "$APP_CLONE" grep -hE '^prontera,' upstream/main -- "registry/mods/$m" 2>/dev/null)
	src=$(git -C "$APP_CLONE" show "upstream/main:registry/mods/$m/mod.json" |
		node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s).source||{};if(j.github)console.log(j.github+" "+(j.asset||"*.zip"))})')
	if [ -n "$src" ]; then
		read -r repo asset <<<"$src"
		mkdir -p "$tmp/$m"
		if retry gh release download -R "$repo" -p "$asset" -D "$tmp/$m" --clobber >/dev/null 2>&1; then
			for z in "$tmp/$m"/*.zip; do
				lines+=$'\n'$(unzip -Z1 "$z" | grep -iE '\.txt$' | while read -r f; do
					unzip -p "$z" "$f" | tr -d '\r' | grep -E '^prontera,'; done)
			done
		else
			echo "  $m: could not download $asset from $repo"
		fi
	fi
	lines=$(printf '%s\n' "$lines" | grep -E '^prontera,')
	if [ -z "$lines" ]; then echo "  $m: no prontera lines"; continue; fi
	echo "  $m:"
	printf '%s\n' "$lines" | awk -F'\t' -v ours="$ours" '
		BEGIN { n = split(ours, o, "\n"); for (i = 1; i <= n; i++) { split(o[i], f, " "); ox[i] = f[1]; oy[i] = f[2]; on[i] = substr(o[i], length(f[1]) + length(f[2]) + 3) } }
		{
			split($1, c, ","); hit = ""
			for (i = 1; i <= n; i++) { dx = c[2] - ox[i]; dy = c[3] - oy[i]
				if (dx < 0) dx = -dx; if (dy < 0) dy = -dy
				if (dx <= 2 && dy <= 2) hit = hit " [CLOSE to " on[i] " " ox[i] "," oy[i] "]" }
			print "    " c[2] "," c[3] "  " $2 " " $3 hit
		}'
done
