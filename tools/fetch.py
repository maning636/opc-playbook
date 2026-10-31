#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
opc-playbook 取用工具（零依赖，仅标准库）

用法:
  python fetch.py <组>/<技能>                  # 取单个技能，命中缓存不发请求；打印正文
  python fetch.py --index                      # 取 L0 索引（27 技能路由表，唯一该常驻的文件）
  python fetch.py --raw <仓库内相对路径>        # 取任意文件（含技能的 assets/ scripts/）
  python fetch.py --ls <仓库内目录>             # 列出目录内容
  python fetch.py --search "赛道 定位"          # 在 L0 中搜索，返回候选
  python fetch.py --cache-dir                  # 打印缓存目录
  python fetch.py --cache-clear                # 一键清理本地缓存
  python fetch.py --update                     # 强制重新拉取（忽略缓存）
  python fetch.py --offline <组>/<技能>          # 只用缓存，不联网

设计原则:
  * 绝不整包下载；一次只取需要的文件
  * 网络失败自动降级到本地缓存
  * 取不到就报错退出，绝不返回编造内容
"""
import argparse
import json
import os
import re
import shutil
import sys
import time
import urllib.request

RAW_BASE = "https://raw.githubusercontent.com/maning636/opc-playbook/main/"
ALT_BASE = "https://github.com/maning636/opc-playbook/raw/main/"
TREE_URL = "https://api.github.com/repos/maning636/opc-playbook/git/trees/main?recursive=1"
CACHE = os.path.join(os.path.expanduser("~"), ".cache", "opc-playbook")
L0_TTL = 3600

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass


def _get(url, timeout=25):
    req = urllib.request.Request(url, headers={
        "User-Agent": "opc-playbook-fetch/1.0 (+https://github.com/maning636/opc-playbook)",
        "Accept": "text/plain, */*",
    })
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def _get_retry(rel, tries=3):
    err = None
    for base in (RAW_BASE, ALT_BASE):
        url = base + rel
        for i in range(tries if base == RAW_BASE else 1):
            try:
                return _get(url)
            except Exception as e:
                err = e
                if i + 1 < tries:
                    time.sleep(0.6 * (i + 1))
    raise err


def cache_path(rel):
    return os.path.join(CACHE, "latest", *rel.replace("\\", "/").lstrip("/").split("/"))


def fetch(rel, offline=False, force=False, ttl=0):
    rel = rel.replace("\\", "/").lstrip("/")
    local = cache_path(rel)
    fresh = os.path.isfile(local) and (ttl <= 0 or (time.time() - os.path.getmtime(local)) < ttl)
    if fresh and not force:
        return open(local, encoding="utf-8", errors="replace").read(), True
    if offline:
        if os.path.isfile(local):
            return open(local, encoding="utf-8", errors="replace").read(), True
        raise FileNotFoundError("离线且无缓存: %s" % rel)
    url = RAW_BASE + rel
    try:
        data = _get_retry(rel)
    except Exception as e:
        if os.path.isfile(local):
            return open(local, encoding="utf-8", errors="replace").read(), True
        raise RuntimeError("拉取失败 %s (%s: %s)；本地缓存也没有: %s"
                           % (url, type(e).__name__, e, local))
    os.makedirs(os.path.dirname(local), exist_ok=True)
    with open(local, "wb") as f:
        f.write(data)
    with open(local + ".source", "w", encoding="utf-8") as f:
        f.write(url + "\n")
    return data.decode("utf-8", errors="replace"), False


CJK = re.compile(r"[\u4e00-\u9fff]")
ROW = re.compile(r"^\|\s*`([^`]+)`\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*(\d+)\s*\|")


def tokenize(q):
    toks, grams = [], []
    for part in re.split(r"[\s,，、;；/\\|+]+", q or ""):
        if not part:
            continue
        if CJK.search(part):
            toks.append(part.lower())
            for run in re.findall(r"[\u4e00-\u9fff]+", part):
                for i in range(len(run) - 1):
                    grams.append(run[i:i + 2])
        else:
            toks.extend(w.lower() for w in re.findall(r"[A-Za-z0-9_\-]+", part))
    return toks, grams


def score(text, toks, grams):
    t = text.lower()
    s = 0
    for tok in toks:
        if tok in t:
            s += 6 if len(tok) >= 3 else 3
    for g in grams:
        if g in t:
            s += 2
    return s


def do_raw(rel, offline=False, force=False, path_only=False):
    rel = (rel or "").replace("\\", "/").strip("/")
    if not rel:
        print("用法: fetch.py --raw <仓库内相对路径>", file=sys.stderr)
        return 2
    try:
        txt, cached = fetch(rel, offline=offline, force=force,
                            ttl=(L0_TTL if rel == "INDEX.md" else 0))
    except Exception as e:
        print("错误: %s" % e, file=sys.stderr)
        print("提示：该文件不可用。如需它，请告知用户缺少哪个文件，不要凭印象编造内容。", file=sys.stderr)
        return 1
    if path_only:
        print(cache_path(rel))
        return 0
    if cached:
        print("<!-- from cache: %s -->" % cache_path(rel), file=sys.stderr)
    sys.stdout.write(txt)
    return 0


def do_fetch(spec, offline=False, force=False, path_only=False):
    if "/" not in spec:
        print("用法: fetch.py <组>/<技能>，例 opc/opc-niche-positioning", file=sys.stderr)
        return 2
    group, skill = spec.split("/", 1)
    rel = "skills/%s/SKILL.md" % skill
    try:
        txt, cached = fetch(rel, offline=offline, force=force)
    except Exception as e:
        print("错误: %s" % e, file=sys.stderr)
        print("提示：该技能不可用。如需它，请告知用户缺少哪个技能，不要凭印象编造流程。", file=sys.stderr)
        return 1
    if path_only:
        print(cache_path(rel))
        return 0
    if cached:
        print("<!-- from cache: %s -->" % cache_path(rel), file=sys.stderr)
    sys.stdout.write(txt)
    return 0


def do_search(query, limit=10):
    toks, grams = tokenize(query)
    l0, _ = fetch("INDEX.md", ttl=L0_TTL)
    hits = []
    for line in l0.splitlines():
        m = ROW.match(line)
        if not m:
            continue
        sid, label, keys, nfiles = m.groups()
        ss = score(keys, toks, grams) * 2 + score(sid + " " + label, toks, grams)
        if sid.lower() in toks:
            ss += 12
        hits.append((ss, sid, label, keys, nfiles))
    hits.sort(reverse=True)
    hits = [h for h in hits if h[0] > 0]
    if not hits:
        print("没有匹配项。先读 L0: %sINDEX.md" % RAW_BASE)
        return 1
    print("# 候选技能（query=%r）\n" % query)
    for s, sid, label, keys, nfiles in hits[:limit]:
        print("  [%s]  %s" % (sid, label))
        print("      %s" % keys[:140])
        print("      %sskills/%s/SKILL.md" % (RAW_BASE, sid.split("/", 1)[1]))
    print("\n取用: python fetch.py <组>/<技能>")
    return 0


def _tree(offline=False, force=False):
    p = os.path.join(CACHE, "_tree.json")
    if os.path.isfile(p) and not force:
        try:
            return json.load(open(p, encoding="utf-8"))
        except Exception:
            pass
    if offline:
        raise FileNotFoundError("离线且无文件树缓存: %s" % p)
    req = urllib.request.Request(TREE_URL, headers={
        "User-Agent": "opc-playbook-fetch/1.0 (+https://github.com/maning636/opc-playbook)",
        "Accept": "application/vnd.github+json",
    })
    with urllib.request.urlopen(req, timeout=40) as r:
        raw = json.loads(r.read().decode("utf-8"))
    slim = {
        "truncated": bool(raw.get("truncated")),
        "tree": [{"path": it.get("path", ""), "type": it.get("type", ""),
                  "size": it.get("size", 0)} for it in raw.get("tree", [])],
    }
    os.makedirs(CACHE, exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(slim, f, separators=(",", ":"))
    return slim


def do_ls(dirpath, offline=False, force=False):
    d = (dirpath or "").replace("\\", "/").strip("/")
    try:
        data = _tree(offline=offline, force=force)
    except Exception as e:
        print("错误: %s" % e, file=sys.stderr)
        return 1
    pref = (d + "/") if d else ""
    files, dirs = [], set()
    for it in data.get("tree", []):
        p = it.get("path", "")
        if not p.startswith(pref):
            continue
        rel = p[len(pref):]
        if not rel:
            continue
        if "/" in rel:
            dirs.add(rel.split("/", 1)[0] + "/")
        elif it.get("type") == "tree":
            dirs.add(rel + "/")
        else:
            files.append((rel, it.get("size", 0)))
    if not files and not dirs:
        print("空目录或不存在: %s" % (d or "/"), file=sys.stderr)
        return 1
    print("# 目录内容: %s" % (d or "/"))
    for name in sorted(dirs):
        print("  %-46s %8s" % (name, "<dir>"))
    for rel, size in sorted(files):
        print("  %-46s %8s" % (rel, "%dB" % size))
    print("\n取用: python fetch.py --raw <路径>")
    return 0


def do_cache_clear(dry_run=False):
    if not os.path.isdir(CACHE):
        print("缓存目录不存在，无需清理: %s" % CACHE)
        return 0
    n = sum(len(f) for _, _, f in os.walk(CACHE))
    size = sum(os.path.getsize(os.path.join(r, f))
               for r, _, fs in os.walk(CACHE) for f in fs
               if os.path.exists(os.path.join(r, f)))
    if dry_run:
        print("将清理: %s（%d 个文件 / %.1f MB）" % (CACHE, n, size / 1048576))
        return 0
    shutil.rmtree(CACHE, ignore_errors=True)
    print("已清理缓存: %s（%d 个文件 / %.1f MB）" % (CACHE, n, size / 1048576))
    return 0


def main():
    ap = argparse.ArgumentParser(description="opc-playbook 按需取用")
    ap.add_argument("spec", nargs="?", help="组/技能")
    ap.add_argument("--fetch", dest="fetch_spec", help="组/技能")
    ap.add_argument("--search", help="搜索关键词")
    ap.add_argument("--index", "--l0", dest="index", action="store_true", help="取 L0 索引")
    ap.add_argument("--raw", metavar="PATH", help="取仓库内任意相对路径")
    ap.add_argument("--ls", metavar="DIR", help="列出仓库内某目录内容")
    ap.add_argument("--path", action="store_true", help="只打印本地路径")
    ap.add_argument("--cache-dir", action="store_true", help="打印缓存目录")
    ap.add_argument("--cache-clear", action="store_true", help="一键清理本地缓存")
    ap.add_argument("--cache-clear-dry-run", action="store_true", help="预览将要清理的缓存")
    ap.add_argument("--update", action="store_true", help="强制重新拉取")
    ap.add_argument("--offline", action="store_true", help="只用缓存，不联网")
    a = ap.parse_args()

    if a.cache_clear:
        return do_cache_clear()
    if a.cache_clear_dry_run:
        return do_cache_clear(dry_run=True)
    if a.cache_dir:
        print(CACHE)
        return 0
    if a.search:
        return do_search(a.search)
    if a.index:
        return do_raw("INDEX.md", offline=a.offline, force=a.update, path_only=a.path)
    if a.raw:
        return do_raw(a.raw, offline=a.offline, force=a.update, path_only=a.path)
    if a.ls is not None:
        return do_ls(a.ls, offline=a.offline, force=a.update)
    spec = a.fetch_spec or a.spec
    if spec:
        return do_fetch(spec, a.offline, a.update, a.path)
    ap.print_help()
    return 2


if __name__ == "__main__":
    sys.exit(main())
