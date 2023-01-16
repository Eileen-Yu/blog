#!/bin/bash

rm -rf public
hexo generate

scp -r ./public/* root@116.62.52.209:/usr/share/nginx/html/
