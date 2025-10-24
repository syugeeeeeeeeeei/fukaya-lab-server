# .envファイルを読み込む
include .env
export

# Composeファイルの変数を定義
COMPOSE_BASE := -f docker-compose.yml
COMPOSE_DEV := $(COMPOSE_BASE) -f docker-compose.dev.yml
COMPOSE_PROD := $(COMPOSE_BASE) -f docker-compose.prod.yml

.PHONY: help up-dev down-dev logs-dev ps-dev up-prod down-prod logs-prod ps-prod build-prod

help:
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Development Commands:"
	@echo "  up-dev        Start development containers"
	@echo "  down-dev      Stop development containers"
	@echo "  logs-dev      View logs for development containers"
	@echo "  ps-dev        List development containers"
	@echo ""
	@echo "Production Commands:"
	@echo "  up-prod       Start production containers"
	@echo "  down-prod     Stop production containers"
	@echo "  logs-prod     View logs for production containers"
	@echo "  ps-prod       List production containers"
	@echo "  build-prod    Build images for production"
	@echo ""

# --- Development Commands ---
up-dev:
	docker compose $(COMPOSE_DEV) up --build -d

down-dev:
	docker compose $(COMPOSE_DEV) down --remove-orphans

logs-dev:
	docker compose $(COMPOSE_DEV) logs -f

ps-dev:
	docker compose $(COMPOSE_DEV) ps

# --- Production Commands ---
up-prod:
	docker compose $(COMPOSE_PROD) up --build -d

down-prod:
	docker compose $(COMPOSE_PROD) down --remove-orphans

logs-prod:
	docker compose $(COMPOSE_PROD) logs -f

ps-prod:
	docker compose $(COMPOSE_PROD) ps

build-prod:
	docker compose $(COMPOSE_PROD) build