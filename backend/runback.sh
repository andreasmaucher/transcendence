#!/bin/bash

#if working from the host use:
# docker run -it --rm -v "$(pwd)":/home/root./ backend-img

## if working from the container use this option for exposing the port:
docker run -it --rm -v "$(pwd)":/home/root -p 4000:4000 backend-img