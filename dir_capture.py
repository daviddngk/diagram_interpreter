import os
import argparse
import json

# Default folders to ignore
EXCLUDE_DIRS = {'.git', '__pycache__', 'node_modules', '.venv', '.idea', '.vscode'}

def capture_tree(path, max_depth, exclude=EXCLUDE_DIRS):
    tree = {}

    for root, dirs, files in os.walk(path):
        # Calculate depth
        rel_path = os.path.relpath(root, path)
        depth = 0 if rel_path == '.' else rel_path.count(os.sep)
        if depth >= max_depth:
            dirs[:] = []
            continue

        # Filter excluded directories
        dirs[:] = [d for d in dirs if d not in exclude]

        subtree = tree
        for part in rel_path.split(os.sep):
            if part == '.':
                continue
            subtree = subtree.setdefault(part, {})

        subtree['__files__'] = files

    return tree

def format_tree_as_text(tree, indent=0):
    lines = []
    for key, subtree in tree.items():
        if key == '__files__':
            for f in subtree:
                lines.append('    ' * indent + f)
            continue
        lines.append('    ' * indent + f"{key}/")
        lines.extend(format_tree_as_text(subtree, indent + 1))
    return lines

def format_tree_as_markdown(tree, indent=0):
    lines = []
    prefix = ' ' * (indent * 2)
    for key, subtree in tree.items():
        if key == '__files__':
            for f in subtree:
                lines.append(f"{prefix}- {f}")
            continue
        lines.append(f"{prefix}- {key}/")
        lines.extend(format_tree_as_markdown(subtree, indent + 1))
    return lines

def main():
    parser = argparse.ArgumentParser(description='Capture directory tree for AI sharing')
    parser.add_argument('-p', '--path', default='.', help='Starting path (default: current dir)')
    parser.add_argument('-d', '--depth', type=int, default=3, help='Max depth (default: 3)')
    parser.add_argument('-f', '--format', choices=['text', 'markdown', 'json'], default='markdown', help='Output format')
    parser.add_argument('-o', '--output', help='Output file (optional)')
    args = parser.parse_args()

    tree = capture_tree(args.path, args.depth)

    if args.format == 'text':
        output = '\n'.join(format_tree_as_text(tree))
    elif args.format == 'markdown':
        output = '\n'.join(format_tree_as_markdown(tree))
    else:
        output = json.dumps(tree, indent=2)

    if args.output:
        with open(args.output, 'w') as f:
            f.write(output)
        print(f"Written to {args.output}")
    else:
        print(output)

if __name__ == '__main__':
    main()
