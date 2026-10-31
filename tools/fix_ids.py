#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Normalise opc-playbook skill ids to `<group>/<name>` (consistent with
agent-skills' `<domain>/<skill>` convention) and record the owning library.

Run once after extraction; idempotent.
"""
import os
import re
import sys

ROOT = r"D:\opc-playbook"
SKILLS = os.path.join(ROOT, "skills")
FM = re.compile(r"^(---\s*\n)(.*?)(\n---\s*\n)", re.S)


def main():
    changed = 0
    for name in sorted(os.listdir(SKILLS)):
        p = os.path.join(SKILLS, name, "SKILL.md")
        if not os.path.isfile(p):
            continue
        with open(p, "r", encoding="utf-8", newline="") as fh:
            text = fh.read()
        m = FM.match(text)
        if not m:
            print("!! 无 frontmatter:", name)
            continue
        fm = m.group(2)
        dm = re.search(r"^domain:\s*(\S+)\s*$", fm, re.M)
        if not dm:
            print("!! 无 domain 字段:", name)
            continue
        group = dm.group(1)
        new_fm, n = re.subn(r"^id:\s*opc-playbook/(.+?)\s*$", r"id: %s/\1" % group, fm, flags=re.M)
        if "library:" not in new_fm:
            new_fm = new_fm.rstrip() + "\nlibrary: opc-playbook"
        if new_fm != fm:
            with open(p, "w", encoding="utf-8", newline="") as fh:
                fh.write(m.group(1) + new_fm + m.group(3) + text[m.end():])
            changed += 1
            print("%-26s -> id: %s/%s" % (name, group, name))
    print("共修正 %d 个" % changed)
    return 0


if __name__ == "__main__":
    sys.exit(main())
