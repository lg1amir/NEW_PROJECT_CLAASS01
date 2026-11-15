

2"""
main.py - Application Entry Point
===================================
Keeps the entry point minimal: just boot and hand off to the CLI layer.
"""

import sys

# Guard: Python 3.10+ required (for 'list[...]' type hints in logic.py)
if sys.version_info < (3, 10):
    print("Error: Python 3.10 or higher is required.")
    print(f"Current version: {sys.version}")
    sys.exit(1)

from cli import run_main_menu


def main() -> None:
    """Bootstrap the application, catching unexpected top-level errors."""
    try:
        run_main_menu()
    except KeyboardInterrupt:
        # Ctrl-C at any input prompt – clean exit
        print("\n\nProgram interrupted by user. Goodbye!")
        sys.exit(0)
    except Exception as exc:  # noqa: BLE001
        print(f"\n[Unexpected Error] {type(exc).__name__}: {exc}")
        print("Please report this error message to support.")
        sys.exit(1)


if __name__ == "__main__":
    main()

