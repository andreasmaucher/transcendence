# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Makefile                                           :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: mrizhakov <mrizhakov@student.42.fr>        +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2025/10/27 22:17:43 by mrizhakov         #+#    #+#              #
#    Updated: 2025/11/09 15:56:08 by mrizhakov        ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

COMPOSE := docker compose
PROJECT := ft_transcendence

up: ## Default target: start containers in detached mode
	$(COMPOSE) up -d

down: ## Stop and remove containers
	$(COMPOSE) down

stop: ## Stop containers without removing
	$(COMPOSE) stop

build: ## Build all images (uses multistage Dockerfile)
	$(COMPOSE) build

rebuild: ## Rebuild images without cache
	$(COMPOSE) build --no-cache

restart: ## Restart running containers
	$(COMPOSE) restart

logs: ## Tail logs from all containers
	$(COMPOSE) logs -f

ps: ## Show running containers
	$(COMPOSE) ps

clean: ## Remove containers + volumes (database will be wiped)
	$(COMPOSE) down -v

prune: ## Remove all unused Docker data (global)
	docker system prune -f


reset: ## Convenience target for rebuilding and running everything fresh
	clean rebuild up


images: ## Check current images
	docker images | grep $(PROJECT) || true
