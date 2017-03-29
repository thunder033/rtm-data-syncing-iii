#!/usr/bin/env bash
echo 'begin deploy'
# if hidden files are added, add capture them with .??*
cd .tmp && tar -czvf ../dist.tar.gz * && cd ..
node scripts/deploy