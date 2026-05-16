#!/usr/bin/env python3
"""
Print a Unicode directory tree (dirs + files), excluding common folders,
and write it to a UTF-8 .txt file.

Examples:
  python3 write_project_tree.py
  python3 write_project_tree.py /path/to/project --depth 3 --output my-tree.txt
  python3 write_project_tree.py . --exclude-dirs node_modules dist android .expo .git
  python3 write_project_tree.py . --exclude-files "*.log" "*.map" --show-hidden
"""

from __future__ import annotations

import argparse
import fnmatch
import os
import sys
from pathlib import Path
from typing import Iterable, List


DEFAULT_EXCLUDE_DIRS = ["node_modules", "dist", "android", ".expo"]


def is_hidden(path: Path) -> bool:
    return path.name.startswith(".")


def is_excluded_file(file_path: Path, patterns: Iterable[str]) -> bool:
    for pattern in patterns:
        if fnmatch.fnmatch(file_path.name, pattern):
            return True
    return False


def get_children(
    directory: Path,
    exclude_dirs: List[str],
    exclude_files: List[str],
    show_hidden: bool,
) -> List[Path]:
    dirs: List[Path] = []
    files: List[Path] = []

    try:
        with os.scandir(directory) as entries:
            for entry in entries:
                name = entry.name
                path = Path(entry.path)

                if not show_hidden and is_hidden(path):
                    continue

                try:
                    if entry.is_dir(follow_symlinks=False):
                        if name not in exclude_dirs:
                            dirs.append(path)
                    elif entry.is_file(follow_symlinks=False):
                        if not is_excluded_file(path, exclude_files):
                            files.append(path)
                except PermissionError:
                    continue
    except PermissionError:
        return []
    except FileNotFoundError:
        return []

    dirs.sort(key=lambda p: p.name.lower())
    files.sort(key=lambda p: p.name.lower())
    return dirs + files


def write_tree(
    directory: Path,
    current_depth: int,
    max_depth: int,
    prefix: str,
    exclude_dirs: List[str],
    exclude_files: List[str],
    show_hidden: bool,
    lines: List[str],
) -> None:
    if current_depth >= max_depth:
        return

    children = get_children(directory, exclude_dirs, exclude_files, show_hidden)

    for i, child in enumerate(children):
        is_last = i == len(children) - 1
        connector = "└── " if is_last else "├── "
        lines.append(f"{prefix}{connector}{child.name}")

        if child.is_dir():
            next_prefix = f"{prefix}    " if is_last else f"{prefix}│   "
            write_tree(
                directory=child,
                current_depth=current_depth + 1,
                max_depth=max_depth,
                prefix=next_prefix,
                exclude_dirs=exclude_dirs,
                exclude_files=exclude_files,
                show_hidden=show_hidden,
                lines=lines,
            )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Write a Unicode directory tree to a UTF-8 text file."
    )
    parser.add_argument(
        "path",
        nargs="?",
        default=".",
        help="Root directory to scan (default: current directory).",
    )
    parser.add_argument(
        "--depth",
        type=int,
        default=sys.maxsize,
        help="Maximum recursion depth (default: unlimited).",
    )
    parser.add_argument(
        "--exclude-dirs",
        nargs="*",
        default=DEFAULT_EXCLUDE_DIRS,
        help="Directory names to exclude.",
    )
    parser.add_argument(
        "--exclude-files",
        nargs="*",
        default=[],
        help='File patterns to exclude, e.g. "*.log" "*.map".',
    )
    parser.add_argument(
        "--show-hidden",
        action="store_true",
        help="Include hidden files and directories.",
    )
    parser.add_argument(
        "--output",
        default="project-tree.txt",
        help="Output file path (default: project-tree.txt).",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    root = Path(args.path).expanduser().resolve()

    if not root.exists():
        print(f"Error: Path not found: {args.path}", file=sys.stderr)
        return 1

    if not root.is_dir():
        print(f"Error: Path must be a directory: {root}", file=sys.stderr)
        return 1

    exclude_dirs = [d for d in args.exclude_dirs if d]
    exclude_files = [p for p in args.exclude_files if p]

    lines: List[str] = [root.name]

    write_tree(
        directory=root,
        current_depth=0,
        max_depth=args.depth,
        prefix="",
        exclude_dirs=exclude_dirs,
        exclude_files=exclude_files,
        show_hidden=args.show_hidden,
        lines=lines,
    )

    output_path = Path(args.output)
    if not output_path.is_absolute():
        output_path = Path.cwd() / output_path
    output_path = output_path.resolve()

    output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"Saved project tree to: {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())