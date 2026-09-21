#!/bin/bash
set -e

echo "=== Monte Carpooling — Iniciando producción ==="

echo "Compilando frontend..."
BASE_PATH=/ PORT=3000 pnpm --filter @workspace/carpool run build

echo "Compilando backend..."
pnpm --filter @workspace/api-server run build

echo "Iniciando servidor en puerto $PORT..."
exec node artifacts/api-server/dist/index.cjs
