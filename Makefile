# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Makefile                                           :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: jalombar <jalombar@student.42.fr>          +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2025/10/27 22:17:43 by mrizhakov         #+#    #+#              #
#    Updated: 2025/10/28 12:26:53 by jalombar         ###   ########.fr        #
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

build: ## Build all images (forces npm install by cache-busting layer)
	CACHEBUST=$$(date +%s) $(COMPOSE) build --build-arg CACHEBUST=$$CACHEBUST

rebuild: ## Rebuild images without cache (also forces npm install)
	CACHEBUST=$$(date +%s) $(COMPOSE) build --no-cache --build-arg CACHEBUST=$$CACHEBUST

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
