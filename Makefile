.DEFAULT_GOAL := help

ifeq ($(OS),Windows_NT)
NPM := npm.cmd
else
NPM := npm
endif

IMAGE ?= gym-tracking:local
CONTAINER ?= gym-tracking-app
HOST_PORT ?= 4000
ENV_FILE ?= .env.production
VITE_API_URL ?= /api/v1

.PHONY: help setup env install dev seed format format-check lint typecheck test test-coverage build check audit db-up db-down db-logs db-status docker-build docker-run docker-up docker-stop docker-logs docker-status

help:
	@echo Available commands:
	@echo   make setup          - Create .env, install dependencies, and start MongoDB
	@echo   make dev            - Run contracts, API, and web in development mode
	@echo   make seed           - Seed system exercises and demo data
	@echo   make check          - Run formatting, lint, types, tests, and build
	@echo   make db-up          - Start local MongoDB
	@echo   make db-down        - Stop local MongoDB
	@echo   make docker-build   - Build the production image
	@echo   make docker-run     - Run the production image in the foreground
	@echo   make docker-up      - Run the production image in the background
	@echo   make docker-stop    - Stop the background production container
	@echo.
	@echo Docker overrides:
	@echo   IMAGE=$(IMAGE)
	@echo   CONTAINER=$(CONTAINER)
	@echo   HOST_PORT=$(HOST_PORT)
	@echo   ENV_FILE=$(ENV_FILE)
	@echo   VITE_API_URL=$(VITE_API_URL)

setup: env install db-up
	@echo Setup complete. Run "make seed" once, then "make dev".

env:
	@node -e "const fs = require('node:fs'); if (fs.existsSync('.env')) { console.log('.env already exists'); } else { fs.copyFileSync('.env.example', '.env'); console.log('Created .env from .env.example'); }"

install:
	$(NPM) ci

dev:
	$(NPM) run dev

seed:
	$(NPM) run seed

format:
	$(NPM) run format

format-check:
	$(NPM) run format:check

lint:
	$(NPM) run lint

typecheck:
	$(NPM) run typecheck

test:
	$(NPM) test

test-coverage:
	$(NPM) run test:coverage

build:
	$(NPM) run build

check: format-check lint typecheck test build

audit:
	$(NPM) audit --audit-level=high

db-up:
	docker compose up -d mongodb

db-down:
	docker compose down

db-logs:
	docker compose logs --follow mongodb

db-status:
	docker compose ps

docker-build:
	docker build --build-arg VITE_API_URL=$(VITE_API_URL) --tag $(IMAGE) .

docker-run:
	docker run --rm --name $(CONTAINER) --publish $(HOST_PORT):4000 --env-file $(ENV_FILE) $(IMAGE)

docker-up:
	docker run --detach --name $(CONTAINER) --publish $(HOST_PORT):4000 --env-file $(ENV_FILE) $(IMAGE)

docker-stop:
	docker stop $(CONTAINER)

docker-logs:
	docker logs --follow $(CONTAINER)

docker-status:
	docker ps --filter name=$(CONTAINER)
