# Contributing to VerifyPH

Thanks for your interest in contributing! VerifyPH is an open-source project aimed at combating misinformation in the Philippines, and community contributions are welcome.

## Getting Started

1. Fork the repository and clone your fork.
2. Install dependencies with `npm install`.
3. Copy `.env.local.example` to `.env.local` and fill in your own API keys (see the [README](README.md) for setup details).
4. Run `npm run dev` to start the local development server.

## Workflow

1. Create a new branch for your change: `git checkout -b feature/short-description`.
2. Make your changes, keeping commits focused and descriptive.
3. Run `npm run lint` and `npm run build` before opening a pull request.
4. Open a pull request against `main` with a clear description of what changed and why.

## Guidelines

* Match existing code style and conventions (TypeScript, App Router, Tailwind CSS).
* Keep pull requests scoped to a single feature or fix.
* Update documentation when behavior or setup steps change.
* Do not commit secrets, API keys, or `.env.local` files.

## Reporting Issues

Please use GitHub Issues to report bugs or propose features. Include steps to reproduce, expected behavior, and actual behavior for bug reports.

## Code of Conduct

Be respectful and constructive. This project aims to foster a welcoming environment for contributors of all backgrounds and experience levels.
