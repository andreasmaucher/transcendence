#!/bin/bash

#if working from the host use:
# docker run -it --rm -v "$(pwd)":/home/root./ backend-img

## if working from the container use this option for exposing the port:
docker run --rm -it \
  -p 5173:5173 \
  -v "$PWD:/app" \
  -v /app/node_modules \
  front_img