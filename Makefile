# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Makefile                                           :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: mrizhakov <mrizhakov@student.42.fr>        +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2025/10/27 22:17:43 by mrizhakov         #+#    #+#              #
#    Updated: 2025/10/27 22:19:27 by mrizhakov        ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

COMPOSE := docker compose

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

stop: ## Stop containers without removing
	$(COMPOSE) stop

build:
	$(COMPOSE) build

rebuild: ## Rebuild images without cache
	$(COMPOSE) build --no-cache

restart:
	$(COMPOSE) restart

logs:
	$(COMPOSE) logs -f

ps:
	$(COMPOSE) ps

clean: ## Down and remove volumes
	$(COMPOSE) down -v

prune: ## Prune unused images/containers/networks (be careful)
	docker system prune -f